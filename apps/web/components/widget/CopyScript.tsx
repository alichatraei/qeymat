"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

/** کپی متن اسکریپت ویجت؛ در مرورگری که کلیپ‌بورد ندارد، متن انتخاب می‌شود */
export default function CopyScript({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setOpen(true);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-solid h-11 flex-1">
          {copied ? <Check /> : <Copy />}
          {copied ? "کپی شد" : "کپی اسکریپت"}
        </button>
        <a href="/widget/qeymat.js" download="qeymat.js" className="btn-ghost h-11">
          <Download />
          فایل
        </a>
      </div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="mt-2 text-[11px] font-semibold text-muted hover:text-ink">
        {open ? "پنهان کردن متن اسکریپت" : "نمایش متن اسکریپت"}
      </button>
      {open ? (
        <textarea
          readOnly
          dir="ltr"
          value={script}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 h-56 w-full rounded-xl border border-line bg-field p-3 font-mono text-[10.5px] leading-5 text-sub"
          aria-label="متن اسکریپت ویجت"
        />
      ) : null}
    </div>
  );
}
