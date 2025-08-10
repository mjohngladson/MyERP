import React, { createContext, useContext } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const NetworkStatusContext = createContext();

export const NetworkStatusProvider = ({ children }) => {
  const networkStatus = useNetworkStatus();
  
  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkContext = () => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkContext must be used within a NetworkStatusProvider');
  }
  return context;
};

export default NetworkStatusProvider;