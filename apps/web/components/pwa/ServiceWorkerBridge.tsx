"use client";

import { useEffect } from "react";

/** سرویس‌ورکر را ثبت می‌کند و نسخه‌ی تازه را بدون رفرش دستی فعال می‌کند. */
export default function ServiceWorkerBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

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

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
