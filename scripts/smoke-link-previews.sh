#!/usr/bin/env bash
# Post-deploy smoke test for link previews on app collection URLs
# (spec 002, ADR-0002). Run right after every production deploy:
#
#   ./scripts/smoke-link-previews.sh https://moto.pspipes.net <clubId> <publicCollectionId>
#
# For a protected Vercel preview, export VERCEL_BYPASS=<Protection Bypass for
# Automation token> first. Exits non-zero if any check fails; then use Vercel's
# Instant Rollback (see specs/002-app-link-previews/quickstart.md).
set -u

BASE="${1:?usage: $0 <base-url> <clubId> <publicCollectionId>}"
CLUB="${2:?clubId required}"
ID="${3:?publicCollectionId required}"
BASE="${BASE%/}"

CRAWLER='facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
PERSON='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
APP_TITLE='Motoclub Connect'

curl_args=(-s --max-time 15)
if [ -n "${VERCEL_BYPASS:-}" ]; then
  curl_args+=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}")
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failures=0

# fetch <user-agent> <path>: sets STATUS, LOCATION, TITLE
fetch() {
  STATUS="$(curl "${curl_args[@]}" -A "$1" -D "$tmp/head" -o "$tmp/body" -w '%{http_code}' "$BASE$2")"
  LOCATION="$(grep -i '^location:' "$tmp/head" | tr -d '\r' | cut -d' ' -f2-)"
  TITLE="$(grep -oE '<title>[^<]*</title>' "$tmp/body" | head -1 | sed -E 's#</?title>##g')"
}

check() { # check <name> <condition-result 0/1> <detail>
  if [ "$2" -eq 0 ]; then
    printf 'OK    %s\n' "$1"
  else
    printf 'FAIL  %s (%s)\n' "$1" "$3"
    failures=$((failures + 1))
  fi
}

fetch "$PERSON" "/clubs/$CLUB/collection/$ID"
[ "$STATUS" = 200 ] && [ -z "$LOCATION" ] && [ "$TITLE" = "$APP_TITLE" ]
check "person gets the app, unchanged" $? "status=$STATUS location=${LOCATION:-none} title=$TITLE"

fetch "$CRAWLER" "/clubs/$CLUB/collection/$ID"
preview_title="$TITLE"
[ "$STATUS" = 200 ] && [ -n "$TITLE" ] && [ "$TITLE" != "$APP_TITLE" ]
check "crawler gets the rich preview" $? "status=$STATUS title=$TITLE"

fetch "$CRAWLER" "/clubs/$CLUB/collection/$ID/payment"
[ "$STATUS" = 200 ] && [ "$TITLE" = "$preview_title" ] && [ "$TITLE" != "$APP_TITLE" ]
check "crawler gets it on /payment too" $? "status=$STATUS title=$TITLE"

fetch "$CRAWLER" "/tabs/home"
[ "$STATUS" = 200 ] && [ "$TITLE" = "$APP_TITLE" ]
check "other paths untouched" $? "status=$STATUS title=$TITLE"

if [ "$failures" -gt 0 ]; then
  printf '%d check(s) failed. Consider Vercel Instant Rollback.\n' "$failures"
  exit 1
fi
echo 'All link-preview smoke checks passed.'
