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
const PUBLIC_URL = process.env.PUBLIC_URL || '.';
const DEFAULT_FALLBACK_IMAGE = `${PUBLIC_URL}/images/main/touch_and_explore_banner.jpg`;

function normalizeOfflineAssetPath(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') return '';

  const cleaned = assetPath.trim().replace(/^\{+|\}+$/g, '');
  if (!cleaned) return '';
  if (/^(https?:|file:|data:|blob:)/i.test(cleaned)) return cleaned;

  if (/^[a-zA-Z]:[\\/]/.test(cleaned) || cleaned.startsWith('\\')) {
    const normalized = cleaned.replace(/\\/g, '/');
    return normalized.startsWith('//') ? `file:${normalized}` : `file:///${normalized}`;
  }

  return cleaned;
}

function normalizeContentNode(node) {
  if (!node || typeof node !== 'object') return node;

  const normalized = {
    ...node,
    bannerImage: normalizeOfflineAssetPath(node.bannerImage),
    bannerimage: normalizeOfflineAssetPath(node.bannerimage),
    mapUrl: normalizeOfflineAssetPath(node.mapUrl),
    imageUrls: Array.isArray(node.imageUrls)
      ? node.imageUrls.map(normalizeOfflineAssetPath)
      : node.imageUrls,
    mapData: node.mapData
      ? {
          ...node.mapData,
          imageUrl: normalizeOfflineAssetPath(node.mapData.imageUrl),
        }
      : node.mapData,
  };

  if (Array.isArray(node.attributes)) {
    normalized.attributes = node.attributes.map(normalizeContentNode);
  }

  return normalized;
}

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
  const [fallbackImage, setFallbackImage] = useState(DEFAULT_FALLBACK_IMAGE);

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

  const injectOfflineData = useCallback((data, venueIdOverride = '') => {
    if (!data) return;

    const newVenueId = venueIdOverride || data.venueId || data.basicInfo?.id || '';
    injectedVenueId.current = newVenueId;
    const fallbackBanner = DEFAULT_FALLBACK_IMAGE;

    const fixedAdvs = (data.venueAdvs || data.ads || []).map((adv) => ({
      ...adv,
      image: normalizeOfflineAssetPath(adv.image),
      specialImage: normalizeOfflineAssetPath(adv.specialImage),
    }));

    const fixedVideos = (data.venueVideos || data.videos || []).map((video) => ({
      ...video,
      publicLink: normalizeOfflineAssetPath(video.publicLink || video.url),
    }));

    const fixedContentTree = (data.contentTree || data['ts-content-tree'] || []).map(normalizeContentNode);
    const rawBasic = (
      data.venueBasicInfo ||
      data['basic-info'] ||
      (typeof data.basicInfo === 'object' && data.basicInfo) || {}
    );

    const fixedSlides = (rawBasic.landing?.venueSlides || []).map(normalizeOfflineAssetPath);
    const fixedLogo = normalizeOfflineAssetPath(rawBasic.landing?.venueLogo);

    setFallbackImage(fixedLogo || fallbackBanner);

    const fixedBasicInfo = {
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
    };

    const live = data.liveInfo || {};
    const fixedFlights = live.flights || data.flights || [];
    const fixedWeather = live.weather || data.weather || [];
    const fixedNews = live.news || data.news || [];
    const fixedTides = live.tides || data.tides || [];
    const fixedVLine = live.vline || data.vline || [];

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
      setError('Venue is not configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Phase 1: critical path — show UI as soon as basicInfo + contentTree are ready
    Promise.allSettled([
      getVenueBasicInfo(venueId),
      getVenueContentTree(venueId),
    ])
      .then(([basicRes, contentTreeRes]) => {
        if (basicRes.status === 'fulfilled') {
          const info = basicRes.value;
          setVenueBasicInfo(info);

          const logo = info?.landing?.venueLogo;
          const cleanedLogo = typeof logo === 'string' ? logo.trim() : '';
          const isValidHttpUrl = (url) => /^https?:\/\/.+/.test(url);
          setFallbackImage(
            isValidHttpUrl(cleanedLogo) ? cleanedLogo : DEFAULT_FALLBACK_IMAGE
          );
        } else {
          setVenueBasicInfo(null);
          if (!hasDataRef.current) {
            setError('Failed to load venue data');
          }
        }

        if (contentTreeRes.status === 'fulfilled') setContentTree(contentTreeRes.value || []);

        setLoading(false);

        // Phase 2: non-critical — load in background after UI is shown
        Promise.allSettled([
          getVenueAdvs(venueId),
          getVenueVideos(venueId),
          getFlights(venueId),
          getWeather(venueId),
          getNews(venueId),
          getTides(venueId),
          getVLine(venueId),
        ]).then(([advsRes, videosRes, flightsRes, weatherRes, newsRes, tidesRes, vlineRes]) => {
          if (advsRes.status === 'fulfilled') setVenueAdvs(advsRes.value || []);
          if (videosRes.status === 'fulfilled') setVenueVideos(videosRes.value || []);
          if (flightsRes.status === 'fulfilled') setFlightsData(flightsRes.value || []);
          if (weatherRes.status === 'fulfilled') setWeatherData(weatherRes.value || []);
          if (newsRes.status === 'fulfilled') setNewsData(newsRes.value || []);
          if (tidesRes.status === 'fulfilled') setTidesData(tidesRes.value || []);
          if (vlineRes.status === 'fulfilled') setVLineData(vlineRes.value || []);
          else setVLineData([]);
        }).catch((err) => {
          console.error('Background data load error:', err);
        });
      })
      .catch((err) => {
        console.error('Venue load error:', err);
        if (!hasDataRef.current) {
          setError('Failed to load venue data');
        }
        setLoading(false);
      });
  }, [venueId]);

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
        .catch((err) => {
          console.error('Failed to refresh flight/weather/news:', err);
        });
    }, 3 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [venueId]);

  const contextValue = useMemo(() => ({
    venueId,
    setVenueId,
    venueBasicInfo,
    contentTree,
    venueAdvs,
    venueVideos,
    flightsData,
    newsData,
    weatherData,
    loading,
    error,
    fallbackImage,
    tidesData,
    vlineData,
    injectOfflineData,
  }), [
    venueId,
    venueBasicInfo,
    contentTree,
    venueAdvs,
    venueVideos,
    flightsData,
    newsData,
    weatherData,
    loading,
    error,
    fallbackImage,
    tidesData,
    vlineData,
    injectOfflineData,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;



