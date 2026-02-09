/**
 * Centralized auth header helper.
 *
 * Prefers a wallet JWT stored in localStorage (set after server-side
 * signature verification).  Falls back to the static VITE_API_KEY for
 * backward compatibility during the migration period.
 */

export function getAuthHeaders(): Record<string, string> {
  // 1. Try JWT from localStorage
  const jwt = localStorage.getItem('accessToken');
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }

  // 2. Fall back to static API key
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }

  // 3. No credentials available
  return {};
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
