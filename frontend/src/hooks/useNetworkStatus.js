import { useState, useEffect } from 'react';
import { networkUtils } from '../services/api';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [lastChecked, setLastChecked] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkServerConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    const checkServerConnection = async () => {
      try {
        const reachable = await networkUtils.checkConnection();
        setIsServerReachable(reachable);
        setLastChecked(new Date());
      } catch (error) {
        setIsServerReachable(false);
        setLastChecked(new Date());
      }
    };

    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check server connection on mount
    if (isOnline) {
      checkServerConnection();
    }

    // Set up periodic server check (every 30 seconds when online)
    const interval = isOnline ? setInterval(checkServerConnection, 30000) : null;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  const recheckConnection = async () => {
    if (isOnline) {
      const reachable = await networkUtils.checkConnection();
      setIsServerReachable(reachable);
      setLastChecked(new Date());
      return reachable;
    }
    return false;
  };

  return {
    isOnline,
    isServerReachable,
    isConnected: isOnline && isServerReachable,
    lastChecked,
    recheckConnection
  };
};

export default useNetworkStatus;