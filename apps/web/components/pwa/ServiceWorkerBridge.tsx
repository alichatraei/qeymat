"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

/** سرویس‌ورکر را ثبت می‌کند و نسخه‌ی تازه را بدون رفرش دستی فعال می‌کند. */
export default function ServiceWorkerBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const registration = await registerServiceWorker();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch {
        /* نبود سرویس‌ورکر نباید سایت را از کار بیندازد */
      }
    };

    // معمولاً load پیش از اجرای React رخ داده است؛ آن وقت همین حالا ثبت شود
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
