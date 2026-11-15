import { beforeEach, describe, expect, it, vi } from 'vitest';
import initSqlJs from 'sql.js';
import { StudioDB, restoreStudio } from '@/lib/studio-db';

vi.mock('sql.js', async (original) => {
  const module = await original<typeof import('sql.js')>();
  return { ...module, default: () => module.default() };
});

let db: StudioDB;
beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new StudioDB(new SQL.Database());
  delete window.vonaDesktop;
});
describe('Safe local restore', () => {
  it('migrates a version-three backup before exposing activity types and preserves records', async () => {
    const SQL = await initSqlJs();
    const old = new StudioDB(new SQL.Database());
    await old.student({ name: 'Allieva di verifica', registered: '2026-11-01' });
    old.db.run("DROP TABLE activity_types; DELETE FROM schema_versions WHERE version=4; INSERT INTO settings VALUES('class_types','Yoga,Stretching');");
    await db.restoreBackup(old.db.export());
    expect(db.value('SELECT count(*) FROM students')).toBe(1);
    expect(db.activityTypes().map(t => t['name'])).toEqual(['Lezione individuale', 'Stretching', 'Yoga']);
    expect(db.value('SELECT max(version) FROM schema_versions')).toBe(5);
  });
  it('keeps the existing data if saving the restored backup fails', async () => {
    const SQL = await initSqlJs();
    const save = vi.fn().mockResolvedValue(undefined);
    const current = new StudioDB(new SQL.Database(), save);
    await current.student({ name: 'Dati da conservare', registered: '2026-11-01' });
    save.mockRejectedValue(new Error('Disco pieno'));
    await expect(current.restoreBackup(db.db.export())).rejects.toThrow('Disco pieno');
    expect(current.rows('SELECT name FROM students')[0]?.['name']).toBe('Dati da conservare');
  });
  it('does not restore when the desktop safety backup is cancelled', async () => {
    await db.student({ name: 'Dati da conservare', registered: '2026-11-01' });
    const SQL = await initSqlJs();
    const candidate = new StudioDB(new SQL.Database());
    window.vonaDesktop = { read: vi.fn(), write: vi.fn(), restore: vi.fn(), backup: vi.fn().mockResolvedValue(false) };
    await expect(restoreStudio(db, candidate.db.export())).rejects.toThrow('Ripristino annullato');
    expect(db.value('SELECT count(*) FROM students')).toBe(1);
  });
});