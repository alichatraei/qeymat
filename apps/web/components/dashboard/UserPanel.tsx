"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Crown,
  KeyRound,
  LifeBuoy,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Receipt,
  User as UserIcon,
} from "lucide-react";
import { fa, getAnyPlan, jalali, timeAgo } from "@qeymat/shared";
import PushToggle from "@/components/pwa/PushToggle";
import AlertsManager from "./AlertsManager";
import type { SessionUser, TicketView } from "@/lib/types";

type Order = {
  id: string;
  kind: string;
  plan: string;
  amountRial: number;
  status: string;
  refId: string | null;
  createdAt: string;
};

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "در انتظار پرداخت", className: "state-pending" },
  PAID: { label: "پرداخت‌شده", className: "state-approved" },
  FAILED: { label: "ناموفق", className: "state-rejected" },
  CANCELLED: { label: "لغو‌شده", className: "chip bg-soft text-sub" },
  REFUNDED: { label: "بازگشت‌خورده", className: "chip bg-soft text-sub" },
};

const TICKET_STATUS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "در انتظار پاسخ", className: "state-pending" },
  ANSWERED: { label: "پاسخ داده شد", className: "state-approved" },
  CLOSED: { label: "بسته", className: "chip bg-soft text-sub" },
};

/** روزهای باقی‌مانده تا تاریخ انقضا */
function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

export default function UserPanel({
  user,
  profile,
  plus,
  apiSub,
  orders,
  tickets: initialTickets,
}: {
  user: SessionUser;
  profile: { phone: string | null; email: string | null; createdAt: string };
  plus: { plan: string; startsAt: string; expiresAt: string } | null;
  apiSub: { plan: string; requestLimit: number; requestsUsed: number; expiresAt: string } | null;
  orders: Order[];
  tickets: TicketView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "alerts" | "orders" | "tickets">("overview");

  // لینک مستقیم به بخش هشدارها: /panel#alerts
  useEffect(() => {
    if (window.location.hash === "#alerts") setTab("alerts");
  }, []);
  const [tickets] = useState(initialTickets);
  const [composing, setComposing] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const plusPlan = plus ? getAnyPlan(plus.plan) : null;
  const apiPlan = apiSub ? getAnyPlan(apiSub.plan) : null;
  const openTickets = tickets.filter((ticket) => ticket.status !== "CLOSED").length;

  return (
    <main className="pb-20 pt-10">
      <div className="content-width grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-soft text-green-dark">
                <UserIcon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <strong className="truncate text-[13px]">{user.name}</strong>
                <small dir="ltr" className="truncate text-[10.5px] text-muted">
                  {profile.phone ?? profile.email ?? "—"}
                </small>
              </span>
            </div>

            {plus ? (
              <span className="mt-4 flex items-center justify-center gap-1.5 rounded-pill bg-amber-soft py-2 text-[11px] font-bold text-amber-ink">
                <Crown className="h-3.5 w-3.5" />
                عضو قیمت پلاس
              </span>
            ) : (
              <Link href="/plus" className="btn-solid mt-4 h-10 min-h-0 w-full text-[11.5px]">
                <Crown />
                ارتقا به پلاس
              </Link>
            )}

            <nav className="mt-4 space-y-1 border-t border-line pt-4 text-[12px] font-semibold">
              {(
                [
                  { id: "overview", label: "خلاصه حساب", icon: UserIcon },
                  { id: "alerts", label: "هشدارهای قیمت", icon: Bell },
                  { id: "orders", label: "سفارش‌ها و پرداخت", icon: Receipt },
                  { id: "tickets", label: "پشتیبانی", icon: LifeBuoy, badge: openTickets },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2.5 text-right transition-colors ${
                    tab === item.id ? "bg-green-soft text-green-dark" : "text-sub hover:bg-soft"
                  }`}
                >
                  <item.icon className="h-[15px] w-[15px] shrink-0" />
                  {item.label}
                  {"badge" in item && item.badge ? (
                    <b className="tabular mr-auto rounded-pill bg-green px-1.5 py-0.5 text-[10px] text-white">
                      {fa(item.badge)}
                    </b>
                  ) : null}
                </button>
              ))}

              {apiSub ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-[10px] px-2.5 py-2.5 text-sub hover:bg-soft"
                >
                  <KeyRound className="h-[15px] w-[15px]" />
                  پنل توسعه‌دهنده
                </Link>
              ) : null}

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2.5 text-right text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-[15px] w-[15px]" />
                خروج
              </button>
            </nav>
          </div>

          <div className="card mt-4 p-5">
            <strong className="text-[12.5px]">اعلان قیمت</strong>
            <p className="mb-3 mt-1.5 text-[11px] leading-5 text-muted">
              وقتی نرخ به عدد دلخواهتان رسید خبردار شوید.
            </p>
            <PushToggle compact />
          </div>
        </aside>

        <div className="min-w-0">
          <div>
            <span className="text-[11.5px] font-bold text-green-dark">پنل کاربری</span>
            <h1 className="mt-1.5 text-[26px] font-extrabold tracking-[-.8px]">
              سلام {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 text-[12px] text-muted">
              عضو از {jalali(profile.createdAt)}
            </p>
          </div>

          {tab === "overview" ? (
            <div className="mt-6 space-y-5">
              {/* قیمت پلاس */}
              <section className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-soft text-amber-ink">
                      <Crown className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-[16px] font-bold">قیمت پلاس</h2>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        دسترسی به نفت، سهام جهانی و شاخص‌ها
                      </p>
                    </div>
                  </div>
                  <span className={plus ? "state-approved" : "chip bg-soft text-sub"}>
                    {plus ? "فعال" : "غیرفعال"}
                  </span>
                </div>

                {plus ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Cell label="پلن" value={plusPlan?.label ?? plus.plan} />
                      <Cell label="تاریخ انقضا" value={jalali(plus.expiresAt)} />
                      <Cell
                        label="باقی‌مانده"
                        value={`${fa(daysLeft(plus.expiresAt))} روز`}
                        tone={daysLeft(plus.expiresAt) <= 7 ? "danger" : "normal"}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-pill bg-tab">
                        <div
                          className={`h-full rounded-pill ${
                            daysLeft(plus.expiresAt) <= 7 ? "bg-danger" : "bg-green"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (daysLeft(plus.expiresAt) /
                                  Math.max(
                                    1,
                                    Math.ceil(
                                      (new Date(plus.expiresAt).getTime() -
                                        new Date(plus.startsAt).getTime()) /
                                        86400000,
                                    ),
                                  )) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Link href="/plus" className="btn-ghost mt-4">
                      تمدید اشتراک
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-[12.5px] leading-7 text-muted">
                      با پلاس، نرخ نفت برنت و WTI، طلا و نقره‌ی جهانی، سهام اپل و تسلا و انویدیا و
                      شاخص‌های S&amp;P 500 و نزدک برایتان باز می‌شود.
                    </p>
                    <Link href="/plus" className="btn-solid mt-4">
                      <Crown />
                      مشاهده پلن‌ها
                    </Link>
                  </>
                )}
              </section>

              {/* وب‌سرویس */}
              {apiSub ? (
                <section className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-bold">وب‌سرویس API</h2>
                      <p className="mt-1 text-[11.5px] text-muted">
                        پلن {apiPlan?.label ?? apiSub.plan} — تا {jalali(apiSub.expiresAt)}
                      </p>
                    </div>
                    <Link href="/dashboard" className="btn-ghost h-10 min-h-0">
                      <KeyRound />
                      مدیریت کلید
                    </Link>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <b>
                        {fa(apiSub.requestsUsed)} از {fa(apiSub.requestLimit)} درخواست
                      </b>
                      <small className="text-muted">
                        {fa(apiSub.requestLimit - apiSub.requestsUsed)} باقی‌مانده
                      </small>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-pill bg-tab">
                      <div
                        className="h-full rounded-pill bg-green"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((apiSub.requestsUsed / apiSub.requestLimit) * 100),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="card p-6">
                <h2 className="text-[16px] font-bold">اطلاعات حساب</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Cell label="شماره موبایل" value={profile.phone ?? "ثبت نشده"} ltr />
                  <Cell label="ایمیل" value={profile.email ?? "ثبت نشده"} ltr />
                </div>
              </section>
            </div>
          ) : null}

          {tab === "alerts" ? <AlertsManager /> : null}

          {tab === "orders" ? (
            <section className="card mt-6 p-6">
              <h2 className="text-[16px] font-bold">سفارش‌ها و پرداخت‌ها</h2>
              <p className="mt-1 text-[11.5px] text-muted">همه‌ی تراکنش‌های شما از درگاه زرین‌پال.</p>

              {orders.length ? (
                <div className="table-scroll mt-5">
                  <table className="w-full min-w-[640px] text-right text-[12px]">
                    <thead className="text-xxs text-muted">
                      <tr>
                        <th className="pb-3 font-semibold">محصول</th>
                        <th className="pb-3 font-semibold">مبلغ</th>
                        <th className="pb-3 font-semibold">تاریخ</th>
                        <th className="pb-3 font-semibold">پیگیری</th>
                        <th className="pb-3 font-semibold">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const plan = getAnyPlan(order.plan);
                        const state = ORDER_STATUS[order.status] ?? ORDER_STATUS.PENDING;
                        return (
                          <tr key={order.id} className="border-t border-line">
                            <td className="py-3.5">
                              <b className="block text-[12px]">
                                {order.kind === "PLUS_PLAN" ? "قیمت پلاس" : "وب‌سرویس API"}
                              </b>
                              <small className="text-[10.5px] text-muted">
                                {plan?.label ?? order.plan}
                              </small>
                            </td>
                            <td className="tabular py-3.5">
                              {fa(Math.round(order.amountRial / 10))}{" "}
                              <small className="text-muted">تومان</small>
                            </td>
                            <td className="py-3.5 text-muted">{jalali(order.createdAt)}</td>
                            <td className="py-3.5">
                              {order.refId ? (
                                <code dir="ltr" className="font-mono text-[10.5px]">
                                  {order.refId}
                                </code>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="py-3.5">
                              <span className={state.className}>{state.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="هنوز سفارشی ثبت نکرده‌اید." />
              )}
            </section>
          ) : null}

          {tab === "tickets" ? (
            <section className="card mt-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold">پشتیبانی</h2>
                  <p className="mt-1 text-[11.5px] text-muted">
                    سؤال یا مشکلی دارید؟ تیکت بزنید، معمولاً کمتر از یک روز کاری پاسخ می‌گیرید.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-solid h-10 min-h-0"
                  onClick={() => setComposing((value) => !value)}
                >
                  <Plus />
                  تیکت تازه
                </button>
              </div>

              {composing ? <NewTicket onDone={() => router.refresh()} /> : null}

              {tickets.length ? (
                <div className="mt-5 space-y-2">
                  {tickets.map((ticket) => {
                    const state = TICKET_STATUS[ticket.status] ?? TICKET_STATUS.OPEN;
                    return (
                      <Link
                        key={ticket.id}
                        href={`/panel/tickets/${ticket.id}`}
                        className="flex items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-line-strong hover:bg-hover"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-sub">
                          <MessageSquare className="h-4 w-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="truncate text-[12.5px]">{ticket.subject}</b>
                          <small className="text-[10.5px] text-muted">
                            {ticket.category} · آخرین پیام {timeAgo(ticket.lastReplyAt)}
                          </small>
                        </span>
                        <span className={state.className}>{state.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Empty text="هنوز تیکتی ثبت نکرده‌اید." />
              )}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Cell({
  label,
  value,
  ltr,
  tone = "normal",
}: {
  label: string;
  value: string;
  ltr?: boolean;
  tone?: "normal" | "danger";
}) {
  return (
    <div className="rounded-xl border border-line bg-field p-3.5">
      <span className="block text-2xs text-muted">{label}</span>
      <strong
        dir={ltr ? "ltr" : undefined}
        className={`mt-1.5 block text-[13px] ${ltr ? "text-right" : ""} ${
          tone === "danger" ? "text-danger" : ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-5 rounded-xl border border-dashed border-line py-12 text-center text-[12px] text-muted">
      {text}
    </p>
  );
}

function NewTicket({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ subject: "", category: "عمومی", priority: "NORMAL", body: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);
      setForm({ subject: "", category: "عمومی", priority: "NORMAL", body: "" });
      onDone();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ثبت تیکت انجام نشد.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-field p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_150px_130px]">
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">موضوع</span>
          <input
            className="field"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">دسته</span>
          <select
            className="field"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            <option>عمومی</option>
            <option>پرداخت</option>
            <option>اشتراک پلاس</option>
            <option>وب‌سرویس API</option>
            <option>گزارش خطا</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">اولویت</span>
          <select
            className="field"
            value={form.priority}
            onChange={(event) => setForm({ ...form, priority: event.target.value })}
          >
            <option value="LOW">کم</option>
            <option value="NORMAL">عادی</option>
            <option value="HIGH">زیاد</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xxs text-sub">شرح</span>
        <textarea
          className="field h-28 resize-none py-2.5"
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
          placeholder="هرچه بیشتر توضیح بدهید، سریع‌تر حل می‌شود."
        />
      </label>

      {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}

      <button
        type="button"
        className="btn-solid mt-4"
        onClick={submit}
        disabled={sending || form.subject.trim().length < 3 || form.body.trim().length < 5}
      >
        {sending ? <Loader2 className="animate-spin" /> : null}
        ارسال تیکت
      </button>
    </div>
  );
}
