const stamp = () =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Tehran",
  }).format(new Date());

export const log = {
  info: (...args) => console.log(`[${stamp()}]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] ⚠`, ...args),
  error: (...args) => console.error(`[${stamp()}] ✖`, ...args),
};
