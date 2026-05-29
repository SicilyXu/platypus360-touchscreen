/* eslint-disable react-hooks/exhaustive-deps */
// 离线模式页面 —— 拉取并注入数据后正式渲染 MainPage
import React, { useEffect, useState, useContext, useRef } from 'react';
import AppContext from '../context/AppContext';
import MainPage from './MainPage';

const OfflineTouchscreenPage = ({ venueId }) => {
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

  // 记录页面生命周期
  useEffect(() => {
    // console.log('[OfflineTouchscreenPage] Mounted');
    return () => {
      // console.log('[OfflineTouchscreenPage] Unmounted');
    };
  }, []);

  // 拉取并读取本地数据，仅依赖 venueId
  useEffect(() => {
    console.log('[OfflinePage] Mounted');
    return () => console.log('[OfflinePage] Unmounted');
  }, []);

  // 只在 venueId 变化时读取本地数据，网络状态变化不应重置当前页面
  useEffect(() => {
    if (!venueId) return undefined;
    console.log(`[OfflinePage] Preparing local data load for venueId=${venueId}`);

    let active = true;

    setInitialData(null);
    latestDataRef.current = null;
    setDownloading(true);
    setError(false);

    const handleLocalDataMissing = (message, err) => {
      if (!active) return;
      if (err) {
        console.warn(message, err);
      } else {
        console.warn(message);
      }
      const online = typeof window !== 'undefined' ? (window.navigator?.onLine ?? true) : true;
      if (!online) {
        setError(true);
        setDownloading(false);
        return;
      }

      window.api.downloadVenueData(venueId)
        .then(async () => {
          if (!active) return;
          const data = await window.api.readLocalData(venueId);
          if (!active) return;
          const hasData = data && Object.keys(data).length > 0;
          if (!hasData) {
            setError(true);
            setDownloading(false);
            return;
          }
          latestDataRef.current = data;
          setInitialData(data);
          setError(false);
          setDownloading(false);
          console.log('[OfflinePage] Downloaded missing local bundle');
        })
        .catch(downloadErr => {
          if (!active) return;
          console.error('[OfflinePage] Failed to download missing local bundle:', downloadErr);
          setError(true);
          setDownloading(false);
        });
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

    loadLocalData();

    return () => {
      active = false;
    };
  }, [venueId]);


  // 注入离线数据到 context，只在 initialData 有效时执行一次
  // 传入 venueId（来自 config.json）确保 offlineMode 判断基于已知的 venue，
  // 不依赖 data.json 内部的 basicInfo.id（该字段可能为空）
  useEffect(() => {
    if (initialData) {
      injectOfflineData(initialData, venueId);
      // console.log('[OfflineTouchscreenPage] Data injected to AppContext');
    }
  }, [initialData, injectOfflineData, venueId]);

  // 渲染逻辑：下载中 / 错误 / 成功
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
