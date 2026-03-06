
export function getAuthHeaders(): Record<string, string> {
  const jwt = localStorage.getItem('accessToken');
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  return {};
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
