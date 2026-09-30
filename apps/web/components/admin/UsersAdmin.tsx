"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { fa, jalali, timeAgo } from "@qeymat/shared";
import type { PricingRow } from "./PaymentAdmin";

type UserRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  plus: { plan: string; expiresAt: string } | null;
  api: { plan: string; expiresAt: string } | null;
};

/**
 * کاربران: جست‌وجو با موبایل/نام/ایمیل و ارتقای دستی به پریمیوم.
 * ارتقا دو مرحله دارد: انتخاب پلن و ارسال کد به موبایل مدیر، سپس وارد
 * کردن کد (یا گذرواژه‌ی مدیری که موبایل ندارد).
 */
export default function UsersAdmin({ plans, onFlash }: { plans: PricingRow[]; onFlash: (text: string) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState<UserRow | null>(null);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message);
      setUsers(data.users);
    } catch (error) {
      onFlash(error instanceof Error && error.message ? error.message : "جست‌وجو انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => search(query.trim()), query ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const planLabel = (id: string) => plans.find((plan) => plan.id === id)?.label ?? id;

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold">کاربران</h2>
          <p className="mt-1 text-[11.5px] text-muted">جست‌وجو با موبایل، نام یا ایمیل؛ ارتقای دستی به پریمیوم با تأیید دو مرحله‌ای.</p>
        </div>
        <label className="flex h-11 w-full items-center gap-2.5 rounded-control border border-line bg-field px-3.5 text-faint sm:w-[300px]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="0912… یا نام"
            className="w-full border-0 bg-transparent text-[12px] text-ink outline-none"
            aria-label="جست‌وجوی کاربر"
          />
        </label>
      </div>

      <div className="table-scroll">
        <table className="w-full min-w-[680px] text-right text-[12px]">
          <thead className="text-xxs text-muted">
            <tr>
              <th className="pb-3 font-semibold">کاربر</th>
              <th className="pb-3 font-semibold">اشتراک</th>
              <th className="pb-3 font-semibold">ثبت‌نام</th>
              <th className="pb-3 font-semibold">آخرین ورود</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="py-3.5">
                  <b className="block">
                    {user.name}
                    {user.role === "ADMIN" ? <span className="state-approved mr-2">مدیر</span> : null}
                  </b>
                  <small dir="ltr" className="text-[10px] text-muted">
                    {user.phone ?? user.email ?? "—"}
                  </small>
                </td>
                <td className="py-3.5 text-[11px]">
                  {user.plus ? (
                    <span className="block text-amber-ink">
                      {planLabel(user.plus.plan)} تا {jalali(user.plus.expiresAt)}
                    </span>
                  ) : null}
                  {user.api ? (
                    <span className="block text-green-dark">
                      API {planLabel(user.api.plan)} تا {jalali(user.api.expiresAt)}
                    </span>
                  ) : null}
                  {!user.plus && !user.api ? <span className="text-muted">رایگان</span> : null}
                </td>
                <td className="py-3.5 text-muted">{jalali(user.createdAt)}</td>
                <td className="py-3.5 text-muted">{user.lastSeenAt ? timeAgo(user.lastSeenAt) : "—"}</td>
                <td className="py-3.5 text-left">
                  <button
                    type="button"
                    className="btn-ghost h-9 min-h-0 px-3 text-[11px]"
                    disabled={!user.isActive}
                    onClick={() => setGranting(user)}
                  >
                    <Crown className="h-3.5 w-3.5 text-amber" />
                    ارتقا
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !users.length ? <p className="py-8 text-center text-[12px] text-muted">کاربری پیدا نشد.</p> : null}
      </div>

      {granting ? (
        <GrantDialog
          user={granting}
          plans={plans.filter((plan) => plan.active)}
          onClose={() => setGranting(null)}
          onDone={(label) => {
            onFlash(`${label} برای ${granting.name} فعال شد.`);
            setGranting(null);
            search(query.trim());
          }}
        />
      ) : null}
    </section>
  );
}

function GrantDialog({
  user,
  plans,
  onClose,
  onDone,
}: {
  user: UserRow;
  plans: PricingRow[];
  onClose: () => void;
  onDone: (label: string) => void;
}) {
  const [planId, setPlanId] = useState(plans.find((plan) => plan.group === "plus")?.id ?? plans[0]?.id ?? "");
  const [step, setStep] = useState<"choose" | "verify">("choose");
  const [method, setMethod] = useState<"sms" | "password">("sms");
  const [masked, setMasked] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = plans.find((item) => item.id === planId);
  const kind = plan?.group === "api" ? "API_PLAN" : "PLUS_PLAN";
  const groups: { id: PricingRow["group"]; label: string }[] = [
    { id: "plus", label: "قیمت پلاس" },
    { id: "pro", label: "پلاس حرفه‌ای" },
    { id: "api", label: "وب‌سرویس API" },
  ];

  const call = async (body: object) => {
    const response = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, kind, planId, ...body }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || "انجام نشد.");
    return data;
  };

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await call({ step: "start" });
      setMethod(data.method);
      setMasked(data.maskedPhone ?? "");
      setStep("verify");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await call({ step: "confirm", secret });
      onDone(data.label);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="ارتقای کاربر">
      <button type="button" className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="بستن" />
      <div className="relative w-full max-w-[440px] rounded-t-[24px] bg-surface p-5 shadow-drawer sm:rounded-[24px]">
        <div className="flex items-center justify-between">
          <strong className="flex items-center gap-2 text-[14px]">
            <Crown className="h-4 w-4 text-amber" />
            ارتقای {user.name}
          </strong>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line" aria-label="بستن">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p dir="ltr" className="mt-1 text-right text-[11px] text-muted">
          {user.phone ?? user.email}
        </p>

        {step === "choose" ? (
          <>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xxs text-sub">پلن (مرحله‌ی ۱ از ۲)</span>
              <select className="field" value={planId} onChange={(event) => setPlanId(event.target.value)}>
                {groups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {plans
                      .filter((item) => item.group === group.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} · {item.months}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <p className="mt-3 rounded-xl bg-field px-3.5 py-2.5 text-[11.5px] leading-6 text-sub">
              اشتراک بدون پرداخت فعال می‌شود. اگر کاربر همین سطح را دارد، از انتهای اشتراک فعلی تمدید می‌شود. برای
              تأیید، یک کد به موبایل خودِ شما فرستاده می‌شود.
            </p>
            {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}
            <button type="button" className="btn-solid mt-4 h-11 w-full" onClick={start} disabled={busy || !plan}>
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              ادامه و ارسال کد تأیید
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-[12px] leading-6">
              ارتقا به <b>{plan ? `${groups.find((group) => group.id === plan.group)?.label} ${plan.label}` : ""}</b>
            </p>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xxs text-sub">
                {method === "sms"
                  ? `کد ۵ رقمی فرستاده‌شده به ${masked} (مرحله‌ی ۲ از ۲)`
                  : "گذرواژه‌ی حساب مدیر (مرحله‌ی ۲ از ۲)"}
              </span>
              <input
                className="field tabular text-center text-[18px] tracking-[6px]"
                dir="ltr"
                type={method === "sms" ? "text" : "password"}
                inputMode={method === "sms" ? "numeric" : undefined}
                autoComplete={method === "sms" ? "one-time-code" : "current-password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </label>
            {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-solid h-11 flex-1" onClick={confirm} disabled={busy || !secret.trim()}>
                {busy ? <Loader2 className="animate-spin" /> : <Crown />}
                تأیید نهایی و فعال‌سازی
              </button>
              <button type="button" className="btn-ghost h-11" onClick={() => setStep("choose")} disabled={busy}>
                بازگشت
              </button>
            </div>
            {method === "sms" ? (
              <p className="mt-2 text-center text-[10.5px] text-muted">کد {fa(5)} دقیقه اعتبار دارد.</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
