import { addToQueue, processQueue } from './syncQueue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

const CACHE_NAME = 'rpm-tracker-api-cache';

export const getAuthHeader = () => {
  const token = localStorage.getItem('rpm-tracker-auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const getCacheKey = (url: string, options: RequestInit) => {
  return `${options.method || 'GET'}:${url}`;
};

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = getAuthHeader();
  if (authHeader.Authorization) {
    headers['Authorization'] = authHeader.Authorization;
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const cacheKey = getCacheKey(url, options);

  // CRITICAL for testing: check navigator.onLine to honor browser "Offline" mode for localhost
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  // For GET requests, try to return cached data if offline
  if (method === 'GET') {
    if (isOffline) {
      console.log('[API] Browser is Offline, looking for cache for:', url);
      const cached = localStorage.getItem(`${CACHE_NAME}:${cacheKey}`);
      if (cached) {
        return JSON.parse(cached).data;
      }
      throw new Error('Network error and no cached data available. Please check your connection.');
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        // Only logout on 401 (Unauthorized) or if token explicitly expired/invalid. 
        // 403 (Forbidden) should NOT logout the user; it just means they lack a specific permission for that resource.
        if (response.status === 401 || errorData.message?.toLowerCase().includes('expired') || errorData.message?.toLowerCase().includes('token')) {
          localStorage.removeItem('rpm-tracker-auth-token');
          localStorage.removeItem('rpm-tracker-auth-refresh');
          localStorage.removeItem('rpm-tracker-auth-user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        throw new Error(errorData.message || (response.status === 403 ? "Permission denied" : "Session expired"));
      }

      if (response.ok) {
        const data = await response.json();
        // Save to cache for offline use
        localStorage.setItem(`${CACHE_NAME}:${cacheKey}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        // NOTE: Do NOT call processQueue here — it creates an infinite loop:
        // fetchLoans → apiRequest (GET) → processQueue → isSyncing state change → fetchLoans → ...
        return data;
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    } catch (error: any) {
      // If we get here, fetch failed (not a 4xx/5xx from server, but a network error)
      const cached = localStorage.getItem(`${CACHE_NAME}:${cacheKey}`);
      if (cached) {
        console.log('Returning cached data for:', url);
        return JSON.parse(cached).data;
      }
      throw new Error('Network error and no cached data available. Please check your connection.');
    }
  }

  // For non-GET requests (POST, PUT, DELETE)
  // CRITICAL for testing: check navigator.onLine BEFORE fetch to honor browser "Offline" mode for localhost
  if (isOffline) {
    console.warn('[API] Blocked request because browser is Offline:', endpoint);
    if (endpoint !== '/sync' && !endpoint.includes('/auth/')) {
        addToQueue(endpoint, options);
        throw new Error('You are currently offline. This action has been queued and will be synced when you are back online.');
    }
    throw new Error('Network error: Browser is offline.');
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 || errorData.message?.toLowerCase().includes('expired') || errorData.message?.toLowerCase().includes('token')) {
        localStorage.removeItem('rpm-tracker-auth-token');
        localStorage.removeItem('rpm-tracker-auth-refresh');
        localStorage.removeItem('rpm-tracker-auth-user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      const e = new Error(errorData.message || (response.status === 403 ? "Permission denied" : "Session expired"));
      (e as any).status = response.status;
      throw e;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const e = new Error(errorData.message || `API error: ${response.status}`);
      (e as any).status = response.status;
      throw e;
    }

    return response.json();
  } catch (error: any) {
    // If we have a 'status', it means it was a server-side error we already handled
    if (error.status) throw error;

    // Otherwise, assume it's a network failure and queue it
    if (endpoint !== '/sync' && !endpoint.includes('/auth/')) {
        addToQueue(endpoint, options);
        throw new Error('You are currently offline. This action has been queued and will be synced when you are back online.');
    }
    throw new Error('Network error: Please check your connection.');
  }
};

// Auto-sync the queue is managed by syncQueue.initSync().
// Do NOT call processQueue here — it creates feedback loops.
