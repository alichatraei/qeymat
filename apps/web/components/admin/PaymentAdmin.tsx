"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, Save, X } from "lucide-react";
import { fa, getAnyPlan, jalali, timeAgo } from "@qeymat/shared";

/* ------------------------------------------------------------------ */
/* فیش‌های کارت‌به‌کارت                                                */
/* ------------------------------------------------------------------ */

export type ReceiptRow = {
  id: string;
  user: string;
  contact: string;
  kind: "API_PLAN" | "PLUS_PLAN";
  plan: string;
  amountToman: number;
  mime: string;
  trackingCode: string | null;
  payerCardLast4: string | null;
  userNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export function ReceiptsPanel({ receipts, onFlash }: { receipts: ReceiptRow[]; onFlash: (text: string) => void }) {
  const router = useRouter();
  const [rows, setRows] = useState(receipts);
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const review = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !notes[id]?.trim()) {
      onFlash("برای رد فیش، دلیل را بنویسید تا به کاربر نمایش داده شود.");
      return;
    }
    setBusy(id);
    try {
      const response = await fetch("/api/admin/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: notes[id]?.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "انجام نشد.");
      setRows((list) =>
        list.map((row) =>
          row.id === id
            ? { ...row, status: payload.status, adminNote: notes[id]?.trim() || null, reviewedAt: new Date().toISOString() }
            : row,
        ),
      );
      onFlash(action === "approve" ? `تأیید شد و ${payload.label ?? "اشتراک"} فعال شد.` : "فیش رد شد و به کاربر اطلاع داده شد.");
      router.refresh();
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "انجام نشد.");
    } finally {
      setBusy("");
    }
  };

  const visible = filter === "PENDING" ? rows.filter((row) => row.status === "PENDING") : rows;

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold">فیش‌های کارت‌به‌کارت</h2>
          <p className="mt-1 text-[11.5px] text-muted">
            مبلغ و تاریخ فیش را با حساب بانکی مقایسه کنید. تأیید، اشتراک را همان لحظه فعال می‌کند.
          </p>
        </div>
        <div className="segmented">
          <button type="button" data-active={filter === "PENDING"} onClick={() => setFilter("PENDING")}>
            در انتظار ({fa(rows.filter((row) => row.status === "PENDING").length)})
          </button>
          <button type="button" data-active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            همه
          </button>
        </div>
      </div>

      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((row) => {
            const url = `/api/receipts/${row.id}/file`;
            const pdf = row.mime === "application/pdf";
            return (
              <li key={row.id} className="grid gap-4 rounded-xl border border-line bg-field p-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                <a href={url} target="_blank" rel="noopener" className="group relative block overflow-hidden rounded-lg border border-line bg-surface">
                  {pdf ? (
                    <span className="grid h-[140px] place-items-center text-[12px] font-bold text-sub">PDF فیش</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="فیش واریزی" className="h-[140px] w-full object-cover" loading="lazy" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-overlay/60 py-1 text-[10.5px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink className="h-3 w-3" />
                    اندازه‌ی کامل
                  </span>
                </a>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[13px]">{row.kind === "PLUS_PLAN" ? "قیمت پلاس" : "وب‌سرویس"} · {getAnyPlan(row.plan)?.label ?? row.plan}</b>
                    <span className="tabular text-[13px] font-extrabold text-green-dark">{fa(row.amountToman)} تومان</span>
                    <span
                      className={`mr-auto ${
                        row.status === "APPROVED" ? "state-approved" : row.status === "REJECTED" ? "state-rejected" : "state-pending"
                      }`}
                    >
                      {row.status === "APPROVED" ? "تأییدشده" : row.status === "REJECTED" ? "ردشده" : "در انتظار"}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-[11.5px] sm:grid-cols-2">
                    <Field label="کاربر" value={`${row.user} · ${row.contact}`} />
                    <Field label="ثبت" value={`${jalali(row.createdAt)} (${timeAgo(row.createdAt)})`} />
                    <Field label="شماره پیگیری" value={row.trackingCode ?? "—"} ltr />
                    <Field label="۴ رقم آخر کارت" value={row.payerCardLast4 ?? "—"} ltr />
                  </dl>
                  {row.userNote ? <p className="mt-2 text-[11.5px] text-sub">توضیح کاربر: {row.userNote}</p> : null}
                  {row.adminNote ? <p className="mt-1 text-[11.5px] text-muted">یادداشت بررسی: {row.adminNote}</p> : null}

                  {row.status === "PENDING" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        className="field h-10 min-w-[180px] flex-1"
                        placeholder="یادداشت (برای رد الزامی است)"
                        value={notes[row.id] ?? ""}
                        onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })}
                      />
                      <button type="button" className="btn-solid h-10 min-h-0" disabled={busy === row.id} onClick={() => review(row.id, "approve")}>
                        {busy === row.id ? <Loader2 className="animate-spin" /> : <Check />}
                        تأیید و فعال‌سازی
                      </button>
                      <button type="button" className="btn-ghost h-10 min-h-0 text-danger" disabled={busy === row.id} onClick={() => review(row.id, "reject")}>
                        <X />
                        رد
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line py-12 text-center text-[12px] text-muted">
          {filter === "PENDING" ? "فیشی در انتظار بررسی نیست." : "هنوز فیشی ثبت نشده است."}
        </p>
      )}
    </section>
  );
}

function Field({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}:</dt>
      <dd dir={ltr ? "ltr" : undefined} className="tabular truncate font-semibold">
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* تنظیمات پرداخت                                                     */
/* ------------------------------------------------------------------ */

export type PaymentSettings = {
  methods: { zarinpal: boolean; card: boolean };
  card: { cardNumber: string; sheba: string; holder: string; bank: string; note: string };
  merchantConfigured: boolean;
};

export function PaymentSettingsPanel({ initial, onFlash }: { initial: PaymentSettings; onFlash: (text: string) => void }) {
  const router = useRouter();
  const [methods, setMethods] = useState(initial.methods);
  const [card, setCard] = useState(initial.card);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods, card }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "ذخیره نشد.");
      onFlash("تنظیمات پرداخت ذخیره شد.");
      router.refresh();
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "ذخیره نشد.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-6">
      <h2 className="text-[16px] font-bold">تنظیمات پرداخت</h2>
      <p className="mt-1 text-[11.5px] text-muted">روش‌های پرداخت و حسابی که کاربران به آن کارت‌به‌کارت می‌کنند.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Toggle
          label="درگاه آنلاین زرین‌پال"
          note={initial.merchantConfigured ? "مرچنت‌کد روی سرور تنظیم است." : "ZARINPAL_MERCHANT_ID روی سرور تنظیم نیست؛ حتی اگر روشن باشد نمایش داده نمی‌شود."}
          checked={methods.zarinpal}
          onChange={(value) => setMethods({ ...methods, zarinpal: value })}
        />
        <Toggle
          label="کارت‌به‌کارت با فیش"
          note="کاربر فیش بارگذاری می‌کند و شما تأیید می‌کنید."
          checked={methods.card}
          onChange={(value) => setMethods({ ...methods, card: value })}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input label="شماره کارت (۱۶ رقم)" value={card.cardNumber} onChange={(value) => setCard({ ...card, cardNumber: value })} ltr />
        <Input label="شماره شبا" value={card.sheba} onChange={(value) => setCard({ ...card, sheba: value })} ltr placeholder="IR…" />
        <Input label="به نام" value={card.holder} onChange={(value) => setCard({ ...card, holder: value })} />
        <Input label="بانک" value={card.bank} onChange={(value) => setCard({ ...card, bank: value })} />
      </div>
      <div className="mt-3">
        <Input
          label="توضیح برای کاربر (اختیاری)"
          value={card.note}
          onChange={(value) => setCard({ ...card, note: value })}
          placeholder="مثلاً: فیش را تا ۲۴ ساعت بعد از واریز ثبت کنید"
        />
      </div>

      <button type="button" className="btn-solid mt-5" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        ذخیره
      </button>
    </section>
  );
}

function Toggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-field p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-green))]"
      />
      <span className="flex flex-col">
        <b className="text-[12.5px]">{label}</b>
        <small className="mt-0.5 text-[11px] leading-5 text-muted">{note}</small>
      </span>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  ltr = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ltr?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xxs text-sub">{label}</span>
      <input className="field tabular" dir={ltr ? "ltr" : undefined} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* قیمت پلن‌ها                                                        */
/* ------------------------------------------------------------------ */

export type PricingRow = {
  id: string;
  group: "plus" | "pro" | "api";
  label: string;
  months: string;
  price: number;
  active: boolean;
  /** سقف درخواست (API) یا تعداد شاخص پیامکی (پلاس) */
  quota: number;
  defaultPrice: number;
};

export function PricingPanel({ rows: initial, onFlash }: { rows: PricingRow[]; onFlash: (text: string) => void }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<PricingRow>) =>
    setRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const toNumber = (value: string) =>
    Number(value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "")) || 0;

  const save = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(
        rows.map((row) => [
          row.id,
          {
            price: row.price,
            active: row.active,
            ...(row.group === "api" ? { limit: row.quota } : { smsAlerts: row.quota }),
          },
        ]),
      );
      const response = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "ذخیره نشد.");
      onFlash("قیمت پلن‌ها ذخیره شد و همین حالا روی سایت اعمال است.");
      router.refresh();
    } catch (error) {
      onFlash(error instanceof Error ? error.message : "ذخیره نشد.");
    } finally {
      setSaving(false);
    }
  };

  const groups: { id: PricingRow["group"]; title: string; quota: string }[] = [
    { id: "plus", title: "قیمت پلاس", quota: "شاخص پیامکی" },
    { id: "pro", title: "پلاس حرفه‌ای", quota: "شاخص پیامکی" },
    { id: "api", title: "وب‌سرویس API", quota: "سقف درخواست" },
  ];

  return (
    <section className="card p-6">
      <h2 className="text-[16px] font-bold">قیمت پلن‌ها</h2>
      <p className="mt-1 text-[11.5px] text-muted">
        قیمت به تومان است. تغییر قیمت فقط روی خریدهای تازه اثر دارد. پلن غیرفعال در صفحه‌ی خرید نمایش داده نمی‌شود.
      </p>

      {groups.map((group) => (
        <div key={group.id} className="mt-5">
          <h3 className="mb-2 text-[12.5px] font-bold text-green-dark">{group.title}</h3>
          <div className="table-scroll">
            <table className="w-full min-w-[560px] text-right text-[12px]">
              <thead className="text-xxs text-muted">
                <tr>
                  <th className="pb-2 font-semibold">پلن</th>
                  <th className="pb-2 font-semibold">قیمت (تومان)</th>
                  <th className="pb-2 font-semibold">{group.quota}</th>
                  <th className="pb-2 font-semibold">فعال</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => row.group === group.id)
                  .map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-2.5">
                        <b>{row.label}</b> <small className="text-muted">({row.months})</small>
                      </td>
                      <td className="py-2.5">
                        <input
                          className="field tabular h-10 w-[150px]"
                          dir="ltr"
                          inputMode="numeric"
                          value={row.price ? fa(row.price) : ""}
                          onChange={(event) => update(row.id, { price: toNumber(event.target.value) })}
                        />
                        {row.price !== row.defaultPrice ? (
                          <small className="mr-2 text-[10.5px] text-muted">پیش‌فرض {fa(row.defaultPrice)}</small>
                        ) : null}
                      </td>
                      <td className="py-2.5">
                        <input
                          className="field tabular h-10 w-[120px]"
                          dir="ltr"
                          inputMode="numeric"
                          value={fa(row.quota)}
                          onChange={(event) => update(row.id, { quota: toNumber(event.target.value) })}
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) => update(row.id, { active: event.target.checked })}
                          className="h-4 w-4 accent-[rgb(var(--c-green))]"
                          aria-label={`فعال بودن ${row.label}`}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <button type="button" className="btn-solid mt-5" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        ذخیره‌ی قیمت‌ها
      </button>
    </section>
  );
}
