
type PendingRequest = {
  id: string;
  endpoint: string;
  options: RequestInit;
  timestamp: number;
};

const QUEUE_KEY = 'rpm-tracker-sync-queue';

// Robust UUID fallback
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Listeners for sync events
type SyncCallback = (status: 'starting' | 'finished' | 'error', syncedCount?: number) => void;
const listeners: SyncCallback[] = [];

export const addSyncListener = (cb: SyncCallback) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const notifyListeners = (status: 'starting' | 'finished' | 'error', syncedCount?: number) => {
  listeners.forEach(cb => cb(status, syncedCount));
};

export const getQueue = (): PendingRequest[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (e) {
    console.error('[SyncQueue] Failed to parse sync queue', e);
    return [];
  }
};

export const addToQueue = (endpoint: string, options: RequestInit) => {
  const queue = getQueue();
  // Prevent duplicate queuing of the EXACT same request within a 5-second window to prevent accidental double-clicks
  const bodyString = typeof options.body === 'string' ? options.body : '';
  const isTooSoon = queue.some(r => 
    r.endpoint === endpoint && 
    r.options.body === bodyString && 
    (Date.now() - r.timestamp) < 5000
  );
  
  if (isTooSoon) {
    console.log('[SyncQueue] Skipping suspected accidental double-click:', endpoint);
    return;
  }

  const newRequest: PendingRequest = {
    id: generateUUID(),
    endpoint,
    options,
    timestamp: Date.now(),
  };
  queue.push(newRequest);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log('[SyncQueue] Request added to queue:', endpoint, newRequest.id);
};

export const getPendingByEndpoint = (endpointPrefix: string): PendingRequest[] => {
  return getQueue().filter(r => r.endpoint.startsWith(endpointPrefix));
};

// Endpoints that are NOT supported for sync (will never succeed, purge them)
const UNSUPPORTED_SYNC_ENDPOINTS = ['/user/create', '/sync'];

/**
 * Remove queue items that are stale (older than ttlMs) OR match unsupported endpoints.
 * Call this at startup to keep the queue clean.
 */
export const purgeStaleQueue = (ttlMs = 24 * 60 * 60 * 1000) => {
  const queue = getQueue();
  const now = Date.now();
  const cleaned = queue.filter(r => {
    const isUnsupported = UNSUPPORTED_SYNC_ENDPOINTS.some(ep => r.endpoint.startsWith(ep));
    const isExpired = (now - r.timestamp) > ttlMs;
    if (isUnsupported || isExpired) {
      console.log(`[SyncQueue] Purging stale/unsupported item: ${r.endpoint} (id: ${r.id})`);
      return false;
    }
    return true;
  });
  if (cleaned.length !== queue.length) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(cleaned));
    console.log(`[SyncQueue] Purged ${queue.length - cleaned.length} stale item(s). Queue size: ${cleaned.length}`);
  }
};

let isProcessing = false;

export const processQueue = async (apiRequest: Function) => {
  const currentQueue = getQueue();
  if (currentQueue.length === 0 || isProcessing) return;

  // Strict check for DevTools testing - don't try to sync if browser says offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[SyncQueue] Browser is offline, skipping sync attempt.');
    return;
  }

  isProcessing = true;
  notifyListeners('starting');
  console.log(`[SyncQueue] Processing ${currentQueue.length} pending requests...`);
  
  try {
    const response = await apiRequest('/sync', {
      method: 'POST',
      body: JSON.stringify({ 
        requests: currentQueue.map(r => ({
          id: r.id,
          endpoint: r.endpoint,
          method: r.options.method || 'POST',
          body: r.options.body
        })) 
      })
    });

    const results = response.results || [];
    const successIds: string[] = [];

    // Identify which IDs were successfully processed
    currentQueue.forEach(request => {
      const result = results.find((r: any) => r.id === request.id);
      // 2xx status codes mean it reached the DB correctly
      if (result && result.statusCode >= 200 && result.statusCode < 300) {
        successIds.push(request.id);
        console.log(`[SyncQueue] Successfully synced ${request.id} (${request.endpoint})`);
      } else {
        console.error(`[SyncQueue] Sync failed for ${request.id} (${request.endpoint}):`, result?.data?.message || 'Unknown error');
      }
    });

    // CRITICAL: Merge instead of overwrite to avoid losing items added DURING sync
    const freshQueue = getQueue();
    const remainingQueue = freshQueue.filter(item => !successIds.includes(item.id));
    
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    
    const syncedCount = successIds.length;
    if (syncedCount > 0) {
      console.log(`[SyncQueue] Synced ${syncedCount} items.`);
    }
    
    notifyListeners('finished', syncedCount);
  } catch (error) {
    console.error('[SyncQueue] Batch sync failed (network error):', error);
    notifyListeners('error', 0);
  } finally {
    isProcessing = false;
  }
};

export const initSync = (apiRequest: Function) => {
  // Clean up stuck/unsupported items from previous sessions first
  purgeStaleQueue();
  
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('[SyncQueue] Online event! Triggering sync...');
      processQueue(apiRequest);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        processQueue(apiRequest);
      }
    });

    // Delayed initial check to avoid race conditions with initial data fetch
    // Use a longer delay (5s) to ensure DevTools "Offline" state is fully applied
    if (navigator.onLine) {
      setTimeout(() => {
        // Double-check status before actual trigger
        if (navigator.onLine) {
          processQueue(apiRequest);
        }
      }, 5000);
    }
    
    // Periodic check
    setInterval(() => {
        if (navigator.onLine) {
            processQueue(apiRequest);
        }
    }, 120000);
  }
};

export const SyncQueue = {
  getQueue,
  addToQueue,
  getPendingByEndpoint,
  purgeStaleQueue,
  processQueue,
  init: initSync,
  addSyncListener
};
