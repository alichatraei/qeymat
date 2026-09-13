"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isLogin ? { email: form.email, password: form.password } : form,
        ),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "انجام نشد.");

      router.push(payload.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  const disabled =
    loading || !form.email.trim() || !form.password.trim() || (!isLogin && !form.name.trim());

  return (
    <main className="content-width grid min-h-[70vh] place-items-center py-16">
      <div className="card w-full max-w-[400px] p-7 shadow-card">
        <h1 className="text-[22px] font-extrabold tracking-[-.6px]">
          {isLogin ? "ورود به حساب" : "ساخت حساب تازه"}
        </h1>
        <p className="mt-2 text-[12px] leading-6 text-muted">
          {isLogin
            ? "برای مدیریت کلید API، مصرف و پرداخت‌ها وارد شوید."
            : "برای دریافت کلید API و پیگیری سفارش‌ها یک حساب بسازید."}
        </p>

        <div className="mt-6 space-y-3">
          {!isLogin ? (
            <label className="block">
              <span className="mb-1.5 block text-xxs text-[#68747c]">نام و نام خانوادگی</span>
              <input
                className="field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xxs text-[#68747c]">ایمیل</span>
            <input
              className="field"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xxs text-[#68747c]">گذرواژه</span>
            <input
              className="field"
              dir="ltr"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              onKeyDown={(event) => event.key === "Enter" && !disabled && submit()}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {!isLogin ? (
              <small className="mt-1.5 block text-2xs text-muted">حداقل ۸ کاراکتر.</small>
            ) : null}
          </label>
        </div>

        {error ? <p className="mt-3 text-[11.5px] text-danger">{error}</p> : null}

        <button type="button" className="btn-solid mt-5 w-full" onClick={submit} disabled={disabled}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          {isLogin ? "ورود" : "ساخت حساب"}
        </button>

        <p className="mt-5 text-center text-[11.5px] text-muted">
          {isLogin ? "حساب ندارید؟ " : "قبلاً ثبت‌نام کرده‌اید؟ "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-semibold text-green-dark hover:underline"
          >
            {isLogin ? "ثبت‌نام کنید" : "وارد شوید"}
          </Link>
        </p>
      </div>
    </main>
  );
}
