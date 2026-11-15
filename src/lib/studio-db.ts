import type { Database, SqlJsStatic, SqlValue } from "sql.js";
export const CALENDAR_START = "2025-10-01";
export const FINANCE_START = "2026-10-01";
export const DEFAULT_CAPACITY = 15;
export type Row = Record<string, string | number | null>;
export const euro = (n: number) =>
  new Intl["NumberFormat"]("it-IT", { style: "currency", currency: "EUR" })["format"](n);
export const romeToday = () =>
  new Intl["DateTimeFormat"]("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })["format"](new Date());
const schema = `
CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT DEFAULT '',instagram TEXT DEFAULT '',email TEXT DEFAULT '',registered TEXT NOT NULL,notes TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'Active');
CREATE UNIQUE INDEX IF NOT EXISTS student_unique ON students(lower(trim(name)),phone);
CREATE TABLE IF NOT EXISTS recurring_schedules(id TEXT PRIMARY KEY,name TEXT,type TEXT,start_date TEXT,end_date TEXT,weekdays TEXT,start_time TEXT,end_time TEXT);
CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,date TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,location TEXT DEFAULT '',price REAL NOT NULL DEFAULT 15,capacity INTEGER NOT NULL DEFAULT 15,status TEXT NOT NULL DEFAULT 'Scheduled',notes TEXT DEFAULT '',schedule_id TEXT REFERENCES recurring_schedules(id),UNIQUE(date,start,type));
CREATE TABLE IF NOT EXISTS membership_types(id TEXT PRIMARY KEY,name TEXT NOT NULL,visits INTEGER NOT NULL,price REAL NOT NULL,validity INTEGER);
CREATE TABLE IF NOT EXISTS memberships(id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id),type_id TEXT NOT NULL REFERENCES membership_types(id),name TEXT NOT NULL,visits INTEGER NOT NULL,price REAL NOT NULL,purchased TEXT NOT NULL,expires TEXT,notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,class_id TEXT NOT NULL REFERENCES classes(id),student_id TEXT NOT NULL REFERENCES students(id),place INTEGER NOT NULL,membership_id TEXT REFERENCES memberships(id),amount REAL NOT NULL DEFAULT 0,notes TEXT DEFAULT '',UNIQUE(class_id,student_id),UNIQUE(class_id,place));
CREATE TABLE IF NOT EXISTS attendance(booking_id TEXT PRIMARY KEY REFERENCES bookings(id),status TEXT NOT NULL DEFAULT 'Booked');
CREATE TABLE IF NOT EXISTS visit_transactions(id TEXT PRIMARY KEY,membership_id TEXT NOT NULL REFERENCES memberships(id),booking_id TEXT REFERENCES bookings(id),delta INTEGER NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,student_id TEXT REFERENCES students(id),booking_id TEXT REFERENCES bookings(id),membership_id TEXT REFERENCES memberships(id),description TEXT NOT NULL,amount REAL NOT NULL CHECK(amount>0),date TEXT NOT NULL,method TEXT NOT NULL,category TEXT DEFAULT 'Other',notes TEXT DEFAULT '');
CREATE VIEW IF NOT EXISTS income_transactions AS SELECT * FROM payments;
CREATE TABLE IF NOT EXISTS expense_categories(name TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS expenses(id TEXT PRIMARY KEY,description TEXT NOT NULL,category TEXT NOT NULL,amount REAL NOT NULL CHECK(amount>0),date TEXT NOT NULL,method TEXT NOT NULL,notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
`;
export class StudioDB {
  constructor(
    public db: Database,
    private save: (bytes: Uint8Array) => Promise<void> = async () => {},
  ) {
    this["migrate"]();
  }
  private migrate() {
    this["db"]["run"]("PRAGMA foreign_keys=ON");
    this["db"]["run"](schema);
    if (!this["rows"]("SELECT * FROM schema_versions WHERE version=1")["length"]) {
      this["db"]["run"]("BEGIN");
      try {
        this["db"]["run"](
          "INSERT INTO membership_types VALUES ('m4','Lezione di prova',1,10,NULL),('m_singola','Lezione singola',1,15,NULL),('m8','Abbonamento 8 lezioni — Promo',8,80,NULL),('m_standard','Abbonamento Standard',8,100,NULL)",
        );
        for (const name of [
          "Affitto dello studio",
          "Attrezzatura",
          "Pubblicità",
          "Marketing",
          "Abbonamenti software",
          "Trasporti",
          "Altro",
        ])
          this["db"]["run"]("INSERT INTO expense_categories VALUES (?)", [name]);
        for (const [key, value] of Object["entries"]({
          studio_name: "VONA Studio Manager",
          capacity: "15",
          duration: "60",
          single10: "10",
          single15: "15",
          timezone: "Europe/Rome",
          currency: "EUR",
          methods: "Contanti,Revolut,Satispay,Altro",
          class_types: "Yoga,Stretching",
        }))
          this["db"]["run"]("INSERT INTO settings VALUES (?,?)", [key, value]);
        this["db"]["run"]("INSERT INTO schema_versions VALUES(1,?)", [new Date()["toISOString"]()]);
        this["db"]["run"]("COMMIT");
      } catch (e) {
        this["db"]["run"]("ROLLBACK");
        throw e;
      }
    }
    if (!this["rows"]("SELECT * FROM schema_versions WHERE version=2")["length"]) {
      this["db"]["run"]("BEGIN");
      try {
        this["db"]["run"]("UPDATE membership_types SET name='Abbonamento 4 lezioni' WHERE id='m4' AND name='4-class membership'");
        this["db"]["run"]("UPDATE membership_types SET name='Abbonamento 8 lezioni' WHERE id='m8' AND name='8-class membership'");
        const categoryRenames: [string, string][] = [
          ["Studio rent", "Affitto dello studio"],
          ["Equipment", "Attrezzatura"],
          ["Advertising", "Pubblicità"],
          ["Software subscriptions", "Abbonamenti software"],
          ["Transportation", "Trasporti"],
          ["Other", "Altro"],
        ];
        for (const [from, to] of categoryRenames) {
          this["db"]["run"]("INSERT OR IGNORE INTO expense_categories VALUES (?)", [to]);
          this["db"]["run"]("UPDATE expenses SET category=? WHERE category=?", [to, from]);
          this["db"]["run"]("DELETE FROM expense_categories WHERE name=?", [from]);
        }
        this["db"]["run"]("UPDATE payments SET category='Altro' WHERE category='Other'");
        this["db"]["run"]("UPDATE payments SET category='Lezione singola' WHERE category='Single visit'");
        this["db"]["run"]("UPDATE payments SET category='Abbonamento' WHERE category='Membership'");
        this["db"]["run"]("UPDATE payments SET method='Contanti' WHERE method='Cash'");
        this["db"]["run"]("UPDATE payments SET method='Altro' WHERE method='Other'");
        this["db"]["run"]("UPDATE settings SET value='Contanti,Revolut,Satispay,Altro' WHERE key='methods' AND value='Cash,Revolut,Satispay,Other'");
        this["db"]["run"]("INSERT INTO schema_versions VALUES(2,?)", [new Date()["toISOString"]()]);
        this["db"]["run"]("COMMIT");
      } catch (e) {
        this["db"]["run"]("ROLLBACK");
        throw e;
      }
    }
    if (!this["rows"]("SELECT * FROM schema_versions WHERE version=3")["length"]) {
      this["db"]["run"]("BEGIN");
      try {
        this["db"]["run"](
          "UPDATE membership_types SET name='Lezione di prova',visits=1,price=10 WHERE id='m4' AND name='Abbonamento 4 lezioni'",
        );
        this["db"]["run"](
          "UPDATE membership_types SET name='Abbonamento 8 lezioni — Promo',visits=8,price=80 WHERE id='m8' AND name='Abbonamento 8 lezioni'",
        );
        this["db"]["run"](
          "INSERT OR IGNORE INTO membership_types VALUES ('m_singola','Lezione singola',1,15,NULL),('m_standard','Abbonamento Standard',8,100,NULL)",
        );
        this["db"]["run"](
          "UPDATE visit_transactions SET reason='Presenza registrata' WHERE reason='Attendance marked Present'",
        );
        this["db"]["run"](
          "UPDATE visit_transactions SET reason='Presenza ripristinata' WHERE reason='Attendance reversed'",
        );
        this["db"]["run"](
          "UPDATE bookings SET notes=replace(notes,'[Booking removed]','[Prenotazione rimossa]') WHERE notes LIKE '%[Booking removed]%'",
        );
        this["db"]["run"]("INSERT INTO schema_versions VALUES(3,?)", [new Date()["toISOString"]()]);
        this["db"]["run"]("COMMIT");
      } catch (e) {
        this["db"]["run"]("ROLLBACK");
        throw e;
      }
    }
  }
  rows(sql: string, params: SqlValue[] = []): Row[] {
    const s = this["db"]["prepare"](sql);
    try {
      s["bind"](params);
      const a: Row[] = [];
      while (s["step"]()) a["push"](s["getAsObject"]() as Row);
      return a;
    } finally {
      s["free"]();
    }
  }
  value(sql: string, params: SqlValue[] = []): number {
    const row = this["rows"](sql, params)[0];
    return row ? Number(Object["values"](row)[0] ?? 0) : 0;
  }
  settings(): Record<
    | "studio_name"
    | "capacity"
    | "duration"
    | "single10"
    | "single15"
    | "timezone"
    | "currency"
    | "methods"
    | "class_types",
    string
  > {
    return Object["fromEntries"](
      this["rows"]("SELECT * FROM settings")["map"]((r) => [r["key"], String(r["value"])]),
    ) as Record<
      | "studio_name"
      | "capacity"
      | "duration"
      | "single10"
      | "single15"
      | "timezone"
      | "currency"
      | "methods"
      | "class_types",
      string
    >;
  }
  async transaction(fn: () => void) {
    const before = this["db"]["export"]();
    this["db"]["run"]("BEGIN");
    try {
      fn();
      this["db"]["run"]("COMMIT");
      await this["save"](this["db"]["export"]());
    } catch (e) {
      let rolledBack = false;
      try {
        this["db"]["run"]("ROLLBACK");
        rolledBack = true;
      } catch {
        /* already committed */
      }
      if (rolledBack) throw e;
      const SQL = await getSQL();
      this["db"]["close"]();
      this["db"] = new SQL["Database"](before);
      this["db"]["run"]("PRAGMA foreign_keys=ON");
      throw e;
    }
  }
  async run(sql: string, params: SqlValue[] = []) {
    await this["transaction"](() => this["db"]["run"](sql, params));
  }
  id() {
    return crypto["randomUUID"]();
  }
  balance(id: string) {
    return this["value"](
      "SELECT visits + COALESCE((SELECT sum(delta) FROM visit_transactions WHERE membership_id=m.id),0) FROM memberships m WHERE id=?",
      [id],
    );
  }
  activeMembership(student: string, date = romeToday()) {
    return this["rows"](
      "SELECT * FROM memberships WHERE student_id=? AND (expires IS NULL OR expires>=?) ORDER BY purchased DESC",
      [student, date],
    )["find"]((m) => this["balance"](String(m["id"])) > 0);
  }
  membershipStatus(m: Row, date = romeToday()) {
    const balance = this["balance"](String(m["id"]));
    if (balance <= 0) return "Completato";
    if (m["expires"] && String(m["expires"]) < date) return "Scaduto";
    return "Attivo";
  }
  paymentStatus(m: Row) {
    const paid = this["value"](
      "SELECT COALESCE(sum(amount),0) FROM payments WHERE membership_id=?",
      [String(m["id"])],
    );
    if (paid <= 0) return "Non pagato";
    if (paid < Number(m["price"])) return "Parzialmente pagato";
    return "Pagato";
  }
  transactions(membershipId: string) {
    const visits = this["value"]("SELECT visits FROM memberships WHERE id=?", [membershipId]);
    let running = visits;
    return this["rows"](
      `SELECT v.*,c.name class_name,c.date class_date,c.type class_type FROM visit_transactions v LEFT JOIN bookings b ON b.id=v.booking_id LEFT JOIN classes c ON c.id=b.class_id WHERE v.membership_id=? ORDER BY v.created,v.id`,
      [membershipId],
    )["map"]((t) => {
      running += Number(t["delta"]);
      return { ...t, balance_after: running };
    });
  }
  async student(data: Record<string, string>, id?: string) {
    const sid = id || this["id"]();
    await this["run"](
      `INSERT INTO students(id,name,phone,instagram,email,registered,notes,status) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,instagram=excluded.instagram,email=excluded.email,registered=excluded.registered,notes=excluded.notes,status=excluded.status`,
      [
        sid,
        (data["name"] ?? "")["trim"](),
        (data["phone"] ?? "") || "",
        (data["instagram"] ?? "") || "",
        (data["email"] ?? "") || "",
        (data["registered"] ?? "") || romeToday(),
        (data["notes"] ?? "") || "",
        (data["status"] ?? "") || "Active",
      ],
    );
    return sid;
  }
  async addClass(data: Record<string, string>, id?: string) {
    if ((data["date"] ?? "") < CALENDAR_START) throw new Error("Il calendario inizia a ottobre 2025.");
    if ((data["end"] ?? "") <= (data["start"] ?? ""))
      throw new Error("L'orario di fine deve essere successivo all'orario di inizio.");
    await this["run"](
      `INSERT INTO classes(id,name,type,date,start,end,location,price,capacity,notes) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,date=excluded.date,start=excluded.start,end=excluded.end,location=excluded.location,price=excluded.price,capacity=excluded.capacity,notes=excluded.notes`,
      [
        id || this["id"](),
        (data["name"] ?? "") || (data["type"] ?? ""),
        data["type"] ?? "",
        data["date"] ?? "",
        data["start"] ?? "",
        data["end"] ?? "",
        (data["location"] ?? "") || "",
        Number((data["price"] ?? "") || 15),
        Number((data["capacity"] ?? "") || 15),
        (data["notes"] ?? "") || "",
      ],
    );
  }
  async recur(data: Record<string, string>, weekdays: number[]) {
    if (!weekdays["length"]) throw new Error("Seleziona almeno un giorno della settimana.");
    if (
      (data["from"] ?? "") < CALENDAR_START ||
      (data["to"] ?? "") < (data["from"] ?? "") ||
      (data["end"] ?? "") <= (data["start"] ?? "")
    )
      throw new Error("Controlla l'intervallo di date e gli orari delle lezioni.");
    const dates = recurrenceDates(data["from"] ?? "", data["to"] ?? "", weekdays);
    let count = 0;
    await this["transaction"](() => {
      const sid = this["id"]();
      this["db"]["run"]("INSERT INTO recurring_schedules VALUES(?,?,?,?,?,?,?,?)", [
        sid,
        (data["name"] ?? "") || (data["type"] ?? ""),
        data["type"] ?? "",
        data["from"] ?? "",
        data["to"] ?? "",
        weekdays["join"](","),
        data["start"] ?? "",
        data["end"] ?? "",
      ]);
      for (const date of dates) {
        if (
          this["rows"]("SELECT id FROM classes WHERE date=? AND start=? AND type=?", [
            date,
            data["start"] ?? "",
            data["type"] ?? "",
          ])["length"]
        )
          continue;
        this["db"]["run"](
          "INSERT INTO classes(id,name,type,date,start,end,price,capacity,schedule_id,location,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          [
            this["id"](),
            (data["name"] ?? "") || (data["type"] ?? ""),
            data["type"] ?? "",
            date,
            data["start"] ?? "",
            data["end"] ?? "",
            Number((data["price"] ?? "") || 15),
            Number((data["capacity"] ?? "") || 15),
            sid,
            (data["location"] ?? "") || "",
            (data["notes"] ?? "") || "",
          ],
        );
        count++;
      }
    });
    return count;
  }
  async book(classId: string, studentId: string, place: number, payment: string) {
    const c = this["rows"]("SELECT * FROM classes WHERE id=?", [classId])[0];
    if (!c || c["status"] === "Cancelled") throw new Error("Questa lezione è annullata.");
    if (
      place < 1 ||
      place > Number(c["capacity"]) ||
      this["value"]("SELECT count(*) FROM bookings WHERE class_id=? AND place>0", [classId]) >=
        Number(c["capacity"])
    )
      throw new Error("Questa lezione è al completo.");
    const m =
      payment === "membership" ? this["activeMembership"](studentId, String(c["date"])) : undefined;
    if (payment === "membership" && !m)
      throw new Error("Nessun abbonamento attivo con lezioni disponibili.");
    const id = this["id"]();
    await this["transaction"](() => {
      this["db"]["run"](
        "INSERT INTO bookings(id,class_id,student_id,place,membership_id,amount) VALUES(?,?,?,?,?,?)",
        [id, classId, studentId, place, m ? String(m["id"]) : null, m ? 0 : Number(payment)],
      );
      this["db"]["run"]("INSERT INTO attendance VALUES(?,?)", [id, "Booked"]);
    });
  }
  async attendance(id: string, status: string) {
    await this["transaction"](() => {
      const b = this["rows"](
        "SELECT b.*,a.status,c.status class_status FROM bookings b JOIN attendance a ON a.booking_id=b.id JOIN classes c ON c.id=b.class_id WHERE b.id=?",
        [id],
      )[0];
      if (!b) throw new Error("Prenotazione non trovata.");
      if (status === "Present" && b["class_status"] === "Cancelled")
        throw new Error("Non è possibile registrare presenze per una lezione annullata.");
      if (b["status"] === status) return;
      if (b["membership_id"]) {
        const mid = String(b["membership_id"]);
        const used = this["value"](
          "SELECT COALESCE(sum(delta),0) FROM visit_transactions WHERE booking_id=?",
          [id],
        );
        if (status === "Present" && used === 0) {
          if (this["balance"](mid) <= 0) throw new Error("Questo abbonamento non ha più lezioni disponibili.");
          this["db"]["run"]("INSERT INTO visit_transactions VALUES(?,?,?,?,?,?)", [
            this["id"](),
            mid,
            id,
            -1,
            "Presenza registrata",
            new Date()["toISOString"](),
          ]);
        }
        if (status !== "Present" && used < 0)
          this["db"]["run"]("INSERT INTO visit_transactions VALUES(?,?,?,?,?,?)", [
            this["id"](),
            mid,
            id,
            1,
            "Presenza ripristinata",
            new Date()["toISOString"](),
          ]);
      }
      this["db"]["run"]("UPDATE attendance SET status=? WHERE booking_id=?", [status, id]);
    });
  }
  async cancelClass(id: string) {
    for (const b of this["rows"]("SELECT id FROM bookings WHERE class_id=?", [id]))
      await this["attendance"](String(b["id"]), "Cancelled");
    await this["run"]("UPDATE classes SET status='Cancelled' WHERE id=?", [id]);
  }
  async removeBooking(id: string) {
    await this.attendance(id, 'Cancelled');
    await this.run('UPDATE bookings SET place=-abs(place),notes=notes || ? WHERE id=?',[' [Prenotazione rimossa]',id]);
  }
  async purchase(data: Record<string, string>) {
    const m = this["rows"]("SELECT * FROM membership_types WHERE id=?", [data["type_id"] ?? ""])[0];
    if (!m) throw new Error("Scegli un abbonamento.");
    await this["transaction"](() => {
      const id = this["id"]();
      this["db"]["run"]("INSERT INTO memberships VALUES(?,?,?,?,?,?,?,?,?)", [
        id,
        data["student_id"] ?? "",
        data["type_id"] ?? "",
        String(m["name"]),
        Number(m["visits"]),
        Number(data["price"] ?? ""),
        data["purchased"] ?? "",
        (data["expires"] ?? "") || null,
        (data["notes"] ?? "") || "",
      ]);
      if (Number(data["paid"] ?? "") > 0)
        this["db"]["run"](
          "INSERT INTO payments(id,student_id,membership_id,description,amount,date,method,category) VALUES(?,?,?,?,?,?,?,?)",
          [
            this["id"](),
            data["student_id"] ?? "",
            id,
            String(m["name"]),
            Number(data["paid"] ?? ""),
            data["payment_date"] ?? "",
            data["method"] ?? "",
            "Membership",
          ],
        );
    });
  }
  async payment(data: Record<string, string>, id?: string) {
    const amount = Number(data["amount"] ?? "");
    if (!(amount > 0)) throw new Error("Inserisci un importo positivo.");
    if (data["booking_id"] ?? "") {
      const b = this["rows"]("SELECT * FROM bookings WHERE id=?", [data["booking_id"] ?? ""])[0];
      if (b?.["membership_id"])
        throw new Error("Registra questo pagamento sull'abbonamento, non sulla lezione.");
      const paid = this["value"](
        "SELECT COALESCE(sum(amount),0) FROM payments WHERE booking_id=? AND id<>?",
        [data["booking_id"] ?? "", id || ""],
      );
      if (!b || paid + amount > Number(b["amount"]))
        throw new Error("Il pagamento supera il saldo residuo della prenotazione.");
    }
    await this["run"](
      `INSERT INTO payments(id,student_id,booking_id,membership_id,description,amount,date,method,category,notes) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET description=excluded.description,amount=excluded.amount,date=excluded.date,method=excluded.method,category=excluded.category,notes=excluded.notes`,
      [
        id || this["id"](),
        (data["student_id"] ?? "") || null,
        (data["booking_id"] ?? "") || null,
        (data["membership_id"] ?? "") || null,
        data["description"] ?? "",
        amount,
        data["date"] ?? "",
        data["method"] ?? "",
        (data["category"] ?? "") || "Other",
        (data["notes"] ?? "") || "",
      ],
    );
  }
  async expense(data: Record<string, string>, id?: string) {
    await this["run"](
      "INSERT INTO expenses VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET description=excluded.description,category=excluded.category,amount=excluded.amount,date=excluded.date,method=excluded.method,notes=excluded.notes",
      [
        id || this["id"](),
        data["description"] ?? "",
        data["category"] ?? "",
        Number(data["amount"] ?? ""),
        data["date"] ?? "",
        data["method"] ?? "",
        (data["notes"] ?? "") || "",
      ],
    );
  }
  finance(month: string, type = "All") {
    if (`${month}-01` < FINANCE_START) throw new Error("I report finanziari partono da ottobre 2026.");
    const clause =
      type === "All"
        ? ""
        : " AND booking_id IN (SELECT b.id FROM bookings b JOIN classes c ON c.id=b.class_id WHERE c.type=?)";
    const args: SqlValue[] = type === "All" ? [month] : [month, type];
    const income = this["value"](
      "SELECT COALESCE(sum(amount),0) FROM payments WHERE substr(date,1,7)=?" + clause,
      args,
    );
    const expenses =
      type === "All"
        ? this["value"]("SELECT COALESCE(sum(amount),0) FROM expenses WHERE substr(date,1,7)=?", [
            month,
          ])
        : 0;
    return {
      income,
      expenses,
      profit: income - expenses,
      payments: this["value"](
        "SELECT count(*) FROM payments WHERE substr(date,1,7)=?" + clause,
        args,
      ),
    };
  }
  bookings(classId?: string) {
    return this["rows"](
      `SELECT b.*,s.name,a.status,c.name class_name,c.type,c.date,c.start,COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.booking_id=b.id),0) paid FROM bookings b JOIN students s ON s.id=b.student_id JOIN attendance a ON a.booking_id=b.id JOIN classes c ON c.id=b.class_id ${classId ? "WHERE b.class_id=? AND b.place>0" : ""} ORDER BY c.date,c.start,b.place`,
      classId ? [classId] : [],
    );
  }
}
export function recurrenceDates(from: string, to: string, weekdays: number[]) {
  const dates: string[] = [];
  const d = new Date(from + "T12:00:00Z");
  const end = new Date(to + "T12:00:00Z");
  for (; d <= end; d["setUTCDate"](d["getUTCDate"]() + 1))
    if (weekdays["includes"](d["getUTCDay"]())) dates["push"](d["toISOString"]()["slice"](0, 10));
  return dates;
}
let sqlPromise: Promise<SqlJsStatic> | undefined;
export function getSQL() {
  if (typeof window === 'undefined') throw new Error('SQLite must initialize after hydration.');
  sqlPromise ??= import("sql.js")["then"](async (mod) => {
    return mod["default"]({ locateFile: () => new URL('/wasm/sql-wasm.wasm', window.location.href).href });
  });
  return sqlPromise;
}
declare global {
  interface Window {
    vonaDesktop?: {
      read: () => Promise<number[] | null>;
      write: (bytes: number[]) => Promise<void>;
      backup: (bytes: number[]) => Promise<void>;
      restore: () => Promise<number[] | null>;
    };
  }
}
async function indexedStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB["open"]("vona-studio-local", 1);
    r["onupgradeneeded"] = () => r["result"]["createObjectStore"]("files");
    r["onsuccess"] = () => resolve(r["result"]);
    r["onerror"] = () => reject(r["error"]);
  });
}
export async function openStudio() {
  const SQL = await getSQL();
  let bytes: Uint8Array | undefined;
  if (window["vonaDesktop"]) {
    const a = await window["vonaDesktop"]["read"]();
    if (a) bytes = new Uint8Array(a);
  } else {
    const db = await indexedStore();
    bytes = await new Promise((resolve, reject) => {
      const r = db["transaction"]("files")["objectStore"]("files")["get"]("studio.sqlite");
      r["onsuccess"] = () => resolve(r["result"]);
      r["onerror"] = () => reject(r["error"]);
    });
    db["close"]();
  }
  const save = async (b: Uint8Array) => {
    if (window["vonaDesktop"]) return window["vonaDesktop"]["write"](Array["from"](b));
    const db = await indexedStore();
    await new Promise<void>((resolve, reject) => {
      const tx = db["transaction"]("files", "readwrite");
      tx["objectStore"]("files")["put"](b, "studio.sqlite");
      tx["oncomplete"] = () => resolve();
      tx["onerror"] = () => reject(tx["error"]);
    });
    db["close"]();
  };
  const studio = new StudioDB(new SQL["Database"](bytes), save);
  await save(studio["db"]["export"]());
  return studio;
}
export function download(
  bytes: BlobPart | Uint8Array,
  name: string,
  type = "application/octet-stream",
) {
  const url = URL["createObjectURL"](
    new Blob([bytes instanceof Uint8Array ? new Uint8Array(bytes).buffer : bytes], { type }),
  );
  const a = document["createElement"]("a");
  a["href"] = url;
  a["download"] = name;
  a["click"]();
  setTimeout(() => URL["revokeObjectURL"](url), 1000);
}
export async function restoreStudio(studio: StudioDB, bytes: Uint8Array) {
  const SQL = await getSQL();
  const candidate = new SQL["Database"](bytes);
  try {
    if (candidate["exec"]("PRAGMA integrity_check")[0]?.["values"][0]?.[0] !== "ok")
      throw new Error("Backup del database non valido.");
    if (!candidate["exec"]("SELECT version FROM schema_versions WHERE version=1")["length"])
      throw new Error("Questo non è un backup di VONA Studio.");
    for (const table of ["students", "classes", "memberships", "bookings", "payments", "expenses"])
      candidate["exec"](`SELECT * FROM ${table} LIMIT 1`);
  } catch (e) {
    candidate["close"]();
    throw e;
  }
  candidate["close"]();
  const old = studio["db"]["export"]();
  download(old, "VONA-before-restore-" + romeToday() + ".sqlite");
  await studio["transaction"](() => {
    studio["db"]["close"]();
    studio["db"] = new SQL["Database"](bytes);
    studio["db"]["run"]("PRAGMA foreign_keys=ON");
    studio["db"]["run"]("BEGIN");
  });
}
