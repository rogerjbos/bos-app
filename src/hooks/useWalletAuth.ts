import { useCallback, useEffect, useState } from 'react';

export interface AuthUser {
  sub: string;
  address: string;
  walletType: 'metamask' | 'polkadot';
  chainId?: number;
  nonce: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  wallet_address: string;
}

export function useWalletAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to decode JWT token locally
  const decodeTokenLocally = useCallback((token: string): AuthUser | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        sub: payload.sub,
        address: payload.sub, // wallet address is stored in sub
        walletType: 'metamask', // default, could be enhanced
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        aud: payload.aud,
        nonce: payload.nonce || '',
      };
    } catch (err) {
      console.error('Failed to decode token:', err);
      return null;
    }
  }, []);

  // Check for existing tokens on mount
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && refreshToken) {
      // Verify the token locally
      const userInfo = decodeTokenLocally(accessToken);
      if (userInfo && userInfo.exp > Date.now() / 1000) {
        setUser(userInfo);
        setTokens({ accessToken, refreshToken, idToken: '' });
      } else {
        // Token expired, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
  }, [decodeTokenLocally]);

  const generateChallenge = useCallback(async (address: string, walletType: 'metamask' | 'polkadot') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: address,
          wallet_type: walletType === 'metamask' ? 'ethereum' : 'polkadot'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const { challenge } = await response.json();
      return challenge;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const authenticate = useCallback(async (
    message: string,
    signature: string,
    address: string,
    walletType: 'metamask' | 'polkadot',
    chainId?: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: address,
          signature,
          challenge: message,
          wallet_type: walletType === 'metamask' ? 'ethereum' : 'polkadot',
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const authTokens: AuthTokens = await response.json();

      // Store tokens (handle snake_case from backend)
      localStorage.setItem('accessToken', authTokens.access_token);
      localStorage.setItem('refreshToken', authTokens.refresh_token);

      setTokens(authTokens);

      // Decode and set user info from JWT token locally
      const userInfo = decodeTokenLocally(authTokens.access_token);
      if (userInfo) {
        setUser(userInfo);
      }

      return authTokens;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = useCallback(async (token: string) => {
    // Decode token locally instead of making server request
    const userInfo = decodeTokenLocally(token);
    if (userInfo && userInfo.exp > Date.now() / 1000) {
      setUser(userInfo);
      return userInfo;
    } else {
      logout();
      return null;
    }
  }, [decodeTokenLocally]);

  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const newTokens: AuthTokens = await response.json();

      // Update stored tokens
      localStorage.setItem('accessToken', newTokens.access_token);
      localStorage.setItem('refreshToken', newTokens.refresh_token);

      setTokens(newTokens);

      // Update user info
      const userInfo = await verifyToken(newTokens.access_token);
      return userInfo;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return null;
    }
  }, [verifyToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setTokens(null);
    setError(null);
  }, []);

  const getAccessToken = useCallback(() => {
    return localStorage.getItem('accessToken');
  }, []);

  return {
    user,
    tokens,
    isLoading,
    error,
    isAuthenticated: !!user,
    generateChallenge,
    authenticate,
    verifyToken,
    refreshToken,
    logout,
    getAccessToken,
  };
}

export default useWalletAuth;
