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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const dateLabel = (d: string) =>
  new Date(d + "T12:00:00")["toLocaleDateString"]("en-GB", {
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
    class: record ? "Edit class" : "Add a class",
    student: record ? "Edit student" : "Add a student",
    payment: record ? "Edit payment" : "Register a payment",
    expense: record ? "Edit expense" : "Add an expense",
    purchase: "Purchase a membership",
    type: record ? "Edit membership type" : "New membership type",
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
          toast["success"](`${n} classes created. Existing classes were skipped.`);
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
      toast["success"]("Saved to your studio.");
    } catch (e) {
      toast["error"](
        String(e)
          ["replace"]("Error: ", "")
          ["replace"](
            "UNIQUE constraint failed: students.name, students.phone",
            "This student already has a profile.",
          )
          ["replace"](
            "UNIQUE constraint failed: bookings.class_id, bookings.student_id",
            "This student is already booked into this class.",
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
                    One-time class
                  </Button>
                  <Button
                    type="button"
                    variant={recurring ? "secondary" : "ghost"}
                    onClick={() => setRecurring(true)}
                  >
                    Recurring schedule
                  </Button>
                </div>
              )}
              <Field label="Class name">
                <input
                  name="name"
                  defaultValue={String(record?.["name"] || "")}
                  placeholder="e.g. Gentle morning yoga"
                />
              </Field>
              <Field label="Class type">
                <select name="type" defaultValue={String(record?.["type"] || "Yoga")}>
                  {settings["class_types"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              {recurring ? (
                <>
                  <Field label="From">
                    <input
                      required
                      type="date"
                      name="from"
                      min={CALENDAR_START}
                      defaultValue={today["slice"](0, 7) + "-01"}
                    />
                  </Field>
                  <Field label="Through">
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
                    <span className="field mb-2">Repeat on</span>
                    <div className="flex flex-wrap gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]["map"]((d, i) => (
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
                <Field label="Date">
                  <input
                    required
                    type="date"
                    name="date"
                    min={CALENDAR_START}
                    defaultValue={String(record?.["date"] || today)}
                  />
                </Field>
              )}
              <Field label="Start time">
                <input
                  required
                  type="time"
                  name="start"
                  defaultValue={String(record?.["start"] || "15:00")}
                />
              </Field>
              <Field label="End time">
                <input
                  required
                  type="time"
                  name="end"
                  defaultValue={String(record?.["end"] || "16:00")}
                />
              </Field>
              <Field label="Location">
                <input name="location" defaultValue={String(record?.["location"] || "")} />
              </Field>
              <Field label="Single visit price (€)">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={Number(record?.["price"] || settings["single15"])}
                />
              </Field>
              <Field label="Student places">
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={Number(record?.["capacity"] || settings["capacity"])}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
            </>
          )}
          {kind === "student" && (
            <>
              <div className="col-span-2">
                <Field label="Full name">
                  <input required name="name" defaultValue={String(record?.["name"] || "")} />
                </Field>
              </div>
              <Field label="Phone number">
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
              <Field label="Registration date">
                <input
                  name="registered"
                  type="date"
                  defaultValue={String(record?.["registered"] || today)}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Personal notes">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
              <input type="hidden" name="status" value={String(record?.["status"] || "Active")} />
            </>
          )}
          {(kind === "payment" || kind === "expense") && (
            <>
              <div className="col-span-2">
                <Field label="Description">
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
              <Field label="Amount (€)">
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
              <Field label={kind === "payment" ? "Date received" : "Expense date"}>
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={String(record?.["date"] || today)}
                />
              </Field>
              <Field label="Payment method">
                <select name="method" defaultValue={String(record?.["method"] || "Cash")}>
                  {settings["methods"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select name="category" defaultValue={String(record?.["category"] || "Other")}>
                  {(kind === "expense"
                    ? db["rows"]("SELECT name FROM expense_categories")["map"]((r) =>
                        String(r["name"]),
                      )
                    : ["Other", "Single visit", "Membership"])["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              {kind === "payment" && !booking && (
                <div className="col-span-2">
                  <Field label="Student (optional)">
                    <select name="student_id" defaultValue={String(record?.["student_id"] || "")}>
                      <option value="">No student</option>
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
                <Field label="Notes">
                  <textarea name="notes" defaultValue={String(record?.["notes"] || "")} />
                </Field>
              </div>
            </>
          )}
          {kind === "purchase" && (
            <>
              <div className="col-span-2">
                <Field label="Student">
                  <select required name="student_id">
                    <option value="">Select student</option>
                    {students["map"]((s) => (
                      <option key={String(s["id"])} value={String(s["id"])}>
                        {s["name"]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Membership">
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
              <Field label="Total price (€)">
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
              <Field label="Purchase date">
                <input required name="purchased" type="date" defaultValue={today} />
              </Field>
              <Field label="Expiration (optional)">
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
              <Field label="Amount received (€)">
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
              <Field label="Actual payment date">
                <input required name="payment_date" type="date" defaultValue={today} />
              </Field>
              <Field label="Payment method">
                <select name="method">
                  {settings["methods"]["split"](",")["map"]((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input name="notes" />
              </Field>
            </>
          )}
          {kind === "type" && (
            <>
              <Field label="Name">
                <input required name="name" defaultValue={String(record?.["name"] || "")} />
              </Field>
              <Field label="Visits included">
                <input
                  required
                  type="number"
                  min="1"
                  name="visits"
                  defaultValue={Number(record?.["visits"] || 4)}
                />
              </Field>
              <Field label="Price (€)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  defaultValue={Number(record?.["price"] || 40)}
                />
              </Field>
              <Field label="Validity (days, optional)">
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
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              <Check size={15} />
              {busy
                ? "Saving…"
                : kind === "class" && recurring
                  ? "Create schedule"
                  : "Save " +
                    (kind === "purchase"
                      ? "membership"
                      : kind === "type"
                        ? "membership type"
                        : kind)}
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
        title="Your studio, at a glance"
        subtitle="A little clarity for a more mindful day."
      >
        <Button onClick={() => setDialog("class")}>
          <Plus />
          Add a class
        </Button>
      </Header>
      <div className="dashboard-banner mb-7 flex items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-primary">
            Space to grow
          </span>
          <h2 className="mt-2 font-display text-[28px] leading-tight">Welcome to your studio.</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {active
              ? "Every class, every student, every small step forward."
              : "A fresh start. Your next chapter begins with your first class."}
          </p>
          <Button
            variant="link"
            className="mt-2 h-auto px-0 text-xs"
            onClick={() => setDialog("class")}
          >
            Plan your next class <ArrowUpRight size={14} />
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
          label="Classes today"
          value={classes["length"]}
          detail={`${db?.["value"]("SELECT count(*) FROM bookings b JOIN classes c ON c.id=b.class_id WHERE c.date=?", [today]) || 0} students booked`}
          icon={CalendarDays}
        />
        <Metric
          label="Active students"
          value={active}
          detail="Your growing community"
          icon={Users}
        />
        <Metric
          label="Active memberships"
          value={memberships["length"]}
          detail={`${low["length"]} with 2 visits or fewer`}
          icon={Ticket}
        />
        <Metric
          label="Monthly income"
          value={euro(fin["income"])}
          detail={`${months[Number(today["slice"](5, 7)) - 1]} ${today["slice"](0, 4)} · received payments`}
          icon={Wallet}
          tone="success"
        />
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">
              Today’s classes{" "}
              <span className="ml-2 font-sans text-xs text-muted-foreground">
                {classes["length"]}
              </span>
            </h2>
            <Button variant="link" asChild className="h-auto px-0 text-xs">
              <Link to="/calendar">
                View calendar <ArrowUpRight />
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
            <Empty title="A quiet day at the studio" description="No classes scheduled for today.">
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setDialog("class")}
              >
                <Plus />
                Schedule a class
              </Button>
            </Empty>
          )}
          <div className="mt-1 border-t border-border pt-5">
            <div className="flex justify-between">
              <h3 className="text-xs font-semibold">Coming up next</h3>
              <span className="text-[10px] text-muted-foreground">Upcoming classes</span>
            </div>
            {upcoming["length"] ? (
              upcoming["map"]((c) => <ClassLine key={String(c["id"])} c={c} />)
            ) : (
              <div className="flex items-center gap-3 py-6 text-xs text-muted-foreground">
                <Clock3 size={17} />
                <span>No upcoming classes yet.</span>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <h2 className="section-heading">Quick actions</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(
              [
                { kind: "student", icon: Users, title: "Add student", desc: "Grow your community" },
                {
                  kind: "purchase",
                  icon: Ticket,
                  title: "Sell membership",
                  desc: "A new commitment",
                },
                {
                  kind: "payment",
                  icon: ArrowDownLeft,
                  title: "Register payment",
                  desc: "Keep things balanced",
                },
                { kind: "expense", icon: Wallet, title: "Add expense", desc: "Track studio costs" },
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
              <h3 className="text-xs font-semibold">Needs a little attention</h3>
              <span className="tag warning">{unpaid["length"] + low["length"]}</span>
            </div>
            {unpaid["length"] + low["length"] === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Check size={15} className="text-success" />
                You’re all caught up. A lovely place to be.
              </p>
            ) : (
              <>
                <Link to="/finance" className="mt-4 block text-xs text-warning">
                  {unpaid["length"]} unpaid bookings →
                </Link>
                <Link to="/memberships" className="mt-3 block text-xs text-primary">
                  {low["length"]} memberships running low →
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
      <section className="panel mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-heading">A balanced studio</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Your finances for {months[Number(today["slice"](5, 7)) - 1]} {today["slice"](0, 4)}
            </p>
          </div>
          <Button variant="link" asChild className="h-auto px-0 text-xs">
            <Link to="/finance">
              Explore finances <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-5 text-[10px] text-muted-foreground">
              <span>
                <span className="tag">Income</span>
              </span>
              <span>
                <span className="tag stretch">Expenses</span>
              </span>
            </div>
            <YearChart year={Number(today["slice"](0, 4))} />
          </div>
          <div className="grid grid-cols-3 gap-3 lg:content-center">
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Income</p>
              <p className="mt-2 font-display text-2xl">{euro(fin["income"])}</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Expenses</p>
              <p className="mt-2 font-display text-2xl">{euro(fin["expenses"])}</p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">Net profit</p>
              <p className="mt-2 font-display text-2xl text-success">{euro(fin["profit"])}</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="mt-9 flex justify-between border-t border-border pt-5 text-[9px] text-muted-foreground">
        <span>Made for a mindful studio.</span>
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
              title={`${months[i]} income: ${euro(d["income"])}`}
            />
            <div
              className="chart-bar expense"
              style={{ height: `${(d["expenses"] / max) * 100}%` }}
              title={`${months[i]} expenses: ${euro(d["expenses"])}`}
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
  const [view, setView] = useState("Month");
  const [type, setType] = useState("All");
  const [dialog, setDialog] = useState(false);
  const [focus, setFocus] = useState(romeToday());
  const classes =
    (db?.["rows"]("SELECT * FROM classes WHERE substr(date,1,7)=? ORDER BY date,start", [month]) ||
      [])["filter"]((c) => type === "All" || c["type"] === type) || [];
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
    view === "Day"
      ? c["date"] === focus
      : view === "Week"
        ? new Date(String(c["date"]) + "T12:00:00") >= weekStart &&
          new Date(String(c["date"]) + "T12:00:00") <= weekEnd
        : true,
  );
  return (
    <>
      <Header
        eyebrow="Make space for movement"
        title="Calendar"
        subtitle="Your classes, thoughtfully planned."
      >
        <Button onClick={() => setDialog(true)}>
          <Plus />
          Add a class
        </Button>
      </Header>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            title="Previous month"
            disabled={month === "2025-10"}
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="section-heading min-w-40 text-center">
            {months[mi]} {year}
          </h2>
          <Button size="icon" variant="outline" title="Next month" onClick={() => shift(1)}>
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
            Today
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            aria-label="Choose month"
            type="month"
            min="2025-10"
            className="studio-input max-w-40"
            value={month}
            onChange={(e) => e["target"]["value"] >= "2025-10" && setMonth(e["target"]["value"])}
          />
          <select
            aria-label="Class type filter"
            className="studio-input max-w-32"
            value={type}
            onChange={(e) => setType(e["target"]["value"])}
          >
            <option>All</option>
            <option>Yoga</option>
            <option>Stretching</option>
          </select>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {["Month", "Week", "Day", "List"]["map"]((v) => (
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
      {view === "Month" ? (
        <>
          <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground mb-3">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]["map"]((d) => (
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
                    {x["status"] === "Cancelled" ? " (cancelled)" : ""}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 max-w-xs">
            <Field label={view === "Week" ? "Week containing" : "Date"}>
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
              title="No classes in this view"
              description="A clear calendar, ready for your next class."
            >
              <Button variant="outline" onClick={() => setDialog(true)}>
                <Plus />
                Add a class
              </Button>
            </Empty>
          )}
        </>
      )}
      <p className="mt-5 text-[10px] text-muted-foreground">
        {classes["length"]} classes this month · Europe/Rome
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
        eyebrow="Your community"
        title="Students"
        subtitle="Every student has a story. Keep it all in one place."
      >
        <Button
          onClick={() => {
            setEdit(undefined);
            setDialog(true);
          }}
        >
          <Plus />
          Add student
        </Button>
      </Header>
      <div className="mb-6 flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={15} />
          <input
            className="studio-input pl-10"
            aria-label="Search students"
            placeholder="Search name, phone or Instagram…"
            value={search}
            onChange={(e) => setSearch(e["target"]["value"])}
          />
        </div>
        <select
          className="studio-input max-w-32"
          aria-label="Student status"
          value={status}
          onChange={(e) => setStatus(e["target"]["value"])}
        >
          <option>Active</option>
          <option>Archived</option>
        </select>
      </div>
      {rows["length"] ? (
        <div className="overflow-x-auto">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Contact</th>
                <th>Membership</th>
                <th>Registered</th>
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
                          {db?.["balance"](String(m["id"]))} visits remaining
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No active membership</span>
                      )}
                    </td>
                    <td>{dateLabel(String(s["registered"]))}</td>
                    <td>
                      <Button
                        title="Edit student"
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
                        title={status === "Active" ? "Archive student" : "Restore student"}
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            !db ||
                            !confirm(
                              `${status === "Active" ? "Archive" : "Restore"} ${s["name"]}? All history will be preserved.`,
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
          title={search ? "No matching students" : "Your community starts here"}
          description="No student records yet."
        >
          <Button variant="outline" onClick={() => setDialog(true)}>
            <Plus />
            Add your first student
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
              {profile?.["phone"]} {profile?.["instagram"]} · Registered {profile?.["registered"]}
            </DialogDescription>
          </DialogHeader>
          {profile && db && (
            <>
              <p className="text-xs text-muted-foreground">
                {profile["email"]} {profile["notes"]}
              </p>
              <h3 className="section-heading mt-3">Membership history</h3>
              {db["rows"]("SELECT * FROM memberships WHERE student_id=? ORDER BY purchased DESC", [
                String(profile["id"]),
              ])["map"]((m) => (
                <div
                  key={String(m["id"])}
                  className="flex justify-between border-b border-border py-3 text-xs"
                >
                  <span>
                    {m["name"]} · {m["purchased"]}
                    {m["expires"] ? " · expires " + m["expires"] : ""}
                  </span>
                  <span>
                    {db["balance"](String(m["id"]))}/{m["visits"]} visits
                  </span>
                </div>
              ))}
              <h3 className="section-heading mt-3">Attendance history</h3>
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
                    <span className="tag">{b["status"]}</span>
                  </div>
                ))}
              <h3 className="section-heading mt-3">Payment history</h3>
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
                Outstanding bookings:{" "}
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
        eyebrow="A practice that lasts"
        title="Memberships"
        subtitle="Small commitments. Meaningful progress."
      >
        <Button
          variant="outline"
          onClick={() => {
            setEdit(undefined);
            setKind("type");
          }}
        >
          <Plus />
          New type
        </Button>
        <Button onClick={() => setKind("purchase")}>
          <Plus />
          Sell membership
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
                title="Edit membership type"
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
                {t["visits"]} visits · {t["validity"] ? t["validity"] + " days" : "No expiry"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <section className="panel mt-8">
        <div className="flex flex-wrap justify-between gap-4">
          <h2 className="section-heading">Student memberships</h2>
          <input
            className="studio-input max-w-xs"
            aria-label="Search memberships"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e["target"]["value"])}
          />
        </div>
        {rows["length"] ? (
          <div className="mt-5 overflow-x-auto">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Membership</th>
                  <th>Purchased</th>
                  <th>Remaining visits</th>
                  <th>Received</th>
                  <th>Expiry</th>
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
                                "Amount received (€)",
                                String(Number(m["price"]) - paid),
                              );
                              if (!amount) return;
                              const method = prompt(
                                "Payment method (Cash, Revolut, Satispay, Other)",
                                "Cash",
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
                                  category: "Membership",
                                });
                                refresh();
                              } catch (e) {
                                toast["error"](String(e));
                              }
                            }}
                          >
                            Record payment
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
                            const delta = prompt("Visit correction (+1 or -1, for example)");
                            if (
                              !delta ||
                              !Number["isInteger"](Number(delta)) ||
                              Number(delta) === 0
                            )
                              return;
                            const reason = prompt("Reason for this correction (required)");
                            if (!reason?.["trim"]()) return;
                            if (balance + Number(delta) < 0) {
                              toast["error"]("Visits cannot be negative.");
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
                          Correct visits
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3 className="section-heading mt-6">Visit audit trail</h3>
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
            title="Room for a regular practice"
            description="No memberships sold yet."
          >
            <Button variant="outline" onClick={() => setKind("purchase")}>
              <Plus />
              Sell your first membership
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
  const [tab, setTab] = useState("Income");
  const [filter, setFilter] = useState("All");
  const [kind, setKind] = useState<"payment" | "expense" | null>(null);
  const [edit, setEdit] = useState<Row | undefined>();
  const [booking, setBooking] = useState<Row | undefined>();
  const fin = db?.["finance"](month, filter) || { income: 0, expenses: 0, profit: 0, payments: 0 };
  const rows =
    db?.["rows"](
      `SELECT * FROM ${tab === "Expenses" ? "expenses" : "payments"} WHERE substr(date,1,7)=? ORDER BY date DESC`,
      [month],
    ) || [];
  const unpaid = (db?.["bookings"]() || [])["filter"](
    (b) =>
      !b["membership_id"] &&
      Number(b["paid"]) < Number(b["amount"]) &&
      String(b["date"])["slice"](0, 7) === month &&
      (filter === "All" || b["type"] === filter),
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
        t === "payments" ? "Income" : "Expenses",
      );
    XLSX["utils"]["book_append_sheet"](
      wb,
      XLSX["utils"]["json_to_sheet"]([{ month, ...fin }]),
      "Summary",
    );
    XLSX["writeFile"](wb, `VONA-finance-${month}.xlsx`);
  }
  return (
    <>
      <Header
        eyebrow="Mindful business"
        title="Finance"
        subtitle="A clear picture of what comes in, and what goes out."
      >
        <Button
          variant="outline"
          onClick={() => {
            setEdit(undefined);
            setKind("expense");
          }}
        >
          <Plus />
          Add expense
        </Button>
        <Button
          onClick={() => {
            setEdit(undefined);
            setBooking(undefined);
            setKind("payment");
          }}
        >
          <Plus />
          Register payment
        </Button>
      </Header>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <input
            aria-label="Finance month"
            type="month"
            min="2026-10"
            className="studio-input max-w-44"
            value={month}
            onChange={(e) => e["target"]["value"] >= "2026-10" && setMonth(e["target"]["value"])}
          />
          <select
            aria-label="Finance class filter"
            value={filter}
            onChange={(e) => setFilter(e["target"]["value"])}
            className="studio-input max-w-36"
          >
            <option>All</option>
            <option>Yoga</option>
            <option>Stretching</option>
          </select>
        </div>
        <Button variant="outline" onClick={exportFinance}>
          <Download />
          Export report
        </Button>
      </div>
      {filter !== "All" && (
        <p className="mb-5 text-xs text-muted-foreground">
          Class filters include linked single-visit payments only. Membership income and shared
          expenses remain in All.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric
          label="Received income"
          value={euro(fin["income"])}
          detail={`${fin["payments"]} payments received`}
          icon={ArrowDownLeft}
        />
        <Metric
          label="Expenses"
          value={euro(fin["expenses"])}
          detail="Actual studio costs"
          icon={Wallet}
        />
        <Metric
          label="Net profit"
          value={euro(fin["profit"])}
          detail="Income minus expenses"
          icon={CircleDollarSign}
          tone="success"
        />
        <Metric
          label="Unpaid bookings"
          value={unpaid["length"]}
          detail={`${euro(unpaid["reduce"]((n, b) => n + Number(b["amount"]) - Number(b["paid"]), 0))} outstanding`}
          icon={Ticket}
        />
      </div>
      <section className="panel mt-8">
        <div className="flex justify-between items-center">
          <h2 className="section-heading">The year in balance</h2>
          <span className="text-xs text-muted-foreground">{month["slice"](0, 4)}</span>
        </div>
        <div className="mt-5">
          <YearChart year={Number(month["slice"](0, 4))} />
        </div>
      </section>
      <section className="panel mt-8">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-2">
            {["Income", "Expenses", "Unpaid"]["map"]((t) => (
              <Button key={t} variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)}>
                {t}
              </Button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground self-center">
            {months[Number(month["slice"](5, 7)) - 1]} {month["slice"](0, 4)}
          </span>
        </div>
        {tab === "Unpaid" ? (
          unpaid["length"] ? (
            <div className="overflow-x-auto mt-4">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Due</th>
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
                          Register payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Check} title="No unpaid bookings this month" />
          )
        ) : rows["length"] ? (
          <div className="overflow-x-auto mt-4">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Amount</th>
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
                        title="Edit transaction"
                        onClick={() => {
                          setEdit(r);
                          setBooking(undefined);
                          setKind(tab === "Expenses" ? "expense" : "payment");
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete transaction"
                        onClick={async () => {
                          if (
                            !db ||
                            !confirm("Delete this transaction? Financial totals will change.")
                          )
                            return;
                          await db["run"](
                            `DELETE FROM ${tab === "Expenses" ? "expenses" : "payments"} WHERE id=?`,
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
            title={`No ${tab["toLowerCase"]()} recorded yet`}
            description="A fresh ledger. Only your real transactions appear here."
          />
        )}
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Classes held"
          value={
            db?.["value"](
              "SELECT count(*) FROM classes WHERE substr(date,1,7)=? AND date<=? AND status<>'Cancelled'",
              [month, romeToday()],
            ) || 0
          }
          detail="Scheduled, not cancelled"
          icon={CalendarDays}
        />
        <Metric
          label="Student visits"
          value={
            db?.["value"](
              "SELECT count(*) FROM attendance a JOIN bookings b ON b.id=a.booking_id JOIN classes c ON c.id=b.class_id WHERE a.status='Present' AND substr(c.date,1,7)=?",
              [month],
            ) || 0
          }
          detail="Present attendance"
          icon={Users}
        />
        <Metric
          label="Memberships sold"
          value={
            db?.["value"]("SELECT count(*) FROM memberships WHERE substr(purchased,1,7)=?", [
              month,
            ]) || 0
          }
          detail="Purchased this month"
          icon={Ticket}
        />
        <Metric
          label="Payments received"
          value={fin["payments"]}
          detail="Actual received income"
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
  if (!db) return <p>Opening your class…</p>;
  if (!c) return <Empty title="Class not found" />;
  const bookings = db["bookings"](id);
  const active = student ? db["activeMembership"](student, String(c["date"])) : undefined;
  async function book(e: React.FormEvent) {
    e["preventDefault"]();
    if (!db || !place) return;
    try {
      await db["book"](id, student, place, payment);
      refresh();
      setPlace(null);
      toast["success"]("Student booked.");
    } catch (e) {
      toast["error"](
        String(e)["includes"]("UNIQUE")
          ? "This student is already booked or this place is occupied."
          : String(e),
      );
    }
  }
  return (
    <>
      <Button variant="link" className="mb-4 h-auto p-0 text-xs" asChild>
        <Link to="/calendar">
          <ChevronLeft />
          Back to calendar
        </Link>
      </Button>
      <Header
        eyebrow={String(c["type"]) + " · " + dateLabel(String(c["date"]))}
        title={String(c["name"])}
        subtitle={`${c["start"]}–${c["end"]} · ${c["location"] || "VONA Studio"} · ${bookings["length"]}/${c["capacity"]} places booked`}
      >
        <Button variant="outline" onClick={() => setEdit(true)}>
          <Pencil />
          Edit class
        </Button>
        <Button
          variant="outline"
          disabled={c["status"] === "Cancelled"}
          onClick={async () => {
            if (
              !confirm(
                "Cancel this class? Bookings and payments are preserved; membership visits will be restored.",
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
          Cancel class
        </Button>
      </Header>
      {c["status"] === "Cancelled" && (
        <p className="mb-5 tag warning">Class cancelled · historical records preserved</p>
      )}
      {bookings["length"] >= Number(c["capacity"]) && (
        <p className="mb-5 tag warning">This class is full</p>
      )}
      <div className="overflow-x-auto">
        <table className="studio-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Student</th>
              <th>Payment type</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Attendance</th>
              <th>Notes</th>
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
                            <span className="tag">Membership</span>
                            <p className="mt-1 text-[10px]">
                              {db["balance"](String(b["membership_id"]))} visits left
                            </p>
                          </>
                        ) : (
                          "Single visit"
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
                            Membership{" "}
                            {db["value"](
                              "SELECT COALESCE(sum(amount),0) FROM payments WHERE membership_id=?",
                              [String(b["membership_id"])],
                            ) >=
                            db["value"]("SELECT price FROM memberships WHERE id=?", [
                              String(b["membership_id"]),
                            ])
                              ? "paid"
                              : "unpaid"}
                          </span>
                        ) : Number(b["paid"]) >= Number(b["amount"]) ? (
                          <span className="tag success">Paid</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setPayBooking(b)}>
                            {Number(b["paid"]) > 0 ? "Partially paid" : "Unpaid"}
                          </Button>
                        )}
                      </td>
                      <td>
                        <select
                          className="studio-input min-w-24"
                          aria-label={`Attendance for ${b["name"]}`}
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
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          aria-label={`Notes for ${b["name"]}`}
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
                          title="Move booking"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const targets = db["rows"](
                              "SELECT * FROM classes WHERE id<>? AND status<>'Cancelled' ORDER BY date,start",
                              [id],
                            );
                            const target = prompt(
                              "Enter destination class number:\n" +
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
                              toast["error"]("Destination class is full.");
                              return;
                            }
                            if (b["status"] === "Present") {
                              toast["error"]("Reverse attendance before moving this booking.");
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
                              toast["error"]("Student already booked at destination.");
                            }
                          }}
                        >
                          <ArrowUpRight />
                        </Button>
                        <Button
                          title="Remove booking"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (
                              !confirm(
                                "Remove this booking? Payment and membership history will be retained.",
                              )
                            )
                              return;
                            try {
                              await db.removeBooking(String(b['id']));
                              refresh();
                              toast["success"]("Booking cancelled; history retained.");
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
                          Add student
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
            <DialogTitle className="font-display text-3xl">Book place {place}</DialogTitle>
            <DialogDescription>
              {c["name"]} · {c["date"]}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={book} className="space-y-4">
            <Field label="Student">
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
                <option value="">Select an existing student</option>
                {db["rows"]("SELECT * FROM students WHERE status='Active' ORDER BY name")["map"](
                  (s) => (
                    <option key={String(s["id"])} value={String(s["id"])}>
                      {s["name"]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Payment type">
              <select value={payment} onChange={(e) => setPayment(e["target"]["value"])}>
                {active && (
                  <option value="membership">
                    {active["name"]} · {db["balance"](String(active["id"]))} visits left
                  </option>
                )}
                <option value={db["settings"]()["single10"]}>
                  Single visit · {euro(Number(db["settings"]()["single10"]))}
                </option>
                <option value={db["settings"]()["single15"]}>
                  Single visit · {euro(Number(db["settings"]()["single15"]))}
                </option>
                {![db["settings"]()["single10"], db["settings"]()["single15"]]["includes"](
                  String(c["price"]),
                ) && (
                  <option value={String(c["price"])}>
                    Class price · {euro(Number(c["price"]))}
                  </option>
                )}
              </select>
            </Field>
            <Button type="submit" className="w-full">
              <Plus />
              Book student
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
  if (!db) return <p>Opening settings…</p>;
  const s = db["settings"]();
  async function backup() {
    if (!db) return;
    const bytes = db["db"]["export"]();
    if (window["vonaDesktop"]) await window["vonaDesktop"]["backup"](Array["from"](bytes));
    else download(bytes, "VONA-Studio-" + romeToday() + ".sqlite");
    toast["success"]("Database backup exported.");
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
    if (!confirm("Restore this backup? Current data will be backed up first, then replaced."))
      return;
    setRestoring(true);
    try {
      await restoreStudio(db, bytes);
      refresh();
      toast["success"]("Studio restored.");
    } catch (e) {
      toast["error"]("Restore failed: " + String(e));
    } finally {
      setRestoring(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="A studio that feels like you"
        title="Settings & backups"
        subtitle="Your preferences. Your data. Always yours."
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
            toast["success"]("Settings saved. Historical records are unchanged.");
          } catch (e) {
            toast["error"](String(e));
          }
        }}
      >
        <section className="panel">
          <h2 className="section-heading">Studio preferences</h2>
          <div className="mt-6 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Field label="Studio name">
              <input required name="studio_name" defaultValue={s["studio_name"]} />
            </Field>
            <Field label="Timezone">
              <input value="Europe/Rome" readOnly />
            </Field>
            <Field label="Default class duration (minutes)">
              <input type="number" min="1" name="duration" defaultValue={s["duration"]} />
            </Field>
            <Field label="Default student places">
              <input type="number" min="1" max="100" name="capacity" defaultValue={s["capacity"]} />
            </Field>
            <Field label="Single visit · price 1 (€)">
              <input
                name="single10"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s["single10"]}
              />
            </Field>
            <Field label="Single visit · price 2 (€)">
              <input
                name="single15"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s["single15"]}
              />
            </Field>
            <Field label="Payment methods (comma separated)">
              <input required name="methods" defaultValue={s["methods"]} />
            </Field>
            <Field label="Class types (comma separated)">
              <input required name="class_types" defaultValue={s["class_types"]} />
            </Field>
          </div>
          <Button type="submit" className="mt-6">
            <Check />
            Save preferences
          </Button>
        </section>
      </form>
      <section className="panel mt-9">
        <h2 className="section-heading">Backups & data</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          All records stay on this device. Keep a backup somewhere safe.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={backup}>
            <Download />
            Back up full database
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
            {restoring ? "Restoring…" : "Restore backup"}
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
            Students CSV
          </Button>
          <Button variant="outline" onClick={() => csv("attendance")}>
            <Download />
            Attendance CSV
          </Button>
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">
          SQLite database · Schema version 1 · No account required
        </p>
      </section>
      <section className="panel mt-9">
        <h2 className="section-heading">Expense categories</h2>
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
            const category = prompt("New expense category");
            if (!category?.["trim"]()) return;
            try {
              await db["run"]("INSERT INTO expense_categories VALUES(?)", [category["trim"]()]);
              refresh();
            } catch (e) {
              toast["error"]("This category already exists.");
            }
          }}
        >
          <Plus />
          Add category
        </Button>
      </section>
      <section className="panel mt-9">
        <h2 className="section-heading">Membership pricing</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Changes apply to future purchases only.
        </p>
        <Button variant="link" asChild className="mt-2 px-0">
          <Link to="/memberships">
            Manage membership types <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </>
  );
}
