"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  Clock,
  Crown,
  Globe,
  Loader2,
  Radio,
  RefreshCw,
  Rocket,
  ShoppingBag,
  LifeBuoy,
  LogOut,
  Receipt,
  Smartphone,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { fa, getAnyPlan, getPlan, jalali, timeAgo } from "@qeymat/shared";
import Brand from "@/components/layout/Brand";
import type { SessionUser } from "@/lib/types";
import {
  AppLinksPanel,
  PaymentSettingsPanel,
  PricingPanel,
  ReceiptsPanel,
  type AppLinksValue,
  type PaymentSettings,
  type PricingRow,
  type ReceiptRow,
} from "./PaymentAdmin";

type Payment = {
  id: string;
  user: string;
  email: string;
  plan: string;
  amountUsdt: number;
  txHash: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type Source = {
  key: string;
  title: string;
  adapter: string;
  status: "ONLINE" | "SLOW" | "DOWN";
  isActive: boolean;
  intervalSec: number;
  lastFetchedAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
};

type Order = {
  id: string;
  product: string;
  fullName: string;
  contact: string;
  note: string | null;
  amountToma: number;
  status: "NEW" | "PAID" | "DELIVERED" | "CANCELLED";
  createdAt: string;
};

type GatewayOrderRow = {
  id: string;
  user: string;
  contact: string;
  kind: string;
  plan: string;
  amountToman: number;
  status: string;
  refId: string | null;
  failReason: string | null;
  createdAt: string;
};

type TicketRow = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  user: string;
  contact: string;
  lastReplyAt: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  lastSeenAt: string | null;
};

const SECTIONS = [
  { id: "receipts", label: "فیش‌های کارت‌به‌کارت", icon: Wallet, group: "مدیریت" },
  { id: "gateway", label: "پرداخت‌های درگاه", icon: Receipt, group: "مدیریت" },
  { id: "tickets", label: "تیکت‌ها", icon: LifeBuoy, group: "مدیریت" },
  { id: "payments", label: "پرداخت تتری (قدیمی)", icon: BarChart3, group: "مدیریت" },
  { id: "orders", label: "سفارش هوش مصنوعی", icon: ShoppingBag, group: "مدیریت" },
  { id: "users", label: "کاربران", icon: Users, group: "مدیریت" },
  { id: "sources", label: "منابع نرخ", icon: Globe, group: "سامانه" },
  { id: "broadcast", label: "اعلان همگانی", icon: Radio, group: "سامانه" },
  { id: "pricing", label: "قیمت پلن‌ها", icon: Crown, group: "سامانه" },
  { id: "paymentSettings", label: "تنظیمات پرداخت", icon: Wallet, group: "سامانه" },
  { id: "appLinks", label: "اپ موبایل", icon: Smartphone, group: "سامانه" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const ORDER_LABEL = { NEW: "جدید", PAID: "پرداخت‌شده", DELIVERED: "تحویل‌شده", CANCELLED: "لغو" };

export default function AdminBoard({
  admin,
  stats,
  payments: initialPayments,
  sources,
  orders: initialOrders,
  users,
  gatewayOrders,
  tickets,
  receipts,
  paymentSettings,
  pricing,
  appLinks,
}: {
  admin: SessionUser;
  stats: {
    userCount: number;
    activeSubs: number;
    pending: number;
    todayUsage: number;
    subscribers: number;
    plusCount: number;
    openTickets: number;
    monthRevenueToman: number;
  };
  payments: Payment[];
  sources: Source[];
  orders: Order[];
  users: UserRow[];
  gatewayOrders: GatewayOrderRow[];
  tickets: TicketRow[];
  receipts: ReceiptRow[];
  paymentSettings: PaymentSettings;
  pricing: PricingRow[];
  appLinks: AppLinksValue;
}) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  const pendingReceipts = receipts.filter((receipt) => receipt.status === "PENDING").length;
  // با فیش در انتظار، پنل مستقیم روی صف بررسی باز می‌شود
  const [section, setSection] = useState<SectionId>(pendingReceipts ? "receipts" : "gateway");
  const [payments, setPayments] = useState(initialPayments);
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2600);
  };

  const reviewPayment = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);

      setPayments((current) =>
        current.map((payment) => (payment.id === id ? { ...payment, status: payload.status } : payment)),
      );
      flash(action === "approve" ? "پرداخت تأیید و کلید API صادر شد." : "پرداخت رد شد.");
      router.refresh();
    } catch (error) {
      flash(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setBusy("");
    }
  };

  const updateOrder = async (id: string, status: Order["status"]) => {
    setBusy(id);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error();
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
      flash("وضعیت سفارش به‌روز شد.");
    } catch {
      flash("به‌روزرسانی سفارش انجام نشد.");
    } finally {
      setBusy("");
    }
  };

  const runSource = async (key?: string) => {
    setBusy(key ?? "all");
    try {
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) throw new Error();
      flash("اجرای منبع انجام شد.");
      router.refresh();
    } catch {
      flash("سرویس کرالر پاسخ نداد.");
    } finally {
      setBusy("");
    }
  };

  const pendingCount = payments.filter((payment) => payment.status === "PENDING").length;

  return (
    <div className="flex min-h-screen" dir="rtl">
      <aside className="hidden w-[240px] shrink-0 flex-col border-l border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <Brand sub="پنل مدیریت" />
        </div>
        <nav className="flex-1 space-y-4 p-4">
          {["مدیریت", "سامانه"].map((group) => (
            <div key={group}>
              <small className="mb-1.5 block px-2 text-2xs font-semibold text-faint">{group}</small>
              {SECTIONS.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-right text-[12px] font-semibold transition-colors ${
                    section === item.id ? "bg-green-soft text-green-dark" : "text-sub hover:bg-soft"
                  }`}
                >
                  <item.icon className="h-[15px] w-[15px] shrink-0" />
                  {item.label}
                  {item.id === "tickets" && stats.openTickets ? (
                    <b className="tabular mr-auto rounded-pill bg-green px-1.5 py-0.5 text-[10px] text-white">
                      {fa(stats.openTickets)}
                    </b>
                  ) : null}
                  {item.id === "receipts" && pendingReceipts ? (
                    <b className="tabular mr-auto rounded-pill bg-amber px-1.5 py-0.5 text-[10px] text-white">
                      {fa(pendingReceipts)}
                    </b>
                  ) : null}
                  {item.id === "payments" && pendingCount ? (
                    <b className="tabular mr-auto rounded-pill bg-green px-1.5 py-0.5 text-[10px] text-white">
                      {fa(pendingCount)}
                    </b>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-4">
          <Link href="/" className="btn-ghost w-full">
            <ChevronLeft />
            بازگشت به سایت
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] px-2.5 py-2.5 text-[12px] font-semibold text-danger hover:bg-danger-soft"
          >
            <LogOut className="h-[15px] w-[15px]" />
            خروج
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-6 py-4">
          <div>
            <h1 className="text-[19px] font-extrabold tracking-[-.5px]">
              {SECTIONS.find((item) => item.id === section)?.label}
            </h1>
            <p className="mt-0.5 text-[11.5px] text-muted">{jalali()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11.5px] text-muted sm:block">{admin.email ?? admin.phone}</span>
            <button type="button" className="btn-ghost" onClick={() => runSource()} disabled={busy === "all"}>
              {busy === "all" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              اجرای همه منابع
            </button>
            {/* در صفحه‌ی بزرگ دکمه‌ی خروج پایین نوار کناری است */}
            <button type="button" className="btn-ghost text-danger lg:hidden" onClick={logout} aria-label="خروج">
              <LogOut />
            </button>
          </div>
        </header>

        {/* نوار بخش‌ها برای موبایل؛ نوار کناری فقط در صفحه‌ی بزرگ دیده می‌شود */}
        <nav className="table-scroll border-b border-line bg-surface lg:hidden" aria-label="بخش‌های پنل">
          <div className="flex gap-2 px-4 py-3">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-2 text-[11.5px] font-semibold ${
                  section === item.id ? "border-green bg-green-soft text-green-dark" : "border-line text-sub"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
                {item.id === "receipts" && pendingReceipts ? (
                  <b className="tabular rounded-pill bg-amber px-1.5 text-[10px] text-white">{fa(pendingReceipts)}</b>
                ) : null}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat icon={Wallet} tone="bg-green-soft text-green-dark" label="درآمد این ماه" value={`${fa(stats.monthRevenueToman)}`} note="تومان، تراکنش‌های موفق" />
            <Stat icon={Crown} tone="bg-amber-soft text-amber" label="مشترک قیمت پلاس" value={fa(stats.plusCount)} note={`${fa(stats.activeSubs)} اشتراک API فعال`} />
            <Stat icon={Users} tone="bg-blue/10 text-blue" label="کاربران" value={fa(stats.userCount)} note={`${fa(stats.subscribers)} مرورگر مشترک اعلان`} />
            <Stat icon={Activity} tone="bg-purple/10 text-purple" label="درخواست API امروز" value={fa(stats.todayUsage)} note={`${fa(stats.openTickets)} تیکت باز`} />
          </div>

          {section === "receipts" ? <ReceiptsPanel receipts={receipts} onFlash={flash} /> : null}
          {section === "paymentSettings" ? <PaymentSettingsPanel initial={paymentSettings} onFlash={flash} /> : null}
          {section === "pricing" ? <PricingPanel rows={pricing} onFlash={flash} /> : null}
          {section === "appLinks" ? <AppLinksPanel initial={appLinks} onFlash={flash} /> : null}

          {section === "gateway" ? (
            <Panel title="پرداخت‌های درگاه زرین‌پال" note="اشتراک‌ها پس از تأیید درگاه خودکار فعال می‌شوند؛ اینجا فقط گزارش است.">
              <div className="table-scroll">
                <table className="w-full min-w-[860px] text-right text-[12px]">
                  <thead className="text-xxs text-muted">
                    <tr>
                      <th className="pb-3 font-semibold">کاربر</th>
                      <th className="pb-3 font-semibold">محصول</th>
                      <th className="pb-3 font-semibold">مبلغ</th>
                      <th className="pb-3 font-semibold">پیگیری</th>
                      <th className="pb-3 font-semibold">زمان</th>
                      <th className="pb-3 font-semibold">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatewayOrders.map((order) => (
                      <tr key={order.id} className="border-t border-line align-top">
                        <td className="py-3.5">
                          <b className="block text-[12px]">{order.user}</b>
                          <small dir="ltr" className="text-[10px] text-muted">{order.contact}</small>
                        </td>
                        <td className="py-3.5">
                          <b className="block text-[12px]">
                            {order.kind === "PLUS_PLAN" ? "قیمت پلاس" : "وب‌سرویس API"}
                          </b>
                          <small className="text-[10.5px] text-muted">
                            {getAnyPlan(order.plan)?.label ?? order.plan}
                          </small>
                        </td>
                        <td className="tabular py-3.5 font-bold">{fa(order.amountToman)}</td>
                        <td className="py-3.5">
                          {order.refId ? (
                            <code dir="ltr" className="font-mono text-[10.5px]">{order.refId}</code>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3.5 text-muted">{timeAgo(order.createdAt)}</td>
                        <td className="py-3.5">
                          <span
                            className={
                              order.status === "PAID"
                                ? "state-approved"
                                : order.status === "PENDING"
                                  ? "state-pending"
                                  : order.status === "FAILED"
                                    ? "state-rejected"
                                    : "chip bg-soft text-sub"
                            }
                          >
                            {order.status === "PAID"
                              ? "موفق"
                              : order.status === "PENDING"
                                ? "ناتمام"
                                : order.status === "FAILED"
                                  ? "ناموفق"
                                  : "لغو"}
                          </span>
                          {order.failReason ? (
                            <small className="mt-1 block max-w-[22ch] text-[10px] text-muted">
                              {order.failReason}
                            </small>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!gatewayOrders.length ? <Empty text="هنوز پرداختی از درگاه ثبت نشده است." /> : null}
              </div>
            </Panel>
          ) : null}

          {section === "tickets" ? (
            <Panel title="تیکت‌های پشتیبانی" note="برای پاسخ روی هر تیکت بزنید.">
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/panel/tickets/${ticket.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line p-4 transition-colors hover:border-line-strong hover:bg-hover"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        ticket.priority === "HIGH"
                          ? "bg-danger-soft text-danger"
                          : "bg-soft text-sub"
                      }`}
                    >
                      <LifeBuoy className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-[12.5px]">{ticket.subject}</b>
                      <small className="text-[10.5px] text-muted">
                        {ticket.user} · {ticket.category} · {timeAgo(ticket.lastReplyAt)}
                      </small>
                    </span>
                    <span
                      className={
                        ticket.status === "OPEN"
                          ? "state-pending"
                          : ticket.status === "ANSWERED"
                            ? "state-approved"
                            : "chip bg-soft text-sub"
                      }
                    >
                      {ticket.status === "OPEN"
                        ? "در انتظار پاسخ"
                        : ticket.status === "ANSWERED"
                          ? "پاسخ داده شد"
                          : "بسته"}
                    </span>
                  </Link>
                ))}
                {!tickets.length ? <Empty text="تیکتی ثبت نشده است." /> : null}
              </div>
            </Panel>
          ) : null}

          {section === "payments" ? (
            <Panel title="پرداخت‌های اخیر" note="هش‌های ارسال‌شده را بررسی و وضعیت اشتراک را تعیین کنید.">
              <div className="table-scroll">
                <table className="w-full min-w-[820px] text-right text-[12px]">
                  <thead className="text-xxs text-muted">
                    <tr>
                      <th className="pb-3 font-semibold">کاربر</th>
                      <th className="pb-3 font-semibold">پلن</th>
                      <th className="pb-3 font-semibold">مبلغ</th>
                      <th className="pb-3 font-semibold">هش تراکنش</th>
                      <th className="pb-3 font-semibold">زمان</th>
                      <th className="pb-3 font-semibold">وضعیت</th>
                      <th className="pb-3 font-semibold">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-line">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft text-[11px] font-bold">
                              {payment.user.slice(0, 1)}
                            </span>
                            <span className="flex flex-col">
                              <b className="text-[12px]">{payment.user}</b>
                              <small dir="ltr" className="text-[10px] text-muted">{payment.email}</small>
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5">{getPlan(payment.plan)?.label ?? payment.plan}</td>
                        <td className="tabular py-3.5 font-bold">{payment.amountUsdt} USDT</td>
                        <td className="py-3.5">
                          <code dir="ltr" className="font-mono text-[10.5px]">
                            {payment.txHash.slice(0, 10)}…{payment.txHash.slice(-4)}
                          </code>
                        </td>
                        <td className="py-3.5 text-muted">{timeAgo(payment.createdAt)}</td>
                        <td className="py-3.5">
                          <span
                            className={
                              payment.status === "PENDING"
                                ? "state-pending"
                                : payment.status === "APPROVED"
                                  ? "state-approved"
                                  : "state-rejected"
                            }
                          >
                            {payment.status === "PENDING"
                              ? "در انتظار"
                              : payment.status === "APPROVED"
                                ? "تأییدشده"
                                : "ردشده"}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {payment.status === "PENDING" ? (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => reviewPayment(payment.id, "approve")}
                                disabled={busy === payment.id}
                                className="inline-flex items-center gap-1.5 rounded-[9px] bg-green px-2.5 py-2 text-[10.5px] font-bold text-white hover:bg-green-dark disabled:opacity-60"
                              >
                                {busy === payment.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                تأیید و صدور کلید
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewPayment(payment.id, "reject")}
                                disabled={busy === payment.id}
                                className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-danger hover:bg-danger-soft"
                                aria-label="رد پرداخت"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted">بررسی شد</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!payments.length ? <Empty text="هنوز پرداختی ثبت نشده است." /> : null}
              </div>
            </Panel>
          ) : null}

          {section === "orders" ? (
            <Panel title="سفارش‌های اکانت هوش مصنوعی" note="سفارش‌های ثبت‌شده از صفحه خدمات ارزی.">
              <div className="table-scroll">
                <table className="w-full min-w-[760px] text-right text-[12px]">
                  <thead className="text-xxs text-muted">
                    <tr>
                      <th className="pb-3 font-semibold">سرویس</th>
                      <th className="pb-3 font-semibold">مشتری</th>
                      <th className="pb-3 font-semibold">تماس</th>
                      <th className="pb-3 font-semibold">مبلغ</th>
                      <th className="pb-3 font-semibold">زمان</th>
                      <th className="pb-3 font-semibold">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-line align-top">
                        <td className="py-3.5 font-bold">{order.product}</td>
                        <td className="py-3.5">
                          {order.fullName}
                          {order.note ? (
                            <small className="mt-1 block max-w-[26ch] text-[10.5px] text-muted">{order.note}</small>
                          ) : null}
                        </td>
                        <td dir="ltr" className="py-3.5 text-right font-mono text-[11px]">{order.contact}</td>
                        <td className="tabular py-3.5">{order.amountToma ? fa(order.amountToma) : "استعلامی"}</td>
                        <td className="py-3.5 text-muted">{timeAgo(order.createdAt)}</td>
                        <td className="py-3.5">
                          <select
                            className="h-9 rounded-[9px] border border-line bg-surface px-2 text-[11px]"
                            value={order.status}
                            disabled={busy === order.id}
                            onChange={(event) => updateOrder(order.id, event.target.value as Order["status"])}
                          >
                            {Object.entries(ORDER_LABEL).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length ? <Empty text="هنوز سفارشی ثبت نشده است." /> : null}
              </div>
            </Panel>
          ) : null}

          {section === "users" ? (
            <Panel title="کاربران اخیر" note="بیست حساب آخر ثبت‌شده در سامانه.">
              <div className="table-scroll">
                <table className="w-full min-w-[620px] text-right text-[12px]">
                  <thead className="text-xxs text-muted">
                    <tr>
                      <th className="pb-3 font-semibold">کاربر</th>
                      <th className="pb-3 font-semibold">نقش</th>
                      <th className="pb-3 font-semibold">تاریخ ثبت‌نام</th>
                      <th className="pb-3 font-semibold">آخرین ورود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="py-3.5">
                          <b className="block text-[12px]">{item.name}</b>
                          <small dir="ltr" className="text-[10px] text-muted">
                            {item.phone ?? item.email ?? "—"}
                          </small>
                        </td>
                        <td className="py-3.5">
                          <span className={item.role === "ADMIN" ? "state-approved" : "chip bg-soft text-sub"}>
                            {item.role === "ADMIN" ? "مدیر" : "کاربر"}
                          </span>
                        </td>
                        <td className="py-3.5 text-muted">{jalali(item.createdAt)}</td>
                        <td className="py-3.5 text-muted">
                          {item.lastSeenAt ? timeAgo(item.lastSeenAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          {section === "sources" ? (
            <Panel title="سلامت منابع نرخ" note="آخرین دریافت، تأخیر و خطای هر منبع.">
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.key}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line py-3.5 text-[12px] first:border-t-0"
                  >
                    <span className="flex min-w-[150px] items-center gap-2">
                      <i
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          !source.isActive
                            ? "bg-faint/40"
                            : source.status === "ONLINE"
                              ? "bg-green-dot"
                              : source.status === "SLOW"
                                ? "bg-amber"
                                : "bg-danger"
                        }`}
                      />
                      <b>{source.title}</b>
                      <code dir="ltr" className="font-mono text-[10px] text-muted">{source.adapter}</code>
                    </span>
                    <span className="text-muted">
                      {!source.isActive
                        ? "غیرفعال"
                        : source.status === "ONLINE"
                          ? "متصل"
                          : source.status === "SLOW"
                            ? "کند"
                            : "قطع"}
                    </span>
                    <span className="text-muted">
                      {source.lastFetchedAt ? timeAgo(source.lastFetchedAt) : "هنوز اجرا نشده"}
                    </span>
                    <span className="text-muted">هر {fa(source.intervalSec)} ثانیه</span>
                    <span className="tabular text-muted">
                      {source.lastLatencyMs ? `${fa(source.lastLatencyMs)} ms` : "—"}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost mr-auto h-9 min-h-0 px-3 text-[11px]"
                      onClick={() => runSource(source.key)}
                      disabled={busy === source.key}
                    >
                      {busy === source.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      اجرای دستی
                    </button>
                    {source.lastError ? (
                      <p className="w-full rounded-lg bg-danger-soft px-3 py-2 text-[10.5px] text-danger-ink">
                        {source.lastError}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {section === "broadcast" ? <Broadcast onDone={flash} /> : null}
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 animate-toast-in items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[12px] text-white shadow-card">
          <Check className="h-4 w-4 text-green-dot" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Users;
  tone: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3.5 text-xxs text-muted">{label}</p>
      <strong className="tabular mt-1 block text-[18px] font-extrabold tracking-[-.8px] sm:text-[22px]">{value}</strong>
      <small className="mt-1 block text-[11px] text-muted">{note}</small>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="mb-4">
        <h2 className="text-[16px] font-bold">{title}</h2>
        <p className="mt-1 text-[11.5px] text-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-line py-12 text-center text-[12px] text-muted">
      {text}
    </p>
  );
}

function Broadcast({ onDone }: { onDone: (text: string) => void }) {
  const [form, setForm] = useState({ title: "", body: "", url: "/" });
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);
      onDone(`اعلان به ${fa(payload.sent)} مرورگر ارسال شد.`);
      setForm({ title: "", body: "", url: "/" });
    } catch (error) {
      onDone(error instanceof Error ? error.message : "ارسال اعلان انجام نشد.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title="اعلان همگانی" note="پیام کوتاهی به همه‌ی مرورگرهایی که اعلان را روشن کرده‌اند بفرستید.">
      <div className="grid max-w-[560px] gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">عنوان</span>
          <input
            className="field"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="مثلاً: جهش نرخ دلار"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">متن</span>
          <textarea
            className="field h-24 resize-none py-2.5"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xxs text-sub">مقصد کلیک</span>
          <input
            className="field"
            dir="ltr"
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn-solid w-fit"
          onClick={send}
          disabled={sending || form.title.length < 2 || form.body.length < 2}
        >
          {sending ? <Loader2 className="animate-spin" /> : <Bell />}
          ارسال اعلان
        </button>
      </div>
    </Panel>
  );
}
