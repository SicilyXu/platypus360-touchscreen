import React, { useEffect, useState } from 'react';
import './App.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import 'bootstrap/dist/css/bootstrap.min.css';

import SelectVenuePage from './pages/SelectVenuePage';
import OfflineTouchscreenPage from './pages/OfflineTouchscreenPage';
import MainPage from './pages/MainPage';

function App() {
  const [venueId, setVenueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.navigator?.onLine ?? true;
  });

  const isElectron = typeof window !== 'undefined' && !!window.api?.getConfig;

  useEffect(() => {
    console.log('App useEffect: checking if in Electron environment');
    (async () => {
      if (isElectron) {
        try {
          const cfg = await window.api.getConfig();
          console.log('[App.js] Loaded config.json:', cfg);
          if (cfg?.venueId) {
            setVenueId(cfg.venueId);
            console.log('[App.js] Using venueId from config:', cfg.venueId);
          }
        } catch (e) {
          console.warn('Failed to read config.json:', e);
        }
      }
      setLoading(false);
    })();
  }, [isElectron]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateNetworkStatus = () => {
      const online = window.navigator?.onLine ?? true;
      console.log('[App.js] Network status changed:', online ? 'online' : 'offline');
      setIsOnline(online);
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    const handle = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handle);
    return () => document.removeEventListener('contextmenu', handle);
  }, []);

  if (loading) return null;
  console.log('[App.js] App rendered');

  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/venue/" element={<MainPage />} />
          <Route
            path="/"
            element={(() => {
              if (!isElectron) {
                return <SelectVenuePage isOnline={isOnline} />;
              }

              if (!isOnline) {
                if (!venueId) {
                  console.log('[App.js] Offline with no venueId configured');
                  return (
                    <div style={{ padding: '3rem', fontSize: '1.5rem' }}>
                      <h2 style={{ marginBottom: '1rem' }}>离线模式</h2>
                      <p>No venue is configured yet. Please reconnect and try again.</p>
                    </div>
                  );
                }

                console.log('[App.js] Offline but venueId is present, loading local data');
                return (
                  <OfflineTouchscreenPage
                    venueId={venueId}
                    isOnline={isOnline}
                    onClearVenue={async () => {
                      await window.api?.setConfig?.(null);
                      localStorage.removeItem('selectedVenueId');
                      setVenueId(null);
                    }}
                  />
                );
              }

              if (venueId) {
                console.log('[App.js] Online and venueId is present, loading offline bundle');
                return (
                  <OfflineTouchscreenPage
                    venueId={venueId}
                    isOnline={isOnline}
                    onClearVenue={async () => {
                      await window.api?.setConfig?.(null);
                      localStorage.removeItem('selectedVenueId');
                      setVenueId(null);
                    }}
                  />
                );
              }

              console.log('[App.js] Online with no venueId, navigating to SelectVenuePage');
              return (
                <SelectVenuePage
                  isOnline={isOnline}
                  onDownloaded={async (id) => {
                    console.log('Venue downloaded, setting venueId:', id);
                    await window.api?.setConfig?.(id);
                    localStorage.setItem('selectedVenueId', id);
                    setVenueId(id);
                  }}
                />
              );
            })()}
          />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;

