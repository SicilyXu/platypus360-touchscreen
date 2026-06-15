import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getVenueBasicInfo,
  getVenueContentTree,
  getVenueAdvs,
  getVenueVideos,
  getFlights,
  getWeather,
  getNews,
  getTides,
  getVLine
} from '../api';

const AppContext = createContext();

const getLocalLiveInfoOverride = (venueId) => {
  if (!venueId || typeof window === 'undefined') return '';

  try {
    const queryOverride = (() => {
      const directParams = new URLSearchParams(window.location.search || '');
      const directValue = directParams.get('force_live_info');
      if (directValue) return directValue;

      const hash = window.location.hash || '';
      const hashQueryIndex = hash.indexOf('?');
      if (hashQueryIndex >= 0) {
        const hashQuery = hash.slice(hashQueryIndex + 1);
        return new URLSearchParams(hashQuery).get('force_live_info');
      }

      return '';
    })();

    if (queryOverride) return queryOverride.toLowerCase();

    const storageOverride = window.localStorage?.getItem(`ts_live_info_override_${venueId}`);
    if (storageOverride) return storageOverride.toLowerCase();
  } catch (err) {
    console.warn('[AppContext] Failed to read local liveInfo override:', err);
  }

  return '';
};

const applyLocalLiveInfoOverride = (basicInfo, venueId) => {
  if (!basicInfo) return basicInfo;

  const override = getLocalLiveInfoOverride(venueId);
  if (!override) return basicInfo;

  return {
    ...basicInfo,
    landing: {
      ...(basicInfo.landing || {}),
      liveInfo: override,
    },
  };
};

export const AppProvider = ({ children }) => {
  const [venueId, setVenueId] = useState('');
  const [venueBasicInfo, setVenueBasicInfo] = useState(null);
  const [contentTree, setContentTree] = useState([]);
  const [venueAdvs, setVenueAdvs] = useState([]);
  const [venueVideos, setVenueVideos] = useState([]);
  const [flightsData, setFlightsData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [tidesData, setTidesData] = useState([]);
  const [vlineData, setVLineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fallbackImage, setFallbackImage] = useState('/images/main/touch_and_explore_banner.jpg');


  // 防止注入离线数据时 venueId 被重复 set 导致死循环
  const injectedVenueId = useRef(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = Boolean(venueBasicInfo)
      || (Array.isArray(contentTree) && contentTree.length > 0)
      || (Array.isArray(venueAdvs) && venueAdvs.length > 0)
      || (Array.isArray(venueVideos) && venueVideos.length > 0)
      || (Array.isArray(flightsData) && flightsData.length > 0)
      || (Array.isArray(weatherData) && weatherData.length > 0)
      || (Array.isArray(newsData) && newsData.length > 0)
      || (Array.isArray(tidesData) && tidesData.length > 0)
      || (Array.isArray(vlineData) && vlineData.length > 0);
  }, [
    venueBasicInfo,
    contentTree,
    venueAdvs,
    venueVideos,
    flightsData,
    weatherData,
    newsData,
    tidesData,
    vlineData,
  ]);

  // 注入离线数据（用 useCallback 保证函数引用稳定）
  const injectOfflineData = useCallback((data, venueIdOverride = '') => {
    if (!data) return;
    const newVenueId = venueIdOverride || data.venueId || data.basicInfo?.id || '';
    if (injectedVenueId.current === newVenueId) {
      // 已注入过该场馆数据，直接跳过
      return;
    }
    injectedVenueId.current = newVenueId;

    // ...原有的处理逻辑
    // const fixImagePath = (imgPath) => {
    //   if (!imgPath) return '';
    //   if (imgPath.startsWith('file://')) {
    //     const parts = imgPath.split(/[/\\]+/);
    //     const idx = parts.findIndex(p => p === 'venueData');
    //     return idx >= 0 ? parts.slice(idx).join('/') : imgPath;
    //   }
    //   return imgPath;
    // };

    const fallbackBanner = '/images/main/touch_and_explore_banner.jpg';
    const fixImagePath = (imgPath) => {
      if (!imgPath) return '';
      if (imgPath.startsWith('file://')) return imgPath;
      return imgPath;
    };

    const fixedAdvs = (data.venueAdvs || data.ads || []).map(adv => ({
      ...adv,
      image: fixImagePath(adv.image),
      specialImage: fixImagePath(adv.specialImage),
    }));

    const fixedVideos = (data.venueVideos || data.videos || []).map(v => ({
      ...v,
      publicLink: fixImagePath(v.publicLink || v.url),
    }));

    const fixedContentTree = data.contentTree || data['ts-content-tree'] || [];
    const rawBasic = (
      data.venueBasicInfo ||
      data['basic-info'] ||
      (typeof data.basicInfo === 'object' && data.basicInfo) || {}
    );

    const fixedSlides = (rawBasic.landing?.venueSlides || []).map(fixImagePath);
    const fixedLogo = fixImagePath(rawBasic.landing?.venueLogo);

    setFallbackImage(fixedLogo || fallbackBanner);

    const fixedBasicInfo = applyLocalLiveInfoOverride({
      ...rawBasic,
      status: rawBasic.status || 'active',
      validity: rawBasic.validity || { isActive: true, statusLogs: [] },
      landing: {
        ...(rawBasic.landing || {}),
        venueSlides: fixedSlides,
        venueLogo: fixedLogo,
      },
      theme: {
        ...(rawBasic.theme || {}),
        standard: rawBasic.theme?.standard || '#234B92',
        light: rawBasic.theme?.light || '#ffffff',
        dark: rawBasic.theme?.dark || '#000000',
      },
    }, newVenueId);

    const live = data.liveInfo || {};
    const fixedFlights = live.flights || data.flights || [];
    const fixedWeather = live.weather || data.weather || [];
    const fixedNews = live.news || data.news || [];
    const fixedTides = live.tides || data.tides || [];
    const fixedVLine = live.vline || data.vline || [];

    // 【核心】venueId 只 set 一次
    setVenueId(newVenueId);
    setVenueBasicInfo(fixedBasicInfo);
    setContentTree(fixedContentTree);
    setVenueAdvs(fixedAdvs);
    setVenueVideos(fixedVideos);
    setFlightsData(fixedFlights);
    setWeatherData(fixedWeather);
    setNewsData(fixedNews);
    setTidesData(fixedTides);
    setVLineData(fixedVLine);
    setError('');
    setLoading(false);

  }, []);

  // 线上数据加载（通过 venueId）
  useEffect(() => {
    if (!venueId) {
      setVenueBasicInfo(null);
      setContentTree([]);
      setVenueAdvs([]);
      setVenueVideos([]);
      setFlightsData([]);
      setNewsData([]);
      setWeatherData([]);
      setTidesData([]);
      setVLineData([]);
      setError('');
      return;
    }

    const hasExistingData = hasDataRef.current;
    const offlineBundleMode = injectedVenueId.current === venueId;
    if (!hasExistingData) {
      setLoading(true);
    }
    setError('');

    Promise.allSettled([
      getVenueBasicInfo(venueId),
      getVenueContentTree(venueId),
      getVenueAdvs(venueId),
      getVenueVideos(venueId),
      getFlights(venueId),
      getWeather(venueId),
      getNews(venueId),
      getTides(venueId),
      getVLine(venueId)
    ])
      .then(([basicRes, contentTreeRes, advsRes, videosRes, flightsRes, weatherRes, newsRes, tidesRes, vlineRes]) => {
        if (basicRes.status === 'fulfilled' && basicRes.value && !offlineBundleMode) {
          const info = applyLocalLiveInfoOverride(basicRes.value, venueId);
          setVenueBasicInfo(info);
          const logo = info?.landing?.venueLogo;
          const cleanedLogo = typeof logo === 'string' ? logo.trim() : '';
          const isValidHttpUrl = (url) => /^https?:\/\/.+/.test(url);
          setFallbackImage(
            isValidHttpUrl(cleanedLogo)
              ? cleanedLogo
              : '/images/main/touch_and_explore_banner.jpg'
          );
        }
        if (contentTreeRes.status === 'fulfilled' && !offlineBundleMode) setContentTree(contentTreeRes.value || []);
        if (advsRes.status === 'fulfilled' && !offlineBundleMode) setVenueAdvs(advsRes.value || []);
        if (videosRes.status === 'fulfilled' && !offlineBundleMode) setVenueVideos(videosRes.value || []);
        if (flightsRes.status === 'fulfilled') setFlightsData(flightsRes.value || []);
        if (weatherRes.status === 'fulfilled') setWeatherData(weatherRes.value || []);
        if (newsRes.status === 'fulfilled') setNewsData(newsRes.value || []);
        if (tidesRes.status === 'fulfilled') setTidesData(tidesRes.value || []);
        if (vlineRes.status === 'fulfilled') {
          setVLineData(vlineRes.value || []);
        } else {
          setVLineData([]);
        }
      })
      .catch(err => {
        console.error('Venue load error:', err);
        if (!hasDataRef.current) {
          setError('Failed to load venue data');
        }
      })
      .finally(() => {
        if (!hasExistingData || !hasDataRef.current) {
          setLoading(false);
        }
      });
  }, [venueId]);

  // 定时刷新实时数据
  useEffect(() => {
    if (!venueId) return;
    const interval = setInterval(() => {
      Promise.allSettled([
        getFlights(venueId),
        getWeather(venueId),
        getNews(venueId),
        getTides(venueId),
        getVLine(venueId)
      ])
        .then(([flightsRes, weatherRes, newsRes, tidesRes, vlineRes]) => {
          if (flightsRes.status === 'fulfilled') setFlightsData(flightsRes.value || []);
          if (weatherRes.status === 'fulfilled') setWeatherData(weatherRes.value || []);
          if (newsRes.status === 'fulfilled') setNewsData(newsRes.value || []);
          if (tidesRes.status === 'fulfilled') setTidesData(tidesRes.value || []);
          if (vlineRes.status === 'fulfilled') setVLineData(vlineRes.value || []);
          else setVLineData([]);
        })
        .catch(err => {
          console.error('Failed to refresh flight/weather/news:', err);
        });
    }, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [venueId]);

  // Provider value 必须 useMemo 否则 context 变化会导致全树重渲染
  const contextValue = useMemo(() => ({
    venueId, setVenueId,
    venueBasicInfo,
    contentTree,
    venueAdvs,
    venueVideos,
    flightsData,
    newsData,
    weatherData,
    vlineData,
    loading,
    error,
    fallbackImage,
    tidesData,
    injectOfflineData // 注入离线数据方法
  }), [
    venueId, venueBasicInfo, contentTree, venueAdvs, venueVideos, flightsData,
    newsData, weatherData, vlineData, loading, error, fallbackImage, tidesData, injectOfflineData
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
