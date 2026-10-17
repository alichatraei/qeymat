"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, CreditCard, Loader2, Receipt, Upload, X } from "lucide-react";
import { fa } from "@qeymat/shared";
import { startCheckout, type CheckoutKind } from "@/lib/checkout";

export type CheckoutCard = {
  cardNumber: string;
  sheba: string;
  holder: string;
  bank: string;
  note: string;
};

export type CheckoutMethods = { zarinpal: boolean; card: boolean };

type Method = "zarinpal" | "card";

/** «6037991234567890» ← «۶۰۳۷ ۹۹۱۲ ۳۴۵۶ ۷۸۹۰» */
function groupCard(value: string) {
  return value.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * پرداخت یک پلن: درگاه زرین‌پال یا کارت‌به‌کارت با بارگذاری فیش.
 * روش‌ها را مدیر از پنل روشن و خاموش می‌کند.
 */
export default function CheckoutDialog({
  kind,
  plan,
  methods,
  card,
  returnTo,
  onClose,
}: {
  kind: CheckoutKind;
  plan: { id: string; label: string; price: number };
  methods: CheckoutMethods;
  card: CheckoutCard | null;
  returnTo: string;
  onClose: () => void;
}) {
  const available: Method[] = [
    ...(methods.zarinpal ? (["zarinpal"] as const) : []),
    ...(methods.card && card ? (["card"] as const) : []),
  ];
  const [method, setMethod] = useState<Method | null>(available[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [last4, setLast4] = useState("");
  const [note, setNote] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const product = kind === "PLUS_PLAN" ? "قیمت پلاس" : "وب‌سرویس";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [busy, onClose]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(""), 1800);
  };

  const pick = (next: File | null) => {
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  };

  const payOnline = async () => {
    setBusy(true);
    setError("");
    const failure = await startCheckout(kind, plan.id, returnTo);
    if (failure) {
      setError(failure);
      setBusy(false);
    }
  };

  const submitReceipt = async () => {
    if (!file) {
      setError("تصویر فیش واریزی را انتخاب کنید.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("plan", plan.id);
    form.set("receipt", file);
    form.set("trackingCode", tracking);
    form.set("payerCardLast4", last4);
    form.set("note", note);
    try {
      const response = await fetch("/api/payment/receipt", { method: "POST", body: form });
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "ثبت فیش انجام نشد.");
      setDone(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ثبت فیش انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="پرداخت">
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-overlay/40 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
        aria-label="بستن"
      />
      <div className="card relative flex max-h-[90vh] w-[min(520px,100%)] animate-rise-in flex-col shadow-drawer">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <strong className="text-[14px]">
              {product} · {plan.label}
            </strong>
            <p className="tabular mt-0.5 text-[12px] text-muted">{fa(plan.price)} تومان</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-sub hover:bg-soft"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {done ? (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-soft text-green">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-[16px] font-bold">فیش شما ثبت شد</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">
                پس از بررسی و تأیید پشتیبانی، اشتراک به‌طور خودکار فعال می‌شود و اعلان دریافت می‌کنید. وضعیت را در
                پنل کاربری ببینید.
              </p>
              <Link href="/me" className="btn-solid mt-5 w-full">
                رفتن به پنل کاربری
              </Link>
            </div>
          ) : !method ? (
            <p className="py-8 text-center text-[12.5px] leading-7 text-muted">
              در حال حاضر هیچ روش پرداختی فعال نیست. لطفاً کمی بعد دوباره تلاش کنید یا تیکت ثبت کنید.
            </p>
          ) : (
            <>
              {available.length > 1 ? (
                <div className="segmented mb-4 w-full grid-cols-2">
                  <button type="button" data-active={method === "zarinpal"} onClick={() => setMethod("zarinpal")}>
                    <CreditCard className="h-3.5 w-3.5" />
                    درگاه آنلاین
                  </button>
                  <button type="button" data-active={method === "card"} onClick={() => setMethod("card")}>
                    <Receipt className="h-3.5 w-3.5" />
                    کارت به کارت
                  </button>
                </div>
              ) : null}

              {method === "zarinpal" ? (
                <div>
                  <p className="text-[12px] leading-7 text-muted">
                    با هر کارت بانکی عضو شتاب از درگاه امن زرین‌پال پرداخت کنید؛ اشتراک بلافاصله پس از پرداخت فعال
                    می‌شود.
                  </p>
                  <button type="button" className="btn-solid mt-4 w-full" onClick={payOnline} disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" /> : <CreditCard />}
                    پرداخت {fa(plan.price)} تومان
                  </button>
                </div>
              ) : card ? (
                <div className="space-y-4">
                  <p className="text-[12px] leading-7 text-muted">
                    مبلغ را به حساب زیر واریز کنید و تصویر فیش را بارگذاری کنید. پس از تأیید پشتیبانی، اشتراک فعال
                    می‌شود.
                  </p>

                  <div className="space-y-2 rounded-xl border border-line bg-field p-3.5">
                    <CopyRow label="مبلغ" value={`${fa(plan.price)} تومان`} raw={String(plan.price)} id="amount" copied={copied} onCopy={copy} />
                    {card.cardNumber ? (
                      <CopyRow label="شماره کارت" value={groupCard(card.cardNumber)} raw={card.cardNumber} id="card" copied={copied} onCopy={copy} ltr />
                    ) : null}
                    {card.sheba ? (
                      <CopyRow label="شماره شبا" value={card.sheba} raw={card.sheba} id="sheba" copied={copied} onCopy={copy} ltr />
                    ) : null}
                    {card.holder ? <InfoRow label="به نام" value={card.holder} /> : null}
                    {card.bank ? <InfoRow label="بانک" value={card.bank} /> : null}
                  </div>
                  {card.note ? <p className="text-[11px] leading-6 text-amber-ink">{card.note}</p> : null}

                  <div>
                    <span className="mb-1.5 block text-xxs text-sub">تصویر فیش واریزی *</span>
                    <input
                      ref={input}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => pick(event.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong bg-field p-3 text-right transition-colors hover:border-green"
                    >
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="پیش‌نمایش فیش" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center rounded-lg bg-tab text-sub">
                          <Upload className="h-5 w-5" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        <b className="truncate text-[12px]">{file ? file.name : "انتخاب تصویر یا PDF"}</b>
                        <small className="text-[10.5px] text-muted">JPG، PNG، WEBP یا PDF · حداکثر ۶ مگابایت</small>
                      </span>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xxs text-sub">شماره پیگیری / ارجاع</span>
                      <input className="field tabular" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xxs text-sub">۴ رقم آخر کارت شما</span>
                      <input
                        className="field tabular"
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={4}
                        value={last4}
                        onChange={(e) => setLast4(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-xxs text-sub">توضیح (اختیاری)</span>
                    <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                  </label>

                  <button type="button" className="btn-solid w-full" onClick={submitReceipt} disabled={busy || !file}>
                    {busy ? <Loader2 className="animate-spin" /> : <Receipt />}
                    ثبت فیش برای بررسی
                  </button>
                </div>
              ) : null}

              {error ? <p className="mt-3 text-[12px] leading-6 text-danger">{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  raw,
  id,
  copied,
  onCopy,
  ltr = false,
}: {
  label: string;
  value: string;
  raw: string;
  id: string;
  copied: string;
  onCopy: (value: string, id: string) => void;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <b dir={ltr ? "ltr" : undefined} className="tabular truncate text-[12.5px]">
          {value}
        </b>
        <button
          type="button"
          onClick={() => onCopy(raw, id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft"
          aria-label={`کپی ${label}`}
        >
          {copied === id ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted">{label}</span>
      <b className="text-[12.5px]">{value}</b>
    </div>
  );
}
