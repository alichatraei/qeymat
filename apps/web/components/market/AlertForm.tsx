"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Bell, Crown, LogIn, MessageSquareText } from "lucide-react";
import { fa, parseNumber, unitLabel } from "@qeymat/shared";
import PushToggle from "@/components/pwa/PushToggle";
import { fetchRetry, networkErrorMessage } from "@/lib/fetch-retry";
import type { PlusStatus, RateView } from "@/lib/types";

type AlertsResponse = { plus: PlusStatus; smsUsed: number } | { error: { code: string; message: string } };

const fetcher = (url: string) => fetch(url).then((response) => response.json());

/**
 * فرم هشدار قیمت.
 * - کاربر مهمان باید با شماره موبایل وارد شود.
 * - کاربر واردشده اعلان مرورگر می‌گیرد.
 * - مشترک پلاس می‌تواند پیامک هم بگیرد (تا سقف پلن).
 */
export default function AlertForm({ rate }: { rate: RateView }) {
  const { data, mutate } = useSWR<AlertsResponse>("/api/alerts", fetcher);
  const [threshold, setThreshold] = useState(() => fa(rate.sell >= 1000 ? Math.round(rate.sell / 1000) * 1000 : rate.sell));
  const [sms, setSms] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const loggedIn = data && !("error" in data);
  const plus = loggedIn ? data.plus : null;
  const smsLeft = plus?.active ? Math.max(0, plus.smsLimit - (data as { smsUsed: number }).smsUsed) : 0;
  const target = parseNumber(threshold);
  const direction = target >= rate.sell ? "بالاتر" : "پایین‌تر";

  const submit = async () => {
    setState("saving");
    setMessage("");
    try {
      // ثبت دوباره بی‌خطر است: سرور هشدار قبلی همین دارایی را جایگزین می‌کند
      const response = await fetchRetry("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: rate.symbol, threshold: target, sms }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setState("error");
        setMessage(payload?.error?.message || "ثبت هشدار انجام نشد.");
        return;
      }
      setState("saved");
      setMessage(
        `هشدار ثبت شد؛ وقتی ${rate.nameFa} ${direction} از ${fa(target)} ${unitLabel(rate.unit)} رفت، ${
          sms ? "پیامک و اعلان" : "اعلان"
        } می‌گیرید.`,
      );
      mutate();
    } catch (error) {
      setState("error");
      setMessage(networkErrorMessage(error));
    }
  };

  return (
    <div id="alert" className="mt-6 rounded-card border border-line bg-field p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-green" />
        <strong className="text-[12.5px]">هشدار قیمت</strong>
      </div>

      {!data ? (
        <div className="mt-3 h-[46px] animate-pulse rounded-control bg-soft" />
      ) : !loggedIn ? (
        <>
          <p className="mt-1.5 text-[11px] leading-5 text-muted">
            برای ثبت هشدار قیمت، با شماره موبایل وارد شوید. ورود ۳۰ روز روی همین دستگاه می‌ماند.
          </p>
          <Link href={`/login?next=${encodeURIComponent(`/chart?symbol=${rate.symbol}#alert`)}`} className="btn-solid mt-3 w-full">
            <LogIn />
            ورود با شماره موبایل
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[11px] leading-5 text-muted">
            وقتی {rate.nameFa} از قیمت هدف عبور کرد، روی دستگاه‌هایی که اعلانشان روشن است خبر می‌دهیم.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="field tabular flex-1"
              value={threshold}
              inputMode="numeric"
              onChange={(event) => {
                setThreshold(event.target.value);
                setState("idle");
              }}
              aria-label={`قیمت هدف به ${unitLabel(rate.unit)}`}
            />
            <button type="button" className="btn-solid" onClick={submit} disabled={state === "saving" || !target}>
              {state === "saved" ? "ثبت شد" : "ثبت هشدار"}
            </button>
          </div>
          {target ? (
            <p className="mt-2 text-[10.5px] text-muted">
              هشدار وقتی قیمت {direction} از {fa(target)} {unitLabel(rate.unit)} برود.
            </p>
          ) : null}

          {plus?.active ? (
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-control border border-line bg-surface p-3">
              <input
                type="checkbox"
                checked={sms}
                onChange={(event) => setSms(event.target.checked)}
                className="h-4 w-4 accent-[rgb(var(--c-green))]"
              />
              <MessageSquareText className="h-4 w-4 text-green" />
              <span className="flex-1 text-[11.5px]">پیامک هم بفرست</span>
              <small className="text-[10.5px] text-muted">
                {fa(smsLeft)} از {fa(plus.smsLimit)} شاخص باقی‌مانده
              </small>
            </label>
          ) : (
            <Link
              href="/plus"
              className="mt-3 flex items-center gap-2 rounded-control border border-amber-line bg-amber-soft/60 p-3 text-[11px] text-amber-ink transition-colors hover:bg-amber-soft"
            >
              <Crown className="h-4 w-4" />
              هشدار پیامکی و تحلیل قیمت با قیمت پلاس
            </Link>
          )}

          {message ? (
            <p className={`mt-2 text-[11px] leading-5 ${state === "error" ? "text-danger" : "text-green-dark"}`}>
              {message}
            </p>
          ) : null}

          <div className="mt-3 border-t border-line pt-3">
            <PushToggle compact />
          </div>
        </>
      )}
    </div>
  );
}
