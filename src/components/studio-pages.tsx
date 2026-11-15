import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Plus,
  ArrowUpRight,
  Users,
  Ticket,
  Wallet,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Upload,
  Archive,
  Pencil,
  Trash2,
  Check,
  CircleDollarSign,
  Clock3,
  Leaf,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStudio } from "./studio-provider";
import omIcon from "@/assets/welcome-icon-om.png";
import {
  CALENDAR_START,
  FINANCE_START,
  euro,
  romeToday,
  download,
  restoreStudio,
  type Row,
} from "@/lib/studio-db";
import { toast } from "sonner";
const months = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
const statusLabels: Record<string, string> = {
  Booked: "Prenotata",
  Present: "Presente",
  Absent: "Assente",
  Cancelled: "Annullata",
};
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00")["toLocaleDateString"]("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}
function Empty({
  icon: Icon = CalendarDays,
  title,
  description,
  children,
}: {
  icon?: typeof CalendarDays;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} strokeWidth={1.4} />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed">{description}</p>}
      {children}
    </div>
  );
}
function Header({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="page-heading">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone?: string;
}) {
  return (
    <div className="metric">
      <div className="flex justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon
          size={17}
          strokeWidth={1.5}
          className={tone === "success" ? "text-success" : "text-primary"}
        />
      </div>
      <div className="metric-value">{value}</div>
      <p className="mt-2 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
type FormKind = "class" | "student" | "payment" | "expense" | "purchase" | "type";
export function RecordDialog({
  kind,
  open,
  onClose,
  record,
  booking,
}: {
  kind: FormKind;
  open: boolean;
  onClose: () => void;
  record?: Row | undefined;
  booking?: Row | undefined;
}) {
  const { db, refresh } = useStudio();
  const [busy, setBusy] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([2]);
  const [memberType, setMemberType] = useState("m8");
  if (!db) return null;
  const today = romeToday();
  const settings = db["settings"]();
  const students = db["rows"]("SELECT * FROM students WHERE status='Active' ORDER BY name");
  const types = db["rows"]("SELECT * FROM membership_types");
  const selected = types["find"]((t) => t["id"] === memberType) || types[0];
  const titles = {
    class: record ? "Modifica lezione" : "Aggiungi una lezione",
    student: record ? "Modifica allieva" : "Aggiungi un'allieva",
    payment: record ? "Modifica pagamento" : "Registra un pagamento",
    expense: record ? "Modifica spesa" : "Aggiungi una spesa",
    purchase: "Acquista un abbonamento",
    type: record ? "Modifica tipo di abbonamento" : "Nuovo tipo di abbonamento",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e["preventDefault"]();
    if (!db) return;
    setBusy(true);
    const data = Object["fromEntries"](new FormData(e["currentTarget"])) as Record<string, string>;
    try {
      if (kind === "class") {
        if (recurring) {
          const n = await db["recur"](data, days);
          toast["success"](`${n} lezioni create. Le lezioni esistenti sono state saltate.`);
        } else await db["addClass"](data, record ? String(record["id"]) : undefined);
      }
      if (kind === "student") await db["student"](data, record ? String(record["id"]) : undefined);
      if (kind === "payment")
        await db["payment"](
          {
            ...data,
            booking_id: booking ? String(booking["id"]) : String(record?.["booking_id"] || ""),
            membership_id: String(record?.["membership_id"] || ""),
            student_id: booking ? String(booking["student_id"]) : (data["student_id"] ?? ""),
          },
          record ? String(record["id"]) : undefined,
        );
      if (kind === "expense") await db["expense"](data, record ? String(record["id"]) : undefined);
      if (kind === "purchase") await db["purchase"](data);
      if (kind === "type")
        await db["run"](
          "INSERT INTO membership_types VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,visits=excluded.visits,price=excluded.price,validity=excluded.validity",
          [
            record ? String(record["id"]) : db["id"](),
            data["name"] ?? "",
            Number(data["visits"] ?? ""),
            Number(data["price"] ?? ""),
            (data["validity"] ?? "") ? Number(data["validity"] ?? "") : null,
          ],
        );
      refresh();
      onClose();
      toast["success"]("Salvato nel tuo studio.");
    } catch (e) {
      toast["error"](
        String(e)
          ["replace"]("Error: ", "")
          ["replace"](
            "UNIQUE constraint failed: students.name, students.phone",
            "Questa allieva ha già un profilo.",
          )
          ["replace"](
            "UNIQUE constraint failed: bookings.class_id, bookings.student_id",
            "Questa allieva è già prenotata a questa lezione.",
          ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-medium">{titles[kind]}</DialogTitle>
          <DialogDescription>
            VONA Studio · {kind === "class" ? "Europe/Rome" : "EUR"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          {kind === "class" && (
            <>
              {!record && (
                <div className="col-span-2 flex gap-2">
                  <Button
                    type="button"
                    variant={!recurring ? "secondary" : "ghost"}
                    onClick={() => setRecurring(false)}
                  >
                    Lezione singola
                  </Button>
                  <Button
                    type="button"
                    variant={recurring ? "secondary" : "ghost"}
                    onClick={() => setRecurring(true)}
                  >
                    Programma ricorrente
                  </Button>
                </div>
              )}
              <Field label="Nome della lezione">
                <input
                  name="name"
                  defaultValue={String(record?.["name"] || "")}
                  placeholder="es. Yoga dolce del mattino"
                />
              </Field>
              <Field label="Tipo di lezione">
                <select name="type" defaultValue={String(record?.["type"] || "Yoga")}>
                  {settings["class_types"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              {recurring ? (
                <>
                  <Field label="Dal">
                    <input
                      required
                      type="date"
                      name="from"
                      min={CALENDAR_START}
                      defaultValue={today["slice"](0, 7) + "-01"}
                    />
                  </Field>
                  <Field label="Al">
                    <input
                      required
                      type="date"
                      name="to"
                      min={CALENDAR_START}
                      defaultValue={new Date(
                        Number(today["slice"](0, 4)),
                        Number(today["slice"](5, 7)),
                        0,
                      )["toLocaleDateString"]("en-CA")}
                    />
                  </Field>
                  <div className="col-span-2">
                    <span className="field mb-2">Ripeti il</span>
                    <div className="flex flex-wrap gap-2">
                      {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]["map"]((d, i) => (
                        <label key={d} className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={days["includes"](i)}
                            onChange={(e) =>
                              setDays(
                                e["target"]["checked"]
                                  ? [...days, i]
                                  : days["filter"]((x) => x !== i),
                              )
                            }
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Field label="Data">
                  <input
                    required
                    type="date"
                    name="date"
                    min={CALENDAR_START}
                    defaultValue={String(record?.["date"] || today)}
                  />
                </Field>
              )}
              <Field label="Ora di inizio">
                <input
                  required
                  type="time"
                  name="start"
                  defaultValue={String(record?.["start"] || "15:00")}
                />
              </Field>
              <Field label="Ora di fine">
                <input
                  required
                  type="time"
                  name="end"
                  defaultValue={String(record?.["end"] || "16:00")}
                />
              </Field>
              <Field label="Luogo">
                <input name="location" defaultValue={String(record?.["location"] || "")} />
              </Field>
              <Field label="Prezzo lezione singola (€)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(record?.["price"] || settings["single15"])}
                />
              </Field>
              <Field label="Posti disponibili">
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={Number(record?.["capacity"] || settings["capacity"])}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Note">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
            </>
          )}
          {kind === "student" && (
            <>
              <div className="col-span-2">
                <Field label="Nome e cognome">
                  <input required name="name" defaultValue={String(record?.["name"] || "")} />
                </Field>
              </div>
              <Field label="Numero di telefono">
                <input name="phone" type="tel" defaultValue={String(record?.["phone"] || "")} />
              </Field>
              <Field label="Instagram">
                <input
                  name="instagram"
                  defaultValue={String(record?.["instagram"] || "")}
                  placeholder="@username"
                />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={String(record?.["email"] || "")} />
              </Field>
              <Field label="Data di registrazione">
                <input
                  name="registered"
                  type="date"
                  defaultValue={String(record?.["registered"] || today)}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Note personali">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
              <input type="hidden" name="status" value={String(record?.["status"] || "Active")} />
            </>
          )}
          {(kind === "payment" || kind === "expense") && (
            <>
              <div className="col-span-2">
                <Field label="Descrizione">
                  <input
                    required
                    name="description"
                    defaultValue={String(
                      record?.["description"] ||
                        (booking ? booking["class_name"] + " · " + booking["name"] : ""),
                    )}
                  />
                </Field>
              </div>
              <Field label="Importo (€)">
                <input
                  required
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    Number(
                      record?.["amount"] ||
                        (booking ? Number(booking["amount"]) - Number(booking["paid"]) : 0),
                    ) || ""
                  }
                />
              </Field>
              <Field label={kind === "payment" ? "Data di ricezione" : "Data della spesa"}>
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={String(record?.["date"] || today)}
                />
              </Field>
              <Field label="Metodo di pagamento">
                <select name="method" defaultValue={String(record?.["method"] || "Contanti")}>
                  {settings["methods"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Categoria">
                <select name="category" defaultValue={String(record?.["category"] || "Altro")}>
                  {(kind === "expense"
                    ? db["rows"]("SELECT name FROM expense_categories")["map"]((r) =>
                        String(r["name"]),
                      )
                    : ["Altro", "Lezione singola", "Abbonamento"])["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              {kind === "payment" && !booking && (
                <div className="col-span-2">
                  <Field label="Allieva (opzionale)">
                    <select name="student_id" defaultValue={String(record?.["student_id"] || "")}>
                      <option value="">Nessuna allieva</option>
                      {students["map"]((s) => (
                        <option key={String(s["id"])} value={String(s["id"])}>
                          {s["name"]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              <div className="col-span-2">
                <Field label="Note">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
            </>
          )}
          {kind === "purchase" && (
            <>
              <div className="col-span-2">
                <Field label="Allieva">
                  <select required name="student_id">
                    <option value="">Seleziona un'allieva</option>
                    {students["map"]((s) => (
                      <option key={String(s["id"])} value={String(s["id"])}>
                        {s["name"]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Abbonamento">
                <select
                  name="type_id"
                  value={memberType}
                  onChange={(e) => setMemberType(e["target"]["value"])}
                >
                  {types["map"]((t) => (
                    <option key={String(t["id"])} value={String(t["id"])}>
                      {t["name"]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prezzo totale (€)">
                <input
                  key={memberType + "price"}
                  required
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(selected?.["price"] || 0)}
                />
              </Field>
              <Field label="Data di acquisto">
                <input required name="purchased" type="date" defaultValue={today} />
              </Field>
              <Field label="Scadenza (opzionale)">
                <input
                  key={memberType + "expires"}
                  name="expires"
                  type="date"
                  defaultValue={
                    selected?.["validity"]
                      ? new Date(
                          new Date(today + "T12:00:00Z")["getTime"]() +
                            Number(selected["validity"]) * 86400000,
                        )
                          ["toISOString"]()
                          ["slice"](0, 10)
                      : ""
                  }
                />
              </Field>
              <Field label="Importo ricevuto (€)">
                <input
                  key={memberType + "paid"}
                  required
                  name="paid"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(selected?.["price"] || 0)}
                />
              </Field>
              <Field label="Data effettiva del pagamento">
                <input required name="payment_date" type="date" defaultValue={today} />
              </Field>
              <Field label="Metodo di pagamento">
                <select name="method">
                  {settings["methods"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Note">
                <input name="notes" />
              </Field>
            </>
          )}
          {kind === "type" && (
            <>
              <Field label="Nome">
                <input required name="name" defaultValue={String(record?.["name"] || "")} />
              </Field>
              <Field label="Lezioni incluse">
                <input
                  required
                  type="number"
                  min="1"
                  name="visits"
                  defaultValue={Number(record?.["visits"] || 4)}
                />
              </Field>
              <Field label="Prezzo (€)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  defaultValue={Number(record?.["price"] || 40)}
                />
              </Field>
              <Field label="Validità (giorni, opzionale)">
                <input
                  type="number"
                  min="1"
                  name="validity"
                  defaultValue={String(record?.["validity"] || "")}
                />
              </Field>
            </>
          )}
          <div className="col-span-2 mt-3 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button disabled={busy} type="submit">
              <Check size={15} />
              {busy
                ? "Salvataggio…"
                : kind === "class" && recurring
                  ? "Crea programma"
                  : "Salva " +
                    (kind === "purchase"
                      ? "abbonamento"
                      : kind === "type"
                        ? "tipo di abbonamento"
                        : kind === "class"
                          ? "lezione"
                          : kind === "student"
                            ? "allieva"
                            : kind === "payment"
                              ? "pagamento"
                              : "spesa")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function Dashboard() {
  const { db } = useStudio();
  const [dialog, setDialog] = useState<FormKind | null>(null);
  const today = romeToday();
  const month = today["slice"](0, 7);
  const fin =
    db && month >= "2026-10"
      ? db["finance"](month)
      : { income: 0, expenses: 0, profit: 0, payments: 0 };
  const classes =
    db?.["rows"]("SELECT * FROM classes WHERE date=? AND status<>'Cancelled' ORDER BY start", [
      today,
    ]) || [];
  const upcoming =
    db?.["rows"](
      "SELECT * FROM classes WHERE date>? AND status<>'Cancelled' ORDER BY date,start LIMIT 3",
      [today],
    ) || [];
  const active = db?.["value"]("SELECT count(*) FROM students WHERE status='Active'") || 0;
  const memberships = (db?.["rows"]("SELECT * FROM memberships") || [])["filter"](
    (m) =>
      db && db["balance"](String(m["id"])) > 0 && (!m["expires"] || String(m["expires"]) >= today),
  );
  const low = memberships["filter"]((m) => db && db["balance"](String(m["id"])) <= 2);
  const unpaid = (db?.["bookings"]() || [])["filter"](
    (b) => !b["membership_id"] && Number(b["paid"]) < Number(b["amount"]),
  );
  return (
    <>
      <Header
        eyebrow={dateLabel(today)}
        title="Il tuo studio, a colpo d'occhio"
        subtitle="Un po' di chiarezza per una giornata più consapevole."
      >
        <Button onClick={() => setDialog("class")}>
          <Plus />
          Aggiungi una lezione
        </Button>
      </Header>
      <div className="dashboard-banner mb-7 flex items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-primary">
            Spazio per crescere
          </span>
          <h2 className="mt-2 font-display text-[28px] leading-tight">Benvenuta nel tuo studio.</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {active
              ? "Ogni lezione, ogni allieva, ogni piccolo passo avanti."
              : "Un nuovo inizio. Il tuo prossimo capitolo inizia con la prima lezione."}
          </p>
          <Button
            variant="link"
            className="mt-2 h-auto px-0 text-xs"
            onClick={() => setDialog("class")}
          >
            Pianifica la prossima lezione <ArrowUpRight size={14} />
          </Button>
        </div>
        <img
          src={omIcon}
          alt=""
          width={95}
          height={95}
          className="hidden shrink-0 opacity-60 sm:block"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric
          label="Lezioni di oggi"
          value={classes["length"]}
          detail={`${db?.["value"]("SELECT count(*) FROM bookings b JOIN classes c ON c.id=b.class_id WHERE c.date=?", [today]) || 0} allieve prenotate`}
          icon={CalendarDays}
        />
        <Metric
          label="Allieve attive"
          value={active}
          detail="La tua community che cresce"
          icon={Users}
        />
        <Metric
          label="Abbonamenti attivi"
          value={memberships["length"]}
          detail={`${low["length"]} con 2 lezioni o meno`}
          icon={Ticket}
        />
        <Metric
          label="Incasso mensile"
          value={euro(fin["income"])}
          detail={`${months[Number(today["slice"](5, 7)) - 1]} ${today["slice"](0, 4)} · pagamenti ricevuti`}
          icon={Wallet}
          tone="success"
        />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">
              Lezioni di oggi{" "}
              <span className="ml-2 font-sans text-xs text-muted-foreground">
                {classes["length"]}
              </span>
            </h2>
            <Button variant="link" asChild className="h-auto px-0 text-xs">
              <Link to="/calendar">
                Vedi il calendario <ArrowUpRight />
              </Link>
            </Button>
          </div>
          {classes["length"] ? (
            <div className="mt-5">
              {classes["map"]((c) => (
                <ClassLine key={String(c["id"])} c={c} />
              ))}
            </div>
          ) : (
            <Empty title="Una giornata tranquilla in studio" description="Nessuna lezione in programma per oggi.">
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setDialog("class")}
              >
                <Plus />
                Programma una lezione
              </Button>
            </Empty>
          )}
          <div className="mt-1 border-t border-border pt-5">
            <div className="flex justify-between">
              <h3 className="text-xs font-semibold">Prossimamente</h3>
              <span className="text-[10px] text-muted-foreground">Lezioni in arrivo</span>
            </div>
            {upcoming["length"] ? (
              upcoming["map"]((c) => <ClassLine key={String(c["id"])} c={c} />)
            ) : (
              <div className="flex items-center gap-3 py-6 text-xs text-muted-foreground">
                <Clock3 size={17} />
                <span>Ancora nessuna lezione in arrivo.</span>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <h2 className="section-heading">Azioni rapide</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(
              [
                { kind: "student", icon: Users, title: "Aggiungi allieva", desc: "Fai crescere la community" },
                {
                  kind: "purchase",
                  icon: Ticket,
                  title: "Vendi abbonamento",
                  desc: "Un nuovo impegno",
                },
                {
                  kind: "payment",
                  icon: ArrowDownLeft,
                  title: "Registra pagamento",
                  desc: "Mantieni tutto in equilibrio",
                },
                { kind: "expense", icon: Wallet, title: "Aggiungi spesa", desc: "Tieni traccia dei costi" },
              ] as const
            )["map"]((a) => (
              <Button
                key={a["kind"]}
                variant="outline"
                onClick={() => setDialog(a["kind"])}
                className="h-[94px] items-start flex-col justify-center gap-2 whitespace-normal bg-card px-4"
              >
                <a.icon size={17} strokeWidth={1.5} className="text-primary" />
                <span className="text-xs">{a["title"]}</span>
                <span className="text-[9px] font-normal text-muted-foreground">{a["desc"]}</span>
              </Button>
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold">Richiede un po' di attenzione</h3>
              <span className="tag warning">{unpaid["length"] + low["length"]}</span>
            </div>
            {unpaid["length"] + low["length"] === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Check size={15} className="text-success" />
                Sei in pari. Un bel traguardo.
              </p>
            ) : (
              <>
                <Link to="/finance" className="mt-4 block text-xs text-warning">
                  {unpaid["length"]} prenotazioni non pagate →
                </Link>
                <Link to="/memberships" className="mt-3 block text-xs text-primary">
                  {low["length"]} abbonamenti quasi esauriti →
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
      <section className="panel mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-heading">Uno studio in equilibrio</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Le tue finanze di {months[Number(today["slice"](5, 7)) - 1]} {today["slice"](0, 4)}
            </p>
          </div>
          <Button variant="link" asChild className="h-auto px-0 text-xs">
            <Link to="/finance">
              Esplora le finanze <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-5 text-[10px] text-muted-foreground">
              <span>
                <span className="tag">Entrate</span>
              </span>
              <span>
                <span className="tag stretch">Uscite</span>
              </span>
            </div>
            <YearChart year={Number(today["slice"](0, 4))} />
          </div>
          <div className="grid grid-cols-3 gap-3 lg:content-center">
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Entrate</p>
              <p className="mt-2 font-display text-2xl">{euro(fin["income"])}</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Uscite</p>
              <p className="mt-2 font-display text-2xl">{euro(fin["expenses"])}</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Utile netto</p>
              <p className="mt-2 font-display text-2xl text-success">{euro(fin["profit"])}</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="mt-9 flex justify-between border-t border-border pt-5 text-[9px] text-muted-foreground">
        <span>Fatto per uno studio consapevole.</span>
        <span>VONA Studio Manager · Europe/Rome</span>
      </footer>
      {dialog && <RecordDialog kind={dialog} open onClose={() => setDialog(null)} />}
    </>
  );
}
function ClassLine({ c }: { c: Row }) {
  return (
    <Link
      to="/classes/$id"
      params={{ id: String(c["id"]) }}
      className="flex items-center gap-4 border-b border-border py-4"
    >
      <div className="w-16 shrink-0">
        <p className="text-sm font-semibold">{c["start"]}</p>
        <p className="mt-1 text-[9px] text-muted-foreground">{String(c["date"])["slice"](5)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{c["name"]}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {c["location"] || "VONA Studio"} · {c["start"]}–{c["end"]}
        </p>
      </div>
      <span className={"tag " + (c["type"] === "Stretching" ? "stretch" : "")}>{c["type"]}</span>
      <ChevronRight size={14} className="text-muted-foreground" />
    </Link>
  );
}
function YearChart({ year }: { year: number }) {
  const { db } = useStudio();
  const data = months["map"]((_, i) => {
    const m = `${year}-${String(i + 1)["padStart"](2, "0")}`;
    return db && m >= "2026-10" ? db["finance"](m) : { income: 0, expenses: 0 };
  });
  const max = Math["max"](1, ...data["flatMap"]((d) => [d["income"], d["expenses"]]));
  return (
    <>
      <div className="mini-chart">
        {data["map"]((d, i) => (
          <div className="chart-bars" key={i}>
            <div
              className="chart-bar"
              style={{ height: `${(d["income"] / max) * 100}%` }}
              title={`Entrate di ${months[i]}: ${euro(d["income"])}`}
            />
            <div
              className="chart-bar expense"
              style={{ height: `${(d["expenses"] / max) * 100}%` }}
              title={`Uscite di ${months[i]}: ${euro(d["expenses"])}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-12 gap-2 text-center text-[9px] text-muted-foreground">
        {months["map"]((m) => (
          <span key={m}>{m["slice"](0, 3)}</span>
        ))}
      </div>
    </>
  );
}
export function CalendarPage() {
  const { db } = useStudio();
  const [month, setMonth] = useState(romeToday()["slice"](0, 7));
  const [view, setView] = useState("Mese");
  const [type, setType] = useState("Tutte");
  const [dialog, setDialog] = useState(false);
  const [focus, setFocus] = useState(romeToday());
  const classes =
    (db?.["rows"]("SELECT * FROM classes WHERE substr(date,1,7)=? ORDER BY date,start", [month]) ||
      [])["filter"]((c) => type === "Tutte" || c["type"] === type) || [];
  const year = Number(month["slice"](0, 4)),
    mi = Number(month["slice"](5, 7)) - 1;
  const first = new Date(year, mi, 1);
  const offset = (first["getDay"]() + 6) % 7;
  const cells = Array["from"]({ length: 42 }, (_, i) => {
    const d = new Date(year, mi, i - offset + 1, 12);
    return {
      date: `${d["getFullYear"]()}-${String(d["getMonth"]() + 1)["padStart"](2, "0")}-${String(d["getDate"]())["padStart"](2, "0")}`,
      day: d["getDate"](),
      outside: d["getMonth"]() !== mi,
    };
  });
  const shift = (n: number) => {
    const d = new Date(year, mi + n, 1);
    const m = `${d["getFullYear"]()}-${String(d["getMonth"]() + 1)["padStart"](2, "0")}`;
    if (m >= "2025-10") setMonth(m);
  };
  const weekStart = new Date(focus + "T12:00:00");
  weekStart["setDate"](weekStart["getDate"]() - ((weekStart["getDay"]() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd["setDate"](weekEnd["getDate"]() + 6);
  const shown = classes["filter"]((c) =>
    view === "Giorno"
      ? c["date"] === focus
      : view === "Settimana"
        ? new Date(String(c["date"]) + "T12:00:00") >= weekStart &&
          new Date(String(c["date"]) + "T12:00:00") <= weekEnd
        : true,
  );
  return (
    <>
      <Header
        eyebrow="Fai spazio al movimento"
        title="Calendario"
        subtitle="Le tue lezioni, pianificate con cura."
      >
        <Button onClick={() => setDialog(true)}>
          <Plus />
          Aggiungi una lezione
        </Button>
      </Header>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            title="Mese precedente"
            disabled={month === "2025-10"}
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="section-heading min-w-40 text-center">
            {months[mi]} {year}
          </h2>
          <Button size="icon" variant="outline" title="Mese successivo" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonth(romeToday()["slice"](0, 7));
              setFocus(romeToday());
            }}
          >
            Oggi
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            aria-label="Scegli il mese"
            type="month"
            min="2025-10"
            className="studio-input max-w-40"
            value={month}
            onChange={(e) => e["target"]["value"] >= "2025-10" && setMonth(e["target"]["value"])}
          />
          <select
            aria-label="Filtro per tipo di lezione"
            className="studio-input max-w-32"
            value={type}
            onChange={(e) => setType(e["target"]["value"])}
          >
            <option>Tutte</option>
            <option>Yoga</option>
            <option>Stretching</option>
          </select>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {["Mese", "Settimana", "Giorno", "Elenco"]["map"]((v) => (
            <Button
              key={v}
              variant={v === view ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex gap-3">
          <span className="tag">
            <Leaf size={11} />
            Yoga
          </span>
          <span className="tag stretch">
            <Sparkles size={11} />
            Stretching
          </span>
        </div>
      </div>
      {view === "Mese" ? (
        <>
          <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground mb-3">
            {["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"]["map"]((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells["map"]((c) => (
              <div
                key={c["date"]}
                className={
                  "calendar-cell " +
                  (c["outside"] ? "outside " : "") +
                  (c["date"] === romeToday() ? "today" : "")
                }
              >
                <span className="text-[11px]">{c["day"]}</span>
                {classes["filter"]((x) => x["date"] === c["date"])["map"]((x) => (
                  <Link
                    key={String(x["id"])}
                    to="/classes/$id"
                    params={{ id: String(x["id"]) }}
                    className={"class-chip " + (x["type"] === "Stretching" ? "stretch" : "")}
                  >
                    <span>{x["start"]}</span> · {x["name"]}
                    {x["status"] === "Cancelled" ? " (annullata)" : ""}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 max-w-xs">
            <Field label={view === "Settimana" ? "Settimana del" : "Data"}>
              <input
                type="date"
                min={CALENDAR_START}
                value={focus}
                onChange={(e) => {
                  setFocus(e["target"]["value"]);
                  setMonth(e["target"]["value"]["slice"](0, 7));
                }}
              />
            </Field>
          </div>
          {shown["length"] ? (
            shown["map"]((c) => <ClassLine key={String(c["id"])} c={c} />)
          ) : (
            <Empty
              title="Nessuna lezione in questa vista"
              description="Un calendario libero, pronto per la tua prossima lezione."
            >
              <Button variant="outline" onClick={() => setDialog(true)}>
                <Plus />
                Aggiungi una lezione
              </Button>
            </Empty>
          )}
        </>
      )}
      <p className="mt-5 text-[10px] text-muted-foreground">
        {classes["length"]} lezioni questo mese · Europe/Rome
      </p>
      {dialog && <RecordDialog kind="class" open onClose={() => setDialog(false)} />}
    </>
  );
}
export function StudentsPage() {
  const { db, refresh } = useStudio();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Active");
  const [dialog, setDialog] = useState(false);
  const [edit, setEdit] = useState<Row | undefined>();
  const [profile, setProfile] = useState<Row | null>(null);
  const rows =
    (db?.["rows"]("SELECT * FROM students WHERE status=? ORDER BY name", [status]) || [])["filter"](
      (s) =>
        (String(s["name"]) + " " + s["phone"] + " " + s["instagram"])
          ["toLowerCase"]()
          ["includes"](search["toLowerCase"]()),
    ) || [];
  return (
    <>
      <Header
        eyebrow="La tua community"
        title="Allieve"
        subtitle="Ogni allieva ha una storia. Tieni tutto in un unico posto."
      >
        <Button
          onClick={() => {
            setEdit(undefined);
            setDialog(true);
          }}
        >
          <Plus />
          Aggiungi allieva
        </Button>
      </Header>
      <div className="mb-6 flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={15} />
          <input
            className="studio-input pl-10"
            aria-label="Cerca allieve"
            placeholder="Cerca nome, telefono o Instagram…"
            value={search}
            onChange={(e) => setSearch(e["target"]["value"])}
          />
        </div>
        <select
          className="studio-input max-w-32"
          aria-label="Stato allieva"
          value={status}
          onChange={(e) => setStatus(e["target"]["value"])}
        >
          <option value="Active">Attive</option>
          <option value="Archived">Archiviate</option>
        </select>
      </div>
      {rows["length"] ? (
        <div className="overflow-x-auto">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Allieva</th>
                <th>Contatti</th>
                <th>Abbonamento</th>
                <th>Registrata</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows["map"]((s) => {
                const m = db?.["activeMembership"](String(s["id"]));
                return (
                  <tr key={String(s["id"])}>
                    <td>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-foreground"
                        onClick={() => setProfile(s)}
                      >
                        {s["name"]}
                      </Button>
                      <p className="mt-1 text-[10px] text-muted-foreground">{s["instagram"]}</p>
                    </td>
                    <td>
                      {s["phone"] || "—"}
                      <p className="mt-1 text-[10px] text-muted-foreground">{s["email"]}</p>
                    </td>
                    <td>
                      {m ? (
                        <span className="tag success">
                          {db?.["balance"](String(m["id"]))} lezioni rimanenti
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nessun abbonamento attivo</span>
                      )}
                    </td>
                    <td>{dateLabel(String(s["registered"]))}</td>
                    <td>
                      <Button
                        title="Modifica allieva"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEdit(s);
                          setDialog(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        title={status === "Active" ? "Archivia allieva" : "Ripristina allieva"}
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            !db ||
                            !confirm(
                              `${status === "Active" ? "Archiviare" : "Ripristinare"} ${s["name"]}? Tutta la cronologia sarà preservata.`,
                            )
                          )
                            return;
                          await db["run"]("UPDATE students SET status=? WHERE id=?", [
                            status === "Active" ? "Archived" : "Active",
                            String(s["id"]),
                          ]);
                          refresh();
                        }}
                      >
                        <Archive />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={Users}
          title={search ? "Nessuna allieva corrispondente" : "La tua community inizia qui"}
          description="Ancora nessuna allieva registrata."
        >
          <Button variant="outline" onClick={() => setDialog(true)}>
            <Plus />
            Aggiungi la tua prima allieva
          </Button>
        </Empty>
      )}
      {dialog && (
        <RecordDialog kind="student" record={edit} open onClose={() => setDialog(false)} />
      )}
      <Dialog open={!!profile} onOpenChange={(v) => !v && setProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">{profile?.["name"]}</DialogTitle>
            <DialogDescription>
              {profile?.["phone"]} {profile?.["instagram"]} · Registrata il {profile?.["registered"]}
            </DialogDescription>
          </DialogHeader>
          {profile && db && (
            <>
              <p className="text-xs text-muted-foreground">
                {profile["email"]} {profile["notes"]}
              </p>
              <h3 className="section-heading mt-3">Cronologia abbonamenti</h3>
              {db["rows"]("SELECT * FROM memberships WHERE student_id=? ORDER BY purchased DESC", [
                String(profile["id"]),
              ])["map"]((m) => (
                <div
                  key={String(m["id"])}
                  className="flex justify-between border-b border-border py-3 text-xs"
                >
                  <span>
                    {m["name"]} · {m["purchased"]}
                    {m["expires"] ? " · scade il " + m["expires"] : ""}
                  </span>
                  <span>
                    {db["balance"](String(m["id"]))}/{m["visits"]} lezioni
                  </span>
                </div>
              ))}
              <h3 className="section-heading mt-3">Cronologia presenze</h3>
              {db["bookings"]()
                ["filter"]((b) => b["student_id"] === profile["id"])
                ["map"]((b) => (
                  <div
                    key={String(b["id"])}
                    className="flex justify-between border-b border-border py-3 text-xs"
                  >
                    <span>
                      {b["date"]} · {b["class_name"]}
                    </span>
                    <span className="tag">{statusLabels[String(b["status"])] || String(b["status"])}</span>
                  </div>
                ))}
              <h3 className="section-heading mt-3">Cronologia pagamenti</h3>
              {db["rows"]("SELECT * FROM payments WHERE student_id=? ORDER BY date DESC", [
                String(profile["id"]),
              ])["map"]((p) => (
                <div
                  key={String(p["id"])}
                  className="flex justify-between border-b border-border py-3 text-xs"
                >
                  <span>
                    {p["date"]} · {p["description"]} · {p["method"]}
                  </span>
                  <span>{euro(Number(p["amount"]))}</span>
                </div>
              ))}
              <p className="mt-3 text-xs">
                Prenotazioni da saldare:{" "}
                {euro(
                  db["bookings"]()
                    ["filter"]((b) => b["student_id"] === profile["id"] && !b["membership_id"])
                    ["reduce"](
                      (n, b) => n + Math["max"](0, Number(b["amount"]) - Number(b["paid"])),
                      0,
                    ),
                )}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function MembershipsPage() {
  const { db, refresh } = useStudio();
  const [kind, setKind] = useState<"purchase" | "type" | null>(null);
  const [edit, setEdit] = useState<Row | undefined>();
  const [search, setSearch] = useState("");
  const types = db?.["rows"]("SELECT * FROM membership_types") || [];
  const rows =
    (db?.["rows"](
      "SELECT m.*,s.name student_name FROM memberships m JOIN students s ON s.id=m.student_id ORDER BY purchased DESC",
    ) || [])["filter"]((m) =>
      String(m["student_name"])["toLowerCase"]()["includes"](search["toLowerCase"]()),
    ) || [];
  return (
    <>
      <Header
        eyebrow="Una pratica che dura nel tempo"
        title="Abbonamenti"
        subtitle="Piccoli impegni. Progressi significativi."
      >
        <Button
          variant="outline"
          onClick={() => {
            setEdit(undefined);
            setKind("type");
          }}
        >
          <Plus />
          Nuovo tipo
        </Button>
        <Button onClick={() => setKind("purchase")}>
          <Plus />
          Vendi abbonamento
        </Button>
      </Header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {types["map"]((t) => (
          <div className="metric" key={String(t["id"])}>
            <div className="flex justify-between">
              <Ticket size={22} className="text-primary" />
              <Button
                variant="ghost"
                size="icon"
                title="Modifica tipo di abbonamento"
                onClick={() => {
                  setEdit(t);
                  setKind("type");
                }}
              >
                <Pencil />
              </Button>
            </div>
            <h2 className="section-heading mt-3">{t["name"]}</h2>
            <div className="mt-3 flex justify-between items-end">
              <span className="font-display text-3xl">{euro(Number(t["price"]))}</span>
              <span className="text-xs text-muted-foreground">
                {t["visits"]} lezioni · {t["validity"] ? t["validity"] + " giorni" : "Senza scadenza"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <section className="panel mt-8">
        <div className="flex flex-wrap justify-between gap-4">
          <h2 className="section-heading">Abbonamenti delle allieve</h2>
          <input
            className="studio-input max-w-xs"
            aria-label="Cerca abbonamenti"
            placeholder="Cerca allieva…"
            value={search}
            onChange={(e) => setSearch(e["target"]["value"])}
          />
        </div>
        {rows["length"] ? (
          <div className="mt-5 overflow-x-auto">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Allieva</th>
                  <th>Abbonamento</th>
                  <th>Acquistato</th>
                  <th>Lezioni rimanenti</th>
                  <th>Ricevuto</th>
                  <th>Scadenza</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows["map"]((m) => {
                  const balance = db?.["balance"](String(m["id"])) || 0;
                  const paid =
                    db?.["value"](
                      "SELECT COALESCE(sum(amount),0) FROM payments WHERE membership_id=?",
                      [String(m["id"])],
                    ) || 0;
                  return (
                    <tr key={String(m["id"])}>
                      <td>{m["student_name"]}</td>
                      <td>{m["name"]}</td>
                      <td>{m["purchased"]}</td>
                      <td>
                        <span className={"tag " + (balance <= 2 ? "warning" : "success")}>
                          {balance} / {m["visits"]}
                        </span>
                      </td>
                      <td>
                        {euro(paid)} / {euro(Number(m["price"]))}
                        {paid < Number(m["price"]) && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={async () => {
                              if (!db) return;
                              const amount = prompt(
                                "Importo ricevuto (€)",
                                String(Number(m["price"]) - paid),
                              );
                              if (!amount) return;
                              const method = prompt(
                                "Metodo di pagamento (Contanti, Revolut, Satispay, Altro)",
                                "Contanti",
                              );
                              if (!method) return;
                              try {
                                await db["payment"]({
                                  student_id: String(m["student_id"]),
                                  membership_id: String(m["id"]),
                                  description: String(m["name"]),
                                  amount,
                                  date: romeToday(),
                                  method,
                                  category: "Abbonamento",
                                });
                                refresh();
                              } catch (e) {
                                toast["error"](String(e));
                              }
                            }}
                          >
                            Registra pagamento
                          </Button>
                        )}
                      </td>
                      <td>{m["expires"] || "—"}</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!db) return;
                            const delta = prompt("Correzione lezioni (ad esempio +1 o -1)");
                            if (
                              !delta ||
                              !Number["isInteger"](Number(delta)) ||
                              Number(delta) === 0
                            )
                              return;
                            const reason = prompt("Motivo della correzione (obbligatorio)");
                            if (!reason?.["trim"]()) return;
                            if (balance + Number(delta) < 0) {
                              toast["error"]("Le lezioni non possono essere negative.");
                              return;
                            }
                            await db["run"]("INSERT INTO visit_transactions VALUES(?,?,?,?,?,?)", [
                              db["id"](),
                              String(m["id"]),
                              null,
                              Number(delta),
                              reason,
                              new Date()["toISOString"](),
                            ]);
                            refresh();
                          }}
                        >
                          Correggi lezioni
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3 className="section-heading mt-6">Registro delle lezioni</h3>
            {(db?.["rows"](
              "SELECT v.*,s.name FROM visit_transactions v JOIN memberships m ON m.id=v.membership_id JOIN students s ON s.id=m.student_id ORDER BY created DESC LIMIT 20",
            ) || [])["map"]((v) => (
              <div className="flex gap-3 border-b border-border py-3 text-xs" key={String(v["id"])}>
                <span>{v["name"]}</span>
                <span className="text-muted-foreground">{v["reason"]}</span>
                <span className="ml-auto">
                  {Number(v["delta"]) > 0 ? "+" : ""}
                  {v["delta"]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={Ticket}
            title="Spazio per una pratica regolare"
            description="Ancora nessun abbonamento venduto."
          >
            <Button variant="outline" onClick={() => setKind("purchase")}>
              <Plus />
              Vendi il tuo primo abbonamento
            </Button>
          </Empty>
        )}
      </section>
      {kind && (
        <RecordDialog
          kind={kind}
          record={kind === "type" ? edit : undefined}
          open
          onClose={() => setKind(null)}
        />
      )}
    </>
  );
}
export function FinancePage() {
  const { db, refresh } = useStudio();
  const [month, setMonth] = useState(
    romeToday()["slice"](0, 7) < "2026-10" ? "2026-10" : romeToday()["slice"](0, 7),
  );
  const [tab, setTab] = useState("Entrate");
  const [filter, setFilter] = useState("Tutte");
  const [kind, setKind] = useState<"payment" | "expense" | null>(null);
  const [edit, setEdit] = useState<Row | undefined>();
  const [booking, setBooking] = useState<Row | undefined>();
  const fin = db?.["finance"](month, filter) || { income: 0, expenses: 0, profit: 0, payments: 0 };
  const rows =
    db?.["rows"](
      `SELECT * FROM ${tab === "Uscite" ? "expenses" : "payments"} WHERE substr(date,1,7)=? ORDER BY date DESC`,
      [month],
    ) || [];
  const unpaid = (db?.["bookings"]() || [])["filter"](
    (b) =>
      !b["membership_id"] &&
      Number(b["paid"]) < Number(b["amount"]) &&
      String(b["date"])["slice"](0, 7) === month &&
      (filter === "Tutte" || b["type"] === filter),
  );
  async function exportFinance() {
    if (!db) return;
    const XLSX = await import("xlsx");
    const wb = XLSX["utils"]["book_new"]();
    for (const t of ["payments", "expenses"])
      XLSX["utils"]["book_append_sheet"](
        wb,
        XLSX["utils"]["json_to_sheet"](
          db["rows"](`SELECT * FROM ${t} WHERE substr(date,1,7)=?`, [month]),
        ),
        t === "payments" ? "Entrate" : "Uscite",
      );
    XLSX["utils"]["book_append_sheet"](
      wb,
      XLSX["utils"]["json_to_sheet"]([{ month, ...fin }]),
      "Riepilogo",
    );
    XLSX["writeFile"](wb, `VONA-finance-${month}.xlsx`);
  }
  return (
    <>
      <Header
        eyebrow="Gestione consapevole"
        title="Finanze"
        subtitle="Un quadro chiaro di ciò che entra e di ciò che esce."
      >
        <Button
          variant="outline"
          onClick={() => {
            setEdit(undefined);
            setKind("expense");
          }}
        >
          <Plus />
          Aggiungi spesa
        </Button>
        <Button
          onClick={() => {
            setEdit(undefined);
            setBooking(undefined);
            setKind("payment");
          }}
        >
          <Plus />
          Registra pagamento
        </Button>
      </Header>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <input
            aria-label="Mese delle finanze"
            type="month"
            min="2026-10"
            className="studio-input max-w-44"
            value={month}
            onChange={(e) => e["target"]["value"] >= "2026-10" && setMonth(e["target"]["value"])}
          />
          <select
            aria-label="Filtro per lezione"
            value={filter}
            onChange={(e) => setFilter(e["target"]["value"])}
            className="studio-input max-w-36"
          >
            <option>Tutte</option>
            <option>Yoga</option>
            <option>Stretching</option>
          </select>
        </div>
        <Button variant="outline" onClick={exportFinance}>
          <Download />
          Esporta report
        </Button>
      </div>
      {filter !== "Tutte" && (
        <p className="mb-5 text-xs text-muted-foreground">
          I filtri per lezione includono solo i pagamenti delle lezioni singole collegate. Gli
          incassi degli abbonamenti e le spese condivise restano in «Tutte».
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric
          label="Entrate ricevute"
          value={euro(fin["income"])}
          detail={`${fin["payments"]} pagamenti ricevuti`}
          icon={ArrowDownLeft}
        />
        <Metric
          label="Uscite"
          value={euro(fin["expenses"])}
          detail="Costi reali dello studio"
          icon={Wallet}
        />
        <Metric
          label="Utile netto"
          value={euro(fin["profit"])}
          detail="Entrate meno uscite"
          icon={CircleDollarSign}
          tone="success"
        />
        <Metric
          label="Prenotazioni non pagate"
          value={unpaid["length"]}
          detail={`${euro(unpaid["reduce"]((n, b) => n + Number(b["amount"]) - Number(b["paid"]), 0))} da saldare`}
          icon={Ticket}
        />
      </div>
      <section className="panel mt-8">
        <div className="flex justify-between items-center">
          <h2 className="section-heading">L'anno in equilibrio</h2>
          <span className="text-xs text-muted-foreground">{month["slice"](0, 4)}</span>
        </div>
        <div className="mt-5">
          <YearChart year={Number(month["slice"](0, 4))} />
        </div>
      </section>
      <section className="panel mt-8">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-2">
            {["Entrate", "Uscite", "Da saldare"]["map"]((t) => (
              <Button key={t} variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)}>
                {t}
              </Button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground self-center">
            {months[Number(month["slice"](5, 7)) - 1]} {month["slice"](0, 4)}
          </span>
        </div>
        {tab === "Da saldare" ? (
          unpaid["length"] ? (
            <div className="overflow-x-auto mt-4">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Allieva</th>
                    <th>Lezione</th>
                    <th>Dovuto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {unpaid["map"]((b) => (
                    <tr key={String(b["id"])}>
                      <td>{b["name"]}</td>
                      <td>
                        {b["date"]} · {b["class_name"]}
                      </td>
                      <td>{euro(Number(b["amount"]) - Number(b["paid"]))}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEdit(undefined);
                            setBooking(b);
                            setKind("payment");
                          }}
                        >
                          Registra pagamento
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Check} title="Nessuna prenotazione non pagata questo mese" />
          )
        ) : rows["length"] ? (
          <div className="overflow-x-auto mt-4">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th>Metodo</th>
                  <th>Importo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows["map"]((r) => (
                  <tr key={String(r["id"])}>
                    <td>{r["date"]}</td>
                    <td>{r["description"]}</td>
                    <td>{r["category"]}</td>
                    <td>{r["method"]}</td>
                    <td className="font-semibold">{euro(Number(r["amount"]))}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Modifica movimento"
                        onClick={() => {
                          setEdit(r);
                          setBooking(undefined);
                          setKind(tab === "Uscite" ? "expense" : "payment");
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Elimina movimento"
                        onClick={async () => {
                          if (
                            !db ||
                            !confirm("Eliminare questo movimento? I totali finanziari cambieranno.")
                          )
                            return;
                          await db["run"](
                            `DELETE FROM ${tab === "Uscite" ? "expenses" : "payments"} WHERE id=?`,
                            [String(r["id"])],
                          );
                          refresh();
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Wallet}
            title={`Nessun elemento in «${tab}» per ora`}
            description="Un registro tutto nuovo. Qui compaiono solo i tuoi movimenti reali."
          />
        )}
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Lezioni tenute"
          value={
            db?.["value"](
              "SELECT count(*) FROM classes WHERE substr(date,1,7)=? AND date<=? AND status<>'Cancelled'",
              [month, romeToday()],
            ) || 0
          }
          detail="Programmate, non annullate"
          icon={CalendarDays}
        />
        <Metric
          label="Presenze delle allieve"
          value={
            db?.["value"](
              "SELECT count(*) FROM attendance a JOIN bookings b ON b.id=a.booking_id JOIN classes c ON c.id=b.class_id WHERE a.status='Present' AND substr(c.date,1,7)=?",
              [month],
            ) || 0
          }
          detail="Presenze effettive"
          icon={Users}
        />
        <Metric
          label="Abbonamenti venduti"
          value={
            db?.["value"]("SELECT count(*) FROM memberships WHERE substr(purchased,1,7)=?", [
              month,
            ]) || 0
          }
          detail="Acquistati questo mese"
          icon={Ticket}
        />
        <Metric
          label="Pagamenti ricevuti"
          value={fin["payments"]}
          detail="Entrate effettivamente ricevute"
          icon={Wallet}
        />
      </div>
      {kind && (
        <RecordDialog
          kind={kind}
          record={edit}
          booking={booking}
          open
          onClose={() => setKind(null)}
        />
      )}
    </>
  );
}
export function ClassPage({ id }: { id: string }) {
  const { db, refresh } = useStudio();
  const [edit, setEdit] = useState(false);
  const [place, setPlace] = useState<number | null>(null);
  const [student, setStudent] = useState("");
  const [payment, setPayment] = useState("15");
  const [payBooking, setPayBooking] = useState<Row | undefined>();
  const c = db?.["rows"]("SELECT * FROM classes WHERE id=?", [id])[0];
  if (!db) return <p>Apertura della lezione…</p>;
  if (!c) return <Empty title="Lezione non trovata" />;
  const bookings = db["bookings"](id);
  const active = student ? db["activeMembership"](student, String(c["date"])) : undefined;
  async function book(e: React.FormEvent) {
    e["preventDefault"]();
    if (!db || !place) return;
    try {
      await db["book"](id, student, place, payment);
      refresh();
      setPlace(null);
      toast["success"]("Allieva prenotata.");
    } catch (e) {
      toast["error"](
        String(e)["includes"]("UNIQUE")
          ? "Questa allieva è già prenotata o il posto è occupato."
          : String(e),
      );
    }
  }
  return (
    <>
      <Button variant="link" className="mb-4 h-auto p-0 text-xs" asChild>
        <Link to="/calendar">
          <ChevronLeft />
          Torna al calendario
        </Link>
      </Button>
      <Header
        eyebrow={String(c["type"]) + " · " + dateLabel(String(c["date"]))}
        title={String(c["name"])}
        subtitle={`${c["start"]}–${c["end"]} · ${c["location"] || "VONA Studio"} · ${bookings["length"]}/${c["capacity"]} posti prenotati`}
      >
        <Button variant="outline" onClick={() => setEdit(true)}>
          <Pencil />
          Modifica lezione
        </Button>
        <Button
          variant="outline"
          disabled={c["status"] === "Cancelled"}
          onClick={async () => {
            if (
              !confirm(
                "Annullare questa lezione? Prenotazioni e pagamenti sono preservati; le lezioni degli abbonamenti saranno ripristinate.",
              )
            )
              return;
            try {
              await db["cancelClass"](id);
              refresh();
            } catch (e) {
              toast["error"](String(e));
            }
          }}
        >
          Annulla lezione
        </Button>
      </Header>
      {c["status"] === "Cancelled" && (
        <p className="mb-5 tag warning">Lezione annullata · record storici preservati</p>
      )}
      {bookings["length"] >= Number(c["capacity"]) && (
        <p className="mb-5 tag warning">Questa lezione è al completo</p>
      )}
      <div className="overflow-x-auto">
        <table className="studio-table">
          <thead>
            <tr>
              <th>N.</th>
              <th>Allieva</th>
              <th>Tipo di pagamento</th>
              <th>Importo</th>
              <th>Pagamento</th>
              <th>Presenza</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array["from"]({ length: Number(c["capacity"]) }, (_, i) => {
              const b = bookings["find"]((b) => Number(b["place"]) === i + 1);
              return (
                <tr key={i}>
                  <td className="text-muted-foreground">{String(i + 1)["padStart"](2, "0")}</td>
                  {b ? (
                    <>
                      <td className="font-semibold">{b["name"]}</td>
                      <td>
                        {b["membership_id"] ? (
                          <>
                            <span className="tag">Abbonamento</span>
                            <p className="mt-1 text-[10px]">
                              {db["balance"](String(b["membership_id"]))} lezioni rimaste
                            </p>
                          </>
                        ) : (
                          "Lezione singola"
                        )}
                      </td>
                      <td>{b["membership_id"] ? "—" : euro(Number(b["amount"]))}</td>
                      <td>
                        {b["membership_id"] ? (
                          <span
                            className={
                              "tag " +
                              (db["value"](
                                "SELECT COALESCE(sum(amount),0) FROM payments WHERE membership_id=?",
                                [String(b["membership_id"])],
                              ) >=
                              db["value"]("SELECT price FROM memberships WHERE id=?", [
                                String(b["membership_id"]),
                              ])
                                ? "success"
                                : "warning")
                            }
                          >
                            Abbonamento{" "}
                            {db["value"](
                              "SELECT COALESCE(sum(amount),0) FROM payments WHERE membership_id=?",
                              [String(b["membership_id"])],
                            ) >=
                            db["value"]("SELECT price FROM memberships WHERE id=?", [
                              String(b["membership_id"]),
                            ])
                              ? "pagato"
                              : "da pagare"}
                          </span>
                        ) : Number(b["paid"]) >= Number(b["amount"]) ? (
                          <span className="tag success">Pagata</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setPayBooking(b)}>
                            {Number(b["paid"]) > 0 ? "Partially paid" : "Da saldare"}
                          </Button>
                        )}
                      </td>
                      <td>
                        <select
                          className="studio-input min-w-24"
                          aria-label={`Presenza di ${b["name"]}`}
                          value={String(b["status"])}
                          disabled={c["status"] === "Cancelled"}
                          onChange={async (e) => {
                            try {
                              await db["attendance"](String(b["id"]), e["target"]["value"]);
                              refresh();
                            } catch (err) {
                              toast["error"](String(err));
                            }
                          }}
                        >
                          {["Booked", "Present", "Absent", "Cancelled"]["map"]((s) => (
                            <option key={s} value={s}>
                              {statusLabels[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          aria-label={`Note per ${b["name"]}`}
                          className="studio-input min-w-24"
                          defaultValue={String(b["notes"])}
                          onBlur={async (e) => {
                            await db["run"]("UPDATE bookings SET notes=? WHERE id=?", [
                              e["target"]["value"],
                              String(b["id"]),
                            ]);
                            refresh();
                          }}
                        />
                      </td>
                      <td>
                        <Button
                          title="Sposta prenotazione"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const targets = db["rows"](
                              "SELECT * FROM classes WHERE id<>? AND status<>'Cancelled' ORDER BY date,start",
                              [id],
                            );
                            const target = prompt(
                              "Inserisci il numero della lezione di destinazione:\n" +
                                targets["map"](
                                  (t, i) => `${i + 1}. ${t["date"]} ${t["start"]} ${t["name"]}`,
                                )["join"]("\n"),
                            );
                            if (!target) return;
                            const dest = targets[Number(target) - 1];
                            if (!dest) return;
                            const used = db["bookings"](String(dest["id"]));
                            const free = Array["from"](
                              { length: Number(dest["capacity"]) },
                              (_, i) => i + 1,
                            )["find"]((p) => !used["some"]((b) => Number(b["place"]) === p));
                            if (!free) {
                              toast["error"]("La lezione di destinazione è al completo.");
                              return;
                            }
                            if (b["status"] === "Present") {
                              toast["error"]("Annulla la presenza prima di spostare questa prenotazione.");
                              return;
                            }
                            try {
                              await db["run"]("UPDATE bookings SET class_id=?,place=? WHERE id=?", [
                                String(dest["id"]),
                                free,
                                String(b["id"]),
                              ]);
                              refresh();
                            } catch (e) {
                              toast["error"]("Allieva già prenotata nella lezione di destinazione.");
                            }
                          }}
                        >
                          <ArrowUpRight />
                        </Button>
                        <Button
                          title="Rimuovi prenotazione"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (
                              !confirm(
                                "Rimuovere questa prenotazione? La cronologia di pagamenti e abbonamenti sarà mantenuta.",
                              )
                            )
                              return;
                            try {
                              await db.removeBooking(String(b['id']));
                              refresh();
                              toast["success"]("Prenotazione annullata; cronologia mantenuta.");
                            } catch (e) {
                              toast["error"](String(e));
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={6}>
                        <Button
                          disabled={c["status"] === "Cancelled"}
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => {
                            setStudent("");
                            setPayment(String(c["price"]));
                            setPlace(i + 1);
                          }}
                        >
                          <Plus />
                          Aggiungi allieva
                        </Button>
                      </td>
                      <td />
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <RecordDialog kind="class" record={c} open onClose={() => setEdit(false)} />}
      <Dialog open={place !== null} onOpenChange={(v) => !v && setPlace(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">Prenota il posto {place}</DialogTitle>
            <DialogDescription>
              {c["name"]} · {c["date"]}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={book} className="space-y-4">
            <Field label="Allieva">
              <select
                required
                value={student}
                onChange={(e) => {
                  setStudent(e["target"]["value"]);
                  setPayment(
                    db["activeMembership"](e["target"]["value"], String(c["date"]))
                      ? "membership"
                      : String(c["price"]),
                  );
                }}
              >
                <option value="">Seleziona un'allieva esistente</option>
                {db["rows"]("SELECT * FROM students WHERE status='Active' ORDER BY name")["map"](
                  (s) => (
                    <option key={String(s["id"])} value={String(s["id"])}>
                      {s["name"]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Tipo di pagamento">
              <select value={payment} onChange={(e) => setPayment(e["target"]["value"])}>
                {active && (
                  <option value="membership">
                    {active["name"]} · {db["balance"](String(active["id"]))} lezioni rimaste
                  </option>
                )}
                <option value={db["settings"]()["single10"]}>
                  Lezione singola · {euro(Number(db["settings"]()["single10"]))}
                </option>
                <option value={db["settings"]()["single15"]}>
                  Lezione singola · {euro(Number(db["settings"]()["single15"]))}
                </option>
                {![db["settings"]()["single10"], db["settings"]()["single15"]]["includes"](
                  String(c["price"]),
                ) && (
                  <option value={String(c["price"])}>
                    Prezzo della lezione · {euro(Number(c["price"]))}
                  </option>
                )}
              </select>
            </Field>
            <Button type="submit" className="w-full">
              <Plus />
              Prenota allieva
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {payBooking && (
        <RecordDialog
          kind="payment"
          booking={payBooking}
          open
          onClose={() => setPayBooking(undefined)}
        />
      )}
    </>
  );
}
export function SettingsPage() {
  const { db, refresh } = useStudio();
  const [restoring, setRestoring] = useState(false);
  if (!db) return <p>Apertura delle impostazioni…</p>;
  const s = db["settings"]();
  async function backup() {
    if (!db) return;
    const bytes = db["db"]["export"]();
    if (window["vonaDesktop"]) await window["vonaDesktop"]["backup"](Array["from"](bytes));
    else download(bytes, "VONA-Studio-" + romeToday() + ".sqlite");
    toast["success"]("Backup del database esportato.");
  }
  async function csv(table: string) {
    if (!db) return;
    const rows = table === "attendance" ? db["bookings"]() : db["rows"]("SELECT * FROM students");
    const keys = Object["keys"](rows[0] || { id: "", name: "" });
    const enc = (v: unknown) => '"' + String(v ?? "")["replaceAll"]('"', '""') + '"';
    const text = [
      keys["map"](enc)["join"](","),
      ...rows["map"]((r) => keys["map"]((k) => enc(r[k]))["join"](",")),
    ]["join"]("\r\n");
    download("\uFEFF" + text, `VONA-${table}-${romeToday()}.csv`, "text/csv;charset=utf-8");
  }
  async function restore(bytes: Uint8Array) {
    if (!db) return;
    if (!confirm("Ripristinare questo backup? I dati attuali saranno prima salvati, poi sostituiti."))
      return;
    setRestoring(true);
    try {
      await restoreStudio(db, bytes);
      refresh();
      toast["success"]("Studio ripristinato.");
    } catch (e) {
      toast["error"]("Ripristino non riuscito: " + String(e));
    } finally {
      setRestoring(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="Uno studio che ti assomiglia"
        title="Impostazioni e backup"
        subtitle="Le tue preferenze. I tuoi dati. Sempre tuoi."
      />
      <form
        onSubmit={async (e) => {
          e["preventDefault"]();
          const values = Object["fromEntries"](new FormData(e["currentTarget"]));
          try {
            await db["transaction"](() => {
              for (const [key, value] of Object["entries"](values))
                db["db"]["run"]("UPDATE settings SET value=? WHERE key=?", [String(value), key]);
            });
            refresh();
            toast["success"]("Impostazioni salvate. I record storici restano invariati.");
          } catch (e) {
            toast["error"](String(e));
          }
        }}
      >
        <section className="panel">
          <h2 className="section-heading">Preferenze dello studio</h2>
          <div className="mt-6 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Field label="Nome dello studio">
              <input required name="studio_name" defaultValue={s["studio_name"]} />
            </Field>
            <Field label="Fuso orario">
              <input value="Europe/Rome" readOnly />
            </Field>
            <Field label="Durata predefinita delle lezioni (minuti)">
              <input type="number" min="1" name="duration" defaultValue={s["duration"]} />
            </Field>
            <Field label="Posti predefiniti per lezione">
              <input type="number" min="1" max="100" name="capacity" defaultValue={s["capacity"]} />
            </Field>
            <Field label="Lezione singola · prezzo 1 (€)">
              <input
                name="single10"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s["single10"]}
              />
            </Field>
            <Field label="Lezione singola · prezzo 2 (€)">
              <input
                name="single15"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s["single15"]}
              />
            </Field>
            <Field label="Metodi di pagamento (separati da virgola)">
              <input required name="methods" defaultValue={s["methods"]} />
            </Field>
            <Field label="Tipi di lezione (separati da virgola)">
              <input required name="class_types" defaultValue={s["class_types"]} />
            </Field>
          </div>
          <Button type="submit" className="mt-6">
            <Check />
            Salva preferenze
          </Button>
        </section>
      </form>
      <section className="panel mt-9">
        <h2 className="section-heading">Backup e dati</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Tutti i dati restano su questo dispositivo. Conserva un backup in un luogo sicuro.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={backup}>
            <Download />
            Backup completo del database
          </Button>
          <Button
            disabled={restoring}
            variant="outline"
            onClick={async () => {
              if (window["vonaDesktop"]) {
                const bytes = await window["vonaDesktop"]["restore"]();
                if (bytes) await restore(new Uint8Array(bytes));
              } else document["getElementById"]("restore-file")?.["click"]();
            }}
          >
            <Upload />
            {restoring ? "Ripristino…" : "Ripristina backup"}
          </Button>
          <input
            id="restore-file"
            type="file"
            accept=".sqlite,.db"
            hidden
            onChange={async (e) => {
              const f = e["target"]["files"]?.[0];
              if (f) await restore(new Uint8Array(await f["arrayBuffer"]()));
              e["target"]["value"] = "";
            }}
          />
          <Button variant="outline" onClick={() => csv("students")}>
            <Download />
            CSV allieve
          </Button>
          <Button variant="outline" onClick={() => csv("attendance")}>
            <Download />
            CSV presenze
          </Button>
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">
          Database SQLite · Nessun account richiesto
        </p>
      </section>
      <section className="panel mt-9">
        <h2 className="section-heading">Categorie di spesa</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {db["rows"]("SELECT * FROM expense_categories")["map"]((c) => (
            <span className="tag stretch" key={String(c["name"])}>
              {c["name"]}
            </span>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={async () => {
            const category = prompt("Nuova categoria di spesa");
            if (!category?.["trim"]()) return;
            try {
              await db["run"]("INSERT INTO expense_categories VALUES(?)", [category["trim"]()]);
              refresh();
            } catch (e) {
              toast["error"]("Questa categoria esiste già.");
            }
          }}
        >
          <Plus />
          Aggiungi categoria
        </Button>
      </section>
      <section className="panel mt-9">
        <h2 className="section-heading">Prezzi degli abbonamenti</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Le modifiche si applicano solo agli acquisti futuri.
        </p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/memberships">
            Gestisci i tipi di abbonamento <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </>
  );
}
