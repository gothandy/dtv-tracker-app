#!/usr/bin/env bash
# Fails if the App Service (or slot) is missing any setting in backend/required-settings.json.
# Only setting names are read, never values.
#
# Usage: check-app-settings.sh <resource-group> <app-name> [slot]
set -euo pipefail

RG="$1"; APP="$2"; SLOT="${3:-}"
SLOT_ARGS=()
[ -n "$SLOT" ] && SLOT_ARGS=(--slot "$SLOT")

PRESENT=$(az webapp config appsettings list --resource-group "$RG" --name "$APP" "${SLOT_ARGS[@]}" --query "[].name" -o tsv)
MISSING=()
for NAME in $(jq -r '.[]' backend/required-settings.json); do
  grep -qx "$NAME" <<< "$PRESENT" || MISSING+=("$NAME")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "::error::$APP${SLOT:+ ($SLOT)} is missing settings: ${MISSING[*]}. Add them in Azure (Environment variables) before deploying. See docs/configuration.md"
  exit 1
fi
echo "All required settings are present on $APP${SLOT:+ ($SLOT)}."
