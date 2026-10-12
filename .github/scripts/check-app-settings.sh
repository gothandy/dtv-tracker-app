#!/usr/bin/env bash
# Fails if the App Service (or slot) is missing any setting in backend/required-settings.json,
# or has one with an empty value (the app treats empty as missing).
# Values are only tested for being empty; they are never printed.
#
# Usage: check-app-settings.sh <resource-group> <app-name> [slot]
set -euo pipefail

RG="$1"; APP="$2"; SLOT="${3:-}"
SLOT_ARGS=()
[ -n "$SLOT" ] && SLOT_ARGS=(--slot "$SLOT")

# Names of settings with a non-blank value.
PRESENT=$(az webapp config appsettings list --resource-group "$RG" --name "$APP" "${SLOT_ARGS[@]}" -o json |
  jq -r '.[] | select((.value // "") | test("\\S")) | .name')
MISSING=()
for NAME in $(jq -r '.[]' backend/required-settings.json); do
  grep -qx "$NAME" <<< "$PRESENT" || MISSING+=("$NAME")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "::error::$APP${SLOT:+ ($SLOT)} is missing settings (or they're empty): ${MISSING[*]}. Add them in Azure (Environment variables) before deploying. See docs/configuration.md"
  exit 1
fi
echo "All required settings are present on $APP${SLOT:+ ($SLOT)}."
