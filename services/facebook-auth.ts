/**
 * Facebook OAuth 2.0 helper
 *
 * DIY implementation using native fetch — no additional npm packages required.
 * Implements the standard authorization code flow:
 *   1. Redirect user to Facebook's auth page
 *   2. Exchange the returned code for an access token
 *   3. Fetch the user's email and display name
 *
 * Requires env vars: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
 */

// Use m.facebook.com to prevent Android's intent system routing this to the Facebook
// native app (which claims www.facebook.com but not m.facebook.com). Without this,
// the OAuth callback lands in the Facebook app's own WebView — a different cookie context
// from Chrome — so the session is never visible to the browser that started the flow.
const FACEBOOK_AUTH_URL  = 'https://m.facebook.com/v19.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FACEBOOK_USER_URL  = 'https://graph.facebook.com/me';

export function getFacebookRedirectUri(req: { protocol: string; get(name: string): string | undefined }): string {
  return `${req.protocol}://${req.get('host')}/auth/facebook/callback`;
}

export function getFacebookAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'email,public_profile',
    state,
  });
  return `${FACEBOOK_AUTH_URL}?${params}`;
}

export async function exchangeFacebookCode(
  code: string,
  redirectUri: string,
): Promise<{ email: string | null; name: string; id: string }> {
  // Exchange auth code for access token
  const tokenParams = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri:  redirectUri,
    code,
  });
  const tokenRes = await fetch(`${FACEBOOK_TOKEN_URL}?${tokenParams}`);
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Facebook token exchange failed: ${tokenRes.status} ${text}`);
  }
  const tokenData = await tokenRes.json() as { access_token: string };

  // Fetch user info — email is not always present
  const userParams = new URLSearchParams({
    fields:       'id,name,email',
    access_token: tokenData.access_token,
  });
  const userRes = await fetch(`${FACEBOOK_USER_URL}?${userParams}`);
  if (!userRes.ok) {
    throw new Error(`Facebook user info fetch failed: ${userRes.status}`);
  }
  const user = await userRes.json() as { id: string; name: string; email?: string };

  return { email: user.email ?? null, name: user.name, id: user.id };
}
