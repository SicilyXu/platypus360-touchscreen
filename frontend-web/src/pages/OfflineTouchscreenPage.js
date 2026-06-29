/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useContext, useRef } from 'react';
import AppContext from '../context/AppContext';
import MainPage from './MainPage';

const OfflineTouchscreenPage = ({ venueId, isOnline = true }) => {
  const [initialData, setInitialData] = useState(null);
  const [downloading, setDownloading] = useState(true);
  const [error, setError] = useState(false);

  const { injectOfflineData } = useContext(AppContext);

  const renderCount = useRef(0);
  renderCount.current += 1;
  const latestDataRef = useRef(null);

  useEffect(() => {
    latestDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    console.log('[OfflinePage] Mounted');
    return () => console.log('[OfflinePage] Unmounted');
  }, []);

  useEffect(() => {
    if (!venueId) return undefined;

    console.log(`[OfflinePage] Preparing data load for venueId=${venueId}, isOnline=${isOnline}`);

    let active = true;
    let timerId = null;

    setInitialData(null);
    latestDataRef.current = null;
    setDownloading(true);
    setError(false);

    const handleDownloadFinish = async (payload) => {
      if (!active) return;
      const success = typeof payload === 'object' && payload !== null
        ? Boolean(payload.success)
        : payload !== false;

      if (!success) {
        console.warn('[OfflinePage] Download finished with errors, keeping existing data.json');
        if (!latestDataRef.current) {
          setError(true);
          setDownloading(false);
        }
        return;
      }

      try {
        const data = await window.api.readLocalData(venueId);
        if (!active) return;
        latestDataRef.current = data;
        setInitialData(data);
        setError(false);
        setDownloading(false);
        console.log('[OfflinePage] Data refreshed from local bundle');
      } catch (err) {
        if (!active) return;
        console.error('[OfflinePage] Failed to read local data after download:', err);
        if (!latestDataRef.current) {
          setError(true);
          setDownloading(false);
        }
      }
    };

    const removeListener = window.api.onDownloadFinish(handleDownloadFinish);

    const handleLocalDataMissing = (message, err) => {
      if (!active) return;
      if (err) {
        console.warn(message, err);
      } else {
        console.warn(message);
      }
      if (!isOnline) {
        setError(true);
        setDownloading(false);
      } else {
        setDownloading(true);
      }
    };

    const loadLocalData = async () => {
      try {
        const data = await window.api.readLocalData(venueId);
        if (!active) return;
        const hasData = data && Object.keys(data).length > 0;
        if (hasData) {
          latestDataRef.current = data;
          setInitialData(data);
          setError(false);
          setDownloading(false);
          console.log('[OfflinePage] Loaded local data.json');
        } else {
          handleLocalDataMissing(`[OfflinePage] Local data.json is empty for venue ${venueId}`);
        }
      } catch (err) {
        if (!active) return;
        handleLocalDataMissing('[OfflinePage] Failed to read local data before update:', err);
      }
    };

    loadLocalData().finally(() => {
      if (!active) return;
      if (isOnline) {
        timerId = setTimeout(() => {
          window.api.downloadVenueData(venueId).catch(err => {
            if (!active) return;
            console.error('[OfflinePage] downloadVenueData failed:', err);
            if (!latestDataRef.current) {
              setError(true);
              setDownloading(false);
            }
          });
        }, 2000);
      } else {
        console.log('[OfflinePage] Offline mode detected, skipping auto download');
      }
    });

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (typeof removeListener === 'function') {
        removeListener();
      }
    };
  }, [venueId, isOnline]);

  useEffect(() => {
    if (initialData) {
      injectOfflineData(initialData, venueId);
    }
  }, [initialData, injectOfflineData, venueId]);

  if (downloading) {
    return <div style={{ padding: 32, fontSize: '1.5rem' }}>Downloading venue data, please wait...</div>;
  }
  if (error || !initialData) {
    return <div style={{ padding: 32, fontSize: '1.5rem', color: 'red' }}>Failed to load venue data</div>;
  }

  return (
    <MainPage initialData={initialData} />
  );
};

export default OfflineTouchscreenPage;
