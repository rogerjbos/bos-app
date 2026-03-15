
export function getAuthHeaders(): Record<string, string> {
  const jwt = localStorage.getItem('accessToken');
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  return {};
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Try to refresh the access token using the stored refresh token.
 * Returns true if the token was refreshed successfully.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
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
