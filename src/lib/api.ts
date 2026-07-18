
export function getAuthHeaders(): Record<string, string> {
  const jwt = localStorage.getItem('accessToken');
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  return {};
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Decode a JWT payload segment. JWT segments are base64url (may contain `-`/`_`
 * and lack padding), so plain atob() throws on some tokens; normalize first.
 * Returns null on malformed input instead of throwing.
 */
export function decodeJwtPayload(token: string): any | null {
  try {
    const seg = token.split('.')[1];
    if (!seg) return null;
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Try to refresh the access token using the stored refresh token.
 * Returns true if the token was refreshed successfully.
 *
 * Single-flight: concurrent callers (a page firing several authed requests that
 * all 401 at once) share one refresh call, so they don't each POST the same
 * refresh token — the backend rotates it, so the losers would otherwise submit
 * an already-consumed token and invalidate the session.
 */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Wrapper around fetch that automatically retries once on 401
 * after refreshing the JWT token.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  // Try refreshing the token
  const refreshed = await tryRefreshToken();
  if (!refreshed) return res;

  // Retry with new token
  const newHeaders = new Headers(init?.headers);
  newHeaders.set('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
  return fetch(input, { ...init, headers: newHeaders });
}
