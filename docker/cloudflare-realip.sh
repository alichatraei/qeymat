#!/bin/bash
# ---------------------------------------------------------------
# بازیابی آی‌پی واقعی کاربر از پشت کلادفلر.
#
# بدون این، nginx آی‌پی کلادفلر را می‌بیند نه کاربر را — یعنی
# rate limit عملاً همه‌ی کاربران را یک نفر حساب می‌کند.
#
# نصب:
#   sudo cp cloudflare-realip.sh /usr/local/bin/
#   sudo chmod +x /usr/local/bin/cloudflare-realip.sh
#   sudo /usr/local/bin/cloudflare-realip.sh
#
# کلادفلر رنج‌هایش را گاهی عوض می‌کند، پس ماهانه اجرا شود:
#   sudo crontab -e
#   0 4 1 * * /usr/local/bin/cloudflare-realip.sh
# ---------------------------------------------------------------
set -e

OUT=/etc/nginx/conf.d/cloudflare-realip.conf
TMP=$(mktemp)

{
  echo "# ساخته‌شده توسط cloudflare-realip.sh — دستی ویرایش نکنید"
  echo "# آخرین به‌روزرسانی: $(date -u +%FT%TZ)"
  for url in https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6; do
    curl -fsS --max-time 20 "$url" | while read -r cidr; do
      [ -n "$cidr" ] && echo "set_real_ip_from $cidr;"
    done
  done
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$TMP"

# اگر دانلود ناقص بود، فایل سالم قبلی را خراب نکن
if [ "$(grep -c set_real_ip_from "$TMP")" -lt 10 ]; then
  echo "✖ فهرست آی‌پی کلادفلر ناقص دریافت شد؛ تغییری اعمال نشد."
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$OUT"
chmod 644 "$OUT"

nginx -t && systemctl reload nginx
echo "✓ $(grep -c set_real_ip_from "$OUT") رنج کلادفلر اعمال شد"