"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { activeServiceWorker, withTimeout } from "@/lib/service-worker";
import { fetchRetry } from "@/lib/fetch-retry";

type State = "unsupported" | "idle" | "loading" | "on" | "denied";

/** تبدیل کلید VAPID پایه۶۴-URL به Uint8Array برای pushManager */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function saveSubscription(subscription: PushSubscription) {
  const save = await fetchRetry("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!save.ok) throw new Error("ثبت اشتراک اعلان روی سرور انجام نشد.");
}

export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // ready ممکن است هرگز نرسد (سرویس‌ورکر هنوز ثبت نشده)؛ ثبت فعلی را مستقیم می‌خوانیم
    navigator.serviceWorker
      .getRegistration("/")
      .then((registration) => registration?.pushManager.getSubscription() ?? null)
      .then((subscription) => {
        setState(subscription ? "on" : "idle");
        // اشتراکی که پیش از ورود ساخته شده به کاربر فعلی وصل شود تا هشدارها برسد
        if (subscription) saveSubscription(subscription).catch(() => {});
      })
      .catch(() => setState("idle"));
  }, []);

  const enable = async () => {
    setState("loading");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setMessage("اجازه‌ی اعلان در مرورگر داده نشد.");
        return;
      }

      const keyResponse = await fetchRetry("/api/push/key");
      const { publicKey } = await keyResponse.json();
      if (!publicKey) throw new Error("کلید اعلان روی سرور تنظیم نشده است.");

      const registration = await activeServiceWorker();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }),
          25_000,
          "سرویس اعلان مرورگر پاسخ نداد. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید.",
        ));

      await saveSubscription(subscription);
      setState("on");

      // اعلان آزمایشی: مسیر کامل سرور ← سرویس پوش ← گوشی همین الان امتحان می‌شود
      const test = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
        .then((response) => response.json())
        .catch(() => null);
      setMessage(
        test?.sent
          ? "اعلان‌ها روشن شد؛ یک اعلان آزمایشی فرستادیم."
          : "اعلان‌ها روشن شد، ولی اعلان آزمایشی نرسید. کمی بعد دوباره امتحان کنید.",
      );
    } catch (error) {
      setState("idle");
      setMessage(error instanceof Error ? error.message : "روشن کردن اعلان انجام نشد.");
    }
  };

  const disable = async () => {
    setState("loading");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("idle");
      setMessage("اعلان‌ها خاموش شد.");
    } catch {
      setState("on");
      setMessage("خاموش کردن اعلان انجام نشد.");
    }
  };

  if (state === "unsupported") return null;

  const label =
    state === "on" ? "اعلان‌ها روشن است" : state === "denied" ? "اعلان مسدود شده" : "روشن کردن اعلان";

  return (
    <div className={compact ? "" : "flex flex-col items-start gap-2"}>
      <button
        type="button"
        className={state === "on" ? "btn-ghost" : "btn-solid"}
        onClick={state === "on" ? disable : enable}
        disabled={state === "loading" || state === "denied"}
      >
        {state === "loading" ? (
          <Loader2 className="animate-spin" />
        ) : state === "on" ? (
          <BellRing />
        ) : state === "denied" ? (
          <BellOff />
        ) : (
          <Bell />
        )}
        {label}
      </button>
      {message ? <p className={`text-[11px] text-muted ${compact ? "mt-1.5" : ""}`}>{message}</p> : null}
      {state === "denied" && !compact ? (
        <p className="text-[11px] text-muted">
          برای فعال‌سازی، اعلان سایت را از تنظیمات مرورگر مجاز کنید.
        </p>
      ) : null}
    </div>
  );
}
