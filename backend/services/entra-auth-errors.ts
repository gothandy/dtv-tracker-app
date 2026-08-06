/** Shown in the UI when SHAREPOINT_CLIENT_SECRET is expired or invalid. */
export const ENTRA_SECRET_UPDATE_MESSAGE = 'Entra ID secret needs updating, see readme.';

const AUTH_FALLBACK_MESSAGE = 'Failed to authenticate with SharePoint';

/** Map Entra client-credentials failures to a short user-facing message. */
export function mapClientCredentialsAuthError(error: unknown): string {
  const data = (error as { response?: { data?: { error_description?: string; error?: string } } })?.response?.data;
  const description = String(
    data?.error_description ?? data?.error ?? (error as { message?: string })?.message ?? '',
  );
  // AADSTS7000222 = expired secret; AADSTS7000215 = invalid secret value
  if (
    description.includes('AADSTS7000222') ||
    description.includes('AADSTS7000215') ||
    /client secret.*(expired|invalid)/i.test(description)
  ) {
    return ENTRA_SECRET_UPDATE_MESSAGE;
  }
  return AUTH_FALLBACK_MESSAGE;
}

/** True when `error` is already (or maps to) a client-credentials auth message — do not wrap further. */
export function isClientCredentialsAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  if (message === ENTRA_SECRET_UPDATE_MESSAGE || message === AUTH_FALLBACK_MESSAGE) return true;
  return mapClientCredentialsAuthError(error) === ENTRA_SECRET_UPDATE_MESSAGE;
}
