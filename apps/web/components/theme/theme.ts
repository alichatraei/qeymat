/**
 * ثابت‌های تم — در ماژول بدون "use client" تا layout سروری هم بتواند
 * اسکریپت را به‌صورت رشته بخواند.
 */
export const THEME_KEY = "qeymat-theme";
export const THEME_EVENT = "qeymat-theme";

/**
 * اسکریپتی که پیش از اولین رندر در <head> اجرا می‌شود تا صفحه با تم
 * درست نمایش داده شود و «چشمک» سفید در حالت تیره پیش نیاید.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;if(d)e.classList.add('dark');e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;
