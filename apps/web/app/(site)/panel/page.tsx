import { permanentRedirect } from "next/navigation";

/** پنل کاربری به «من» منتقل شده است (فاز ۲، صفحهٔ ۹) */
export default function PanelRedirect() {
  permanentRedirect("/me");
}
