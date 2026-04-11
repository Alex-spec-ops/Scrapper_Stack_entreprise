'use client';

import { useEffect, useState } from 'react';
import ErrorOverlay from './ErrorOverlay';

export default function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Vérifie l'état initial (après hydration côté client)
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return <ErrorOverlay mode="network" />;
}
