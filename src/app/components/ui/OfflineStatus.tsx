import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all duration-500 transform scale-100 ${
        isOnline 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-80' 
          : 'bg-red-50 text-red-700 border-red-200 animate-bounce'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">EN LIGNE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase text-red-600">HORS-LIGNE</span>
          </>
        )}
      </div>
    </div>
  );
}
