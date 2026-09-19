import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import '../styles/interface.css';

const preferenceKey = 'sa-care-reduced-motion';
const InterfaceContext = createContext({
  reducedMotion: false,
  systemReducedMotion: false,
  setReducedMotion: (_value: boolean) => {},
});

export function InterfaceProvider({ children }: { children: ReactNode }) {
  const [userReduced, setUserReduced] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(preferenceKey) === 'true'; }
    catch { return false; }
  });
  const [systemReduced, setSystemReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reducedMotion = userReduced || systemReduced;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiMotion = reducedMotion ? 'reduced' : 'full';
    try { localStorage.setItem(preferenceKey, String(userReduced)); } catch { /* In-memory preference still works when storage is unavailable. */ }
  }, [reducedMotion, userReduced]);

  return <InterfaceContext.Provider value={{ reducedMotion, systemReducedMotion: systemReduced, setReducedMotion: setUserReduced }}>
    <div className="care-interface" data-care-interface="true">{children}</div>
  </InterfaceContext.Provider>;
}

export const useInterface = () => useContext(InterfaceContext);
