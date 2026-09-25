"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Headset, Loader2, Lock, Send, User as UserIcon } from "lucide-react";
import { jalali, timeAgo } from "@qeymat/shared";

type Message = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
};

const STATUS: Record<string, { label: string; className: string }> = {
  OPEN: { label: "در انتظار پاسخ", className: "state-pending" },
  ANSWERED: { label: "پاسخ داده شد", className: "state-approved" },
  CLOSED: { label: "بسته", className: "chip bg-soft text-sub" },
};

const PRIORITY: Record<string, string> = { LOW: "کم", NORMAL: "عادی", HIGH: "زیاد" };

export default function TicketThread({
  ticket,
  messages: initial,
  isStaff,
}: {
  ticket: Ticket;
  messages: Message[];
  isStaff: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [status, setStatus] = useState(ticket.status);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message);

      // پیام را خوش‌بینانه اضافه می‌کنیم تا گفت‌وگو روان بماند
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          body: body.trim(),
          fromStaff: isStaff,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStatus(isStaff ? "ANSWERED" : "OPEN");
      setBody("");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "ارسال پاسخ انجام نشد.");
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!response.ok) throw new Error();
      setStatus("CLOSED");
      router.refresh();
    } catch {
      setError("بستن تیکت انجام نشد.");
    } finally {
      setSending(false);
    }
  };

  const state = STATUS[status] ?? STATUS.OPEN;

  return (
    <main className="pb-20 pt-10">
      <div className="content-width max-w-[760px]">
        <Link
          href={isStaff ? "/admin" : "/panel?tab=tickets"}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
          بازگشت
        </Link>

        <div className="card mt-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold tracking-[-.5px]">{ticket.subject}</h1>
              <p className="mt-1.5 text-[11.5px] text-muted">
                {ticket.category} · اولویت {PRIORITY[ticket.priority]} · ثبت در{" "}
                {jalali(ticket.createdAt)}
              </p>
            </div>
            <span className={state.className}>{state.label}</span>
          </div>

          <div className="mt-5 space-y-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex gap-3 ${message.fromStaff ? "" : "flex-row-reverse"}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    message.fromStaff ? "bg-green-soft text-green-dark" : "bg-soft text-sub"
                  }`}
                >
                  {message.fromStaff ? (
                    <Headset className="h-4 w-4" />
                  ) : (
                    <UserIcon className="h-4 w-4" />
                  )}
                </span>

                <div
                  className={`min-w-0 max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.fromStaff
                      ? "rounded-tr-md bg-green-soft/70"
                      : "rounded-tl-md border border-line bg-field"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10.5px] text-muted">
                    <b className="text-[11px] text-ink">
                      {message.fromStaff ? "پشتیبانی قیمت" : "شما"}
                    </b>
                    {timeAgo(message.createdAt)}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-7 text-sub">
                    {message.body}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {status === "CLOSED" ? (
            <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-line bg-field p-4 text-[12px] text-muted">
              <Lock className="h-4 w-4 shrink-0" />
              این تیکت بسته شده است. برای موضوع تازه، تیکت جدیدی ثبت کنید.
            </div>
          ) : (
            <div className="mt-6 border-t border-line pt-5">
              <label className="block">
                <span className="mb-1.5 block text-xxs text-sub">پاسخ شما</span>
                <textarea
                  className="field h-28 resize-none py-2.5"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="پاسخ خود را بنویسید…"
                />
              </label>

              {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-solid"
                  onClick={send}
                  disabled={sending || body.trim().length < 2}
                >
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  ارسال پاسخ
                </button>
                <button type="button" className="btn-ghost" onClick={close} disabled={sending}>
                  <Lock />
                  بستن تیکت
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
