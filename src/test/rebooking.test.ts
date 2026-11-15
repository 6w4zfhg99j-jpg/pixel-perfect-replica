import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { StudioDB } from '@/lib/studio-db';

async function setup(type: string) {
  const SQL = await initSqlJs();
  const db = new StudioDB(new SQL.Database());
  const a = await db.student({ name: 'Anna', registered: '2026-11-01' });
  const b = await db.student({ name: 'Bianca', registered: '2026-11-01' });
  await db.addClass({ name: type, type, date: '2026-11-03', start: '15:00', end: '16:00', price: '15' });
  const cid = String(db.rows('SELECT id FROM classes')[0]?.['id']);
  return { SQL, db, a, b, cid };
}
const activeId = (db: StudioDB, cid: string) => String(db.bookings(cid)[0]?.['id']);

describe.each(['Yoga', 'Stretching'])('Rebooking after removal (%s)', type => {
  it('allows the same student in the same place after deleting the booking, repeatedly', async () => {
    const { db, a, cid } = await setup(type);
    await db.book(cid, a, 1, '15');
    await db.removeBooking(activeId(db, cid));
    await db.book(cid, a, 1, '15');
    await db.removeBooking(activeId(db, cid));
    await db.book(cid, a, 1, '15');
    expect(db.bookings(cid)).toHaveLength(1);
  });
  it('still blocks a duplicate active booking for the same student', async () => {
    const { db, a, cid } = await setup(type);
    await db.book(cid, a, 1, '15');
    await expect(db.book(cid, a, 1, '15')).rejects.toThrow(/UNIQUE/);
    await expect(db.book(cid, a, 2, '15')).rejects.toThrow(/UNIQUE/);
  });
  it('still blocks an occupied place and lets another student take a freed one', async () => {
    const { db, a, b, cid } = await setup(type);
    await db.book(cid, a, 1, '15');
    await expect(db.book(cid, b, 1, '15')).rejects.toThrow(/UNIQUE/);
    await db.removeBooking(activeId(db, cid));
    await db.book(cid, b, 1, '15');
    expect(db.bookings(cid).map(r => r['name'])).toEqual(['Bianca']);
  });
});

describe('Rebooking persistence and migration', () => {
  it('keeps correct bookings after reopening the saved database', async () => {
    const { SQL, db, a, cid } = await setup('Yoga');
    await db.book(cid, a, 1, '15');
    await db.removeBooking(activeId(db, cid));
    await db.book(cid, a, 1, '15');
    const reopened = new StudioDB(new SQL.Database(db.db.export()));
    expect(reopened.bookings(cid)).toHaveLength(1);
    expect(reopened.value("SELECT count(*) FROM bookings WHERE place<0")).toBe(1);
    await expect(reopened.book(cid, a, 2, '15')).rejects.toThrow(/UNIQUE/);
  });
  it('upgrades an existing database with an already-removed booking and keeps its history', async () => {
    const { SQL, db, a, cid } = await setup('Stretching');
    await db.book(cid, a, 1, '15');
    const bid = activeId(db, cid);
    await db.payment({ student_id: a, booking_id: bid, description: 'Lezione', amount: '15', date: '2026-11-03', method: 'Contanti' });
    await db.removeBooking(bid);
    // Recreate the pre-fix table shape with its old uniqueness rules.
    db.db.run('PRAGMA foreign_keys=OFF');
    db.db.run("CREATE TABLE old_b(id TEXT PRIMARY KEY,class_id TEXT NOT NULL REFERENCES classes(id),student_id TEXT NOT NULL REFERENCES students(id),place INTEGER NOT NULL,membership_id TEXT REFERENCES memberships(id),amount REAL NOT NULL DEFAULT 0,notes TEXT DEFAULT '',UNIQUE(class_id,student_id),UNIQUE(class_id,place))");
    db.db.run('INSERT INTO old_b SELECT * FROM bookings');
    db.db.run('DROP TABLE bookings');
    db.db.run('ALTER TABLE old_b RENAME TO bookings');
    db.db.run('DELETE FROM schema_versions WHERE version=5');
    const upgraded = new StudioDB(new SQL.Database(db.db.export()));
    await upgraded.book(cid, a, 1, '15');
    expect(upgraded.bookings(cid)).toHaveLength(1);
    expect(upgraded.value('SELECT count(*) FROM bookings')).toBe(2);
    expect(upgraded.finance('2026-11').income).toBe(15);
  });
});

describe('Available spots', () => {
  it('counts only active bookings out of 15, per class, and frees a spot on removal or move', async () => {
    const { db, a, b, cid } = await setup('Yoga');
    await db.addClass({ name: 'Stretching', type: 'Stretching', date: '2026-11-03', start: '15:00', end: '16:00' });
    const sid = String(db.rows("SELECT id FROM classes WHERE type='Stretching'")[0]?.['id']);
    expect(db.spots(cid)).toEqual({ capacity: 15, booked: 0, free: 15 });
    await db.book(cid, a, 1, '15');
    await db.book(cid, b, 2, '15');
    expect(db.spots(cid).free).toBe(13);
    expect(db.spots(sid).free).toBe(15);
    await db.removeBooking(activeId(db, cid));
    expect(db.spots(cid).free).toBe(14);
    const moving = activeId(db, cid);
    await db.run('UPDATE bookings SET class_id=?,place=? WHERE id=?', [sid, 1, moving]);
    expect(db.spots(cid).free).toBe(15);
    expect(db.spots(sid).free).toBe(14);
  });
  it('reports zero free when full', async () => {
    const { db, cid } = await setup('Yoga');
    for (let i = 1; i <= 15; i++) await db.book(cid, await db.student({ name: 'S' + i, registered: '2026-11-01' }), i, '15');
    expect(db.spots(cid)).toEqual({ capacity: 15, booked: 15, free: 0 });
  });
});
