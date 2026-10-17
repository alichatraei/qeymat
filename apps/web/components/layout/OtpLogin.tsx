"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { fa } from "@qeymat/shared";

type Step = "phone" | "code";

const PHONE_KEY = "qeymat-phone";

export default function OtpLogin() {
  const router = useRouter();
  const params = useSearchParams();
  // فقط مسیر داخلی پذیرفته می‌شود تا لینک ورود به سایت دیگری هدایت نکند
  const rawNext = params.get("next") || "/me";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/me";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [masked, setMasked] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(5).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // شماره‌ای که قبلاً روی این دستگاه وارد شده، از پیش پر می‌شود
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) setPhone((current) => current || saved);
    } catch {
      /* حالت خصوصی مرورگر */
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const send = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error?.message || "ارسال کد انجام نشد.");
        if (payload?.retryAfterSec) {
          setCountdown(payload.retryAfterSec);
          setStep("code");
        }
        return;
      }

      setMasked(payload.phone);
      setCountdown(60);
      setStep("code");
      setDigits(Array(5).fill(""));
      setTimeout(() => boxes.current[0]?.focus(), 60);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error?.message || "کد درست نیست.");
        setDigits(Array(5).fill(""));
        boxes.current[0]?.focus();
        return;
      }

      try {
        localStorage.setItem(PHONE_KEY, phone);
      } catch {
        /* نادیده */
      }
      router.push(payload.role === "ADMIN" ? "/admin" : next);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  };

  /** ورود رقم‌به‌رقم با پرش خودکار و پشتیبانی از چسباندن کل کد */
  const onDigit = (index: number, value: string) => {
    const clean = value.replace(/[^\d]/g, "");
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    for (let i = 0; i < clean.length && index + i < 5; i += 1) {
      nextDigits[index + i] = clean[i];
    }
    setDigits(nextDigits);

    const filled = nextDigits.filter(Boolean).length;
    if (filled === 5) {
      verify(nextDigits.join(""));
    } else {
      boxes.current[Math.min(4, index + clean.length)]?.focus();
    }
  };

  return (
    <main className="content-width grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-[420px] p-7 shadow-card">
        {step === "phone" ? (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-soft text-green">
              <Smartphone className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.6px]">ورود یا ثبت‌نام</h1>
            <p className="mt-2 text-[12px] leading-6 text-muted">
              شماره موبایلتان را وارد کنید. کد تأیید پیامک می‌شود.
            </p>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-xxs text-sub">شماره موبایل</span>
              <input
                className="field tabular text-center text-[16px] tracking-[2px]"
                dir="ltr"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="09xxxxxxxxx"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => event.key === "Enter" && phone.length >= 10 && send()}
              />
            </label>

            {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}

            <button
              type="button"
              className="btn-solid mt-5 w-full"
              onClick={send}
              disabled={loading || phone.replace(/\D/g, "").length < 10}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              دریافت کد تأیید
            </button>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-sub">
              <ShieldCheck className="h-3.5 w-3.5 text-green" />
              شماره شما فقط برای ورود و اطلاع‌رسانی استفاده می‌شود
            </p>
            <p className="mt-1.5 text-center text-2xs text-muted">
              ورود شما ۳۰ روز روی همین دستگاه می‌ماند.
            </p>

            <p className="mt-5 border-t border-line pt-4 text-center text-[11px] text-muted">
              مدیر هستید؟{" "}
              <Link href="/login/admin" className="font-semibold text-green-dark hover:underline">
                ورود با ایمیل
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError("");
              }}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
              تغییر شماره
            </button>

            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.6px]">کد تأیید</h1>
            <p className="mt-2 text-[12px] leading-6 text-muted">
              کد پنج‌رقمی ارسال‌شده به <b dir="ltr" className="text-ink">{masked || phone}</b> را وارد
              کنید.
            </p>

            <div dir="ltr" className="mt-6 flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    boxes.current[index] = element;
                  }}
                  className="tabular h-[54px] w-[48px] rounded-control border border-line bg-field text-center text-[20px] font-bold outline-none focus:border-line-strong focus:bg-surface"
                  inputMode="numeric"
                  maxLength={5}
                  value={digit}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  onChange={(event) => onDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digits[index] && index > 0) {
                      boxes.current[index - 1]?.focus();
                    }
                  }}
                  aria-label={`رقم ${index + 1}`}
                />
              ))}
            </div>

            {error ? <p className="mt-4 text-center text-[11.5px] text-danger">{error}</p> : null}

            <button
              type="button"
              className="btn-solid mt-5 w-full"
              onClick={() => verify(digits.join(""))}
              disabled={loading || digits.filter(Boolean).length < 5}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              ورود
            </button>

            <div className="mt-4 text-center text-[11.5px]">
              {countdown > 0 ? (
                <span className="text-muted">
                  ارسال دوباره تا {fa(countdown)} ثانیه دیگر
                </span>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={loading}
                  className="font-semibold text-green-dark hover:underline"
                >
                  ارسال دوباره کد
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
