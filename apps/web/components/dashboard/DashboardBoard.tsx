"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
} from "lucide-react";
import { PLANS, fa, getPlan, jalali } from "@qeymat/shared";
import PushToggle from "@/components/pwa/PushToggle";
import { startCheckout } from "@/lib/checkout";
import type { SessionUser } from "@/lib/types";

type Payment = {
  id: string;
  plan: string;
  amountUsdt: number;
  txHash: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type Order = {
  id: string;
  plan: string;
  amountRial: number;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  refId: string | null;
  createdAt: string;
};

const ORDER_STATUS: Record<Order["status"], { label: string; className: string }> = {
  PENDING: { label: "در انتظار پرداخت", className: "state-pending" },
  PAID: { label: "پرداخت‌شده", className: "state-approved" },
  FAILED: { label: "ناموفق", className: "state-rejected" },
  CANCELLED: { label: "لغوشده", className: "state-rejected" },
  REFUNDED: { label: "بازگشت وجه", className: "state-pending" },
};

const STATUS_LABEL = { PENDING: "در انتظار", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;
const STATUS_CLASS = {
  PENDING: "state-pending",
  APPROVED: "state-approved",
  REJECTED: "state-rejected",
} as const;

export default function DashboardBoard({
  user,
  subscription,
  apiKeyPrefix,
  payments,
  usage,
  orders,
  initialPlan,
}: {
  user: SessionUser;
  subscription: {
    plan: string;
    requestLimit: number;
    requestsUsed: number;
    expiresAt: string;
  } | null;
  apiKeyPrefix: string | null;
  payments: Payment[];
  usage: { endpoint: string; count: number; avgLatency: number }[];
  orders: Order[];
  initialPlan: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const activePlan = subscription ? getPlan(subscription.plan) : null;
  const usedPercent = subscription
    ? Math.min(100, Math.round((subscription.requestsUsed / subscription.requestLimit) * 100))
    : 0;
  const selectedPlan = getPlan(plan) ?? PLANS[1];

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const issueKey = async () => {
    setBusy("key");
    setMessage(null);
    try {
      const response = await fetch("/api/dashboard/key", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);
      setRevealed(payload.key);
      setMessage({ tone: "ok", text: "کلید تازه صادر شد. همین حالا آن را ذخیره کنید." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "bad", text: error instanceof Error ? error.message : "صدور کلید انجام نشد." });
    } finally {
      setBusy("");
    }
  };

  /** پرداخت از زرین‌پال؛ بعد از بازگشت، اشتراک فعال شده است */
  const checkout = async () => {
    setBusy("payment");
    setMessage(null);
    const failure = await startCheckout("API_PLAN", selectedPlan.id, `/dashboard?plan=${selectedPlan.id}`);
    if (failure) {
      setMessage({ tone: "bad", text: failure });
      setBusy("");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <main className="pb-20 pt-10">
      <div className="content-width grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[92px] lg:self-start">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-green-soft text-[15px] font-bold text-green-dark">
                {user.name.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-col">
                <strong className="truncate text-[13px]">{user.name}</strong>
                <small dir="ltr" className="truncate text-[10.5px] text-muted">
                  {user.phone ?? user.email}
                </small>
              </span>
            </div>
            <nav className="mt-4 space-y-1 border-t border-line pt-4 text-[12px] font-semibold">
              <a href="#key" className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sub hover:bg-soft">
                <KeyRound className="h-[15px] w-[15px]" />
                کلید API
              </a>
              <a href="#usage" className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sub hover:bg-soft">
                <BarChart3 className="h-[15px] w-[15px]" />
                گزارش مصرف
              </a>
              <a href="#payments" className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sub hover:bg-soft">
                <FileText className="h-[15px] w-[15px]" />
                پرداخت‌ها
              </a>
              <Link href="/docs" className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sub hover:bg-soft">
                <FileText className="h-[15px] w-[15px]" />
                مستندات
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-right text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-[15px] w-[15px]" />
                خروج
              </button>
            </nav>
          </div>

          <div className="card mt-4 p-5">
            <strong className="text-[12.5px]">اعلان مرورگر</strong>
            <p className="mb-3 mt-1.5 text-[11px] leading-5 text-muted">
              برای فعال‌سازی اشتراک و وضعیت پرداخت اعلان بگیرید.
            </p>
            <PushToggle compact />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11.5px] font-bold text-green-dark">پنل توسعه‌دهنده</span>
              <h1 className="mt-1.5 text-[26px] font-extrabold tracking-[-.8px]">
                سلام {user.name.split(" ")[0]}، خوش آمدی
              </h1>
              <p className="mt-1.5 text-[12px] text-muted">
                اشتراک، مصرف و کلیدهای API را از اینجا مدیریت کن.
              </p>
            </div>
          </div>

          {message ? (
            <div
              className={`mt-5 rounded-xl border p-3.5 text-[12px] ${
                message.tone === "ok"
                  ? "border-green-soft bg-green-soft text-green-dark"
                  : "border-danger-soft bg-danger-soft text-danger-ink"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <span className="text-xxs text-muted">پلن فعلی</span>
              <strong className="mt-1.5 block text-[15px]">
                {activePlan ? activePlan.label : "بدون اشتراک"}
              </strong>
              <small className={`mt-1 block text-[11px] ${subscription ? "text-green" : "text-muted"}`}>
                {subscription ? `فعال تا ${jalali(subscription.expiresAt)}` : "برای شروع یک پلن بگیرید"}
              </small>
            </div>
            <div className="card p-5">
              <span className="text-xxs text-muted">مصرف این دوره</span>
              <strong className="tabular mt-1.5 block text-[15px]">
                {fa(subscription?.requestsUsed ?? 0)}
              </strong>
              <small className="mt-1 block text-[11px] text-muted">
                از {fa(subscription?.requestLimit ?? 0)} درخواست
              </small>
            </div>
            <div className="card p-5">
              <span className="text-xxs text-muted">مجموع درخواست ۷ روز</span>
              <strong className="tabular mt-1.5 block text-[15px]">
                {fa(usage.reduce((total, row) => total + row.count, 0))}
              </strong>
              <small className="mt-1 block text-[11px] text-muted">
                میانگین پاسخ{" "}
                {fa(
                  usage.length
                    ? Math.round(
                        usage.reduce((total, row) => total + row.avgLatency, 0) / usage.length,
                      )
                    : 0,
                )}{" "}
                ms
              </small>
            </div>
          </div>

          <section id="key" className="card mt-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold">کلید API محیط اصلی</h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  این کلید را فقط سمت سرور نگه دارید. صدور کلید تازه، کلید قبلی را باطل می‌کند.
                </p>
              </div>
              <span className={subscription ? "state-approved" : "state-pending"}>
                {subscription ? "فعال" : "نیازمند اشتراک"}
              </span>
            </div>

            <div dir="ltr" className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-field px-4 py-3">
              <code className="flex-1 truncate font-mono text-[12.5px]">
                {revealed ?? (apiKeyPrefix ? `${apiKeyPrefix}••••••••••••` : "کلیدی صادر نشده است")}
              </code>
              {revealed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRevealed(null)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft"
                    aria-label="مخفی کردن"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(revealed, "key")}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-soft"
                    aria-label="کپی کلید"
                  >
                    {copied === "key" ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                <Eye className="h-4 w-4 text-faint" />
              )}
            </div>

            {subscription ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px]">
                  <b>٪{fa(usedPercent)} مصرف‌شده</b>
                  <small className="text-muted">
                    {fa(subscription.requestLimit - subscription.requestsUsed)} درخواست باقی‌مانده
                  </small>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-pill bg-tab">
                  <div
                    className={`h-full rounded-pill ${usedPercent > 85 ? "bg-danger" : "bg-green"}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="btn-ghost mt-4"
              onClick={issueKey}
              disabled={busy === "key" || !subscription}
            >
              {busy === "key" ? <Loader2 className="animate-spin" /> : <KeyRound />}
              صدور کلید تازه
            </button>
          </section>

          <section id="payments" className="card mt-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold">{subscription ? "تمدید یا تغییر پلن" : "خرید اشتراک"}</h2>
                <p className="mt-1 text-[11.5px] leading-6 text-muted">
                  پرداخت با کارت بانکی از درگاه زرین‌پال. اشتراک بلافاصله فعال می‌شود و زمان باقی‌مانده‌ی
                  اشتراک فعلی به دوره‌ی تازه اضافه می‌شود.
                </p>
              </div>
              <span className="chip bg-soft text-sub">زرین‌پال</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PLANS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlan(item.id)}
                  aria-pressed={plan === item.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-right transition-colors ${
                    plan === item.id ? "border-green bg-green-soft" : "border-line bg-field hover:border-line-strong"
                  }`}
                >
                  <span className="flex flex-col">
                    <b className="text-[12.5px]">{item.label}</b>
                    <small className="text-[10.5px] text-muted">{item.requests} درخواست</small>
                  </span>
                  <span className="tabular text-[13px] font-bold">
                    {fa(item.price)} <small className="font-normal text-muted">تومان</small>
                  </span>
                </button>
              ))}
            </div>

            <button type="button" className="btn-solid mt-4" onClick={checkout} disabled={busy === "payment"}>
              {busy === "payment" ? <Loader2 className="animate-spin" /> : <CreditCard />}
              پرداخت {fa(selectedPlan.price)} تومان
            </button>

            {orders.length ? (
              <div className="table-scroll mt-6 border-t border-line pt-4">
                <table className="w-full min-w-[540px] text-right text-[11.5px]">
                  <thead className="text-xxs text-muted">
                    <tr>
                      <th className="pb-2 font-semibold">پلن</th>
                      <th className="pb-2 font-semibold">مبلغ</th>
                      <th className="pb-2 font-semibold">شماره پیگیری</th>
                      <th className="pb-2 font-semibold">تاریخ</th>
                      <th className="pb-2 font-semibold">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-line">
                        <td className="py-3">{getPlan(order.plan)?.label ?? order.plan}</td>
                        <td className="tabular py-3">{fa(order.amountRial / 10)} تومان</td>
                        <td className="py-3">
                          <code dir="ltr" className="font-mono text-[10.5px]">
                            {order.refId ?? "—"}
                          </code>
                        </td>
                        <td className="py-3 text-muted">{jalali(order.createdAt)}</td>
                        <td className="py-3">
                          <span className={ORDER_STATUS[order.status].className}>{ORDER_STATUS[order.status].label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {payments.length ? (
              <div className="table-scroll mt-6 border-t border-line pt-4">
                <h3 className="mb-2 text-[12px] font-bold text-sub">پرداخت‌های تتری پیشین</h3>
                <table className="w-full min-w-[540px] text-right text-[11.5px]">
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-line">
                        <td className="py-3">{getPlan(payment.plan)?.label ?? payment.plan}</td>
                        <td className="tabular py-3">{payment.amountUsdt} USDT</td>
                        <td className="py-3">
                          <code dir="ltr" className="font-mono text-[10.5px]">
                            {payment.txHash.slice(0, 8)}…{payment.txHash.slice(-4)}
                          </code>
                        </td>
                        <td className="py-3 text-muted">{jalali(payment.createdAt)}</td>
                        <td className="py-3">
                          <span className={STATUS_CLASS[payment.status]}>{STATUS_LABEL[payment.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section id="usage" className="card mt-5 p-6">
            <h2 className="text-[16px] font-bold">مصرف API در ۷ روز اخیر</h2>
            <p className="mt-1 text-[11.5px] text-muted">سهم هر endpoint از درخواست‌های شما.</p>

            {usage.length ? (
              <div className="mt-5 space-y-4">
                {usage
                  .sort((a, b) => b.count - a.count)
                  .map((row) => {
                    const max = Math.max(...usage.map((item) => item.count));
                    return (
                      <div key={row.endpoint}>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <code dir="ltr" className="font-mono text-[11px] text-sub">
                            {row.endpoint}
                          </code>
                          <b className="tabular">{fa(row.count)}</b>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-tab">
                          <div
                            className="h-full rounded-pill bg-green"
                            style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-line py-10 text-center text-[12px] text-muted">
                هنوز درخواستی با کلید شما ثبت نشده است.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
