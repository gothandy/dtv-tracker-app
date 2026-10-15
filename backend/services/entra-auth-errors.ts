import { environmentName } from '../config';

/** Shown in the UI when TRACKER_ENTRA_CLIENT_SECRET is expired or invalid. */
export const ENTRA_SECRET_UPDATE_MESSAGE = 'Entra ID secret needs updating, see readme.';

/**
 * Shown when this environment's registration is switched off (AADSTS7000112), e.g. the
 * Preview one after the nightly switch-off. Names the registration: "DTV Tracker (Preview)".
 */
export function appDisabledMessage(): string {
  const environment = environmentName();
  // Slots are switched off every night; production only ever by hand.
  const why = environment === 'Production' ? '' : 'This happens each night as an extra security precaution. ';
  return `DTV Tracker (${environment}) is not enabled for users to sign-in. ${why}` +
    'Ask your admin to activate the Entra ID Enterprise Application via properties.';
}

const AUTH_FALLBACK_MESSAGE = 'Failed to authenticate with SharePoint';

/** Map Entra client-credentials failures to a short user-facing message. */
export function mapClientCredentialsAuthError(error: unknown): string {
  const data = (error as { response?: { data?: { error_description?: string; error?: string } } })?.response?.data;
  const description = String(
    data?.error_description ?? data?.error ?? (error as { message?: string })?.message ?? '',
  );
  // AADSTS7000112 = the app is disabled (Enterprise application switched off)
  if (description.includes('AADSTS7000112') || /application .* is disabled/i.test(description)) {
    return appDisabledMessage();
  }
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
  if (message === ENTRA_SECRET_UPDATE_MESSAGE || message === AUTH_FALLBACK_MESSAGE || message === appDisabledMessage()) return true;
  const mapped = mapClientCredentialsAuthError(error);
  return mapped === ENTRA_SECRET_UPDATE_MESSAGE || mapped === appDisabledMessage();
}

/**
 * The message to show people when the app's own key is the problem (switched off, or its
 * secret expired), or null when it's something else and a retry may help.
 */
export function appKeyProblemMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : '';
  if (message === ENTRA_SECRET_UPDATE_MESSAGE || message === appDisabledMessage()) return message;
  const mapped = mapClientCredentialsAuthError(error);
  return mapped === ENTRA_SECRET_UPDATE_MESSAGE || mapped === appDisabledMessage() ? mapped : null;
}
