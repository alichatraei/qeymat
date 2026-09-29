#!/usr/bin/env bash
# توضیحات یک نسخه را چاپ می‌کند.
#
# اولویت با پیام خود تگ است (git tag -a v2.1.0 -m "…")؛ این همان متنی است
# که برای نسخه نوشته شده. تگ ساده (بدون پیام) به فهرست کامیت‌ها از تگ قبلی
# برمی‌گردد.
#
# استفاده: release-notes.sh v2.1.0
set -euo pipefail

TAG="$1"

if [ "$(git cat-file -t "$TAG")" = "tag" ]; then
  # بدنه‌ی تگ؛ امضای GPG اگر باشد حذف می‌شود
  NOTES=$(git for-each-ref "refs/tags/$TAG" --format='%(contents)' | sed '/-----BEGIN PGP SIGNATURE-----/,$d')
  if [ -n "$(echo "$NOTES" | tr -d '[:space:]')" ]; then
    printf '%s\n' "$NOTES"
    exit 0
  fi
fi

PREVIOUS=$(git describe --tags --abbrev=0 --match 'v*' "$TAG^" 2>/dev/null || true)
NOTES=$(git log --no-merges --pretty='- %s' "${PREVIOUS:+$PREVIOUS..}$TAG")
printf '%s\n' "${NOTES:-- بهبودهای جزئی}"
