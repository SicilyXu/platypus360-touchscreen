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
    if (injectedVenueId.current === newVenueId) {
      return;
    }
    injectedVenueId.current = newVenueId;

    const fallbackBanner = '/images/main/touch_and_explore_banner.jpg';
    const fixImagePath = (imgPath) => {
      if (!imgPath) return '';
      if (imgPath.startsWith('file://')) return imgPath;
      return imgPath;
    };

    const fixedAdvs = (data.venueAdvs || data.ads || []).map((adv) => ({
      ...adv,
      image: fixImagePath(adv.image),
      specialImage: fixImagePath(adv.specialImage),
    }));

    const fixedVideos = (data.venueVideos || data.videos || []).map((video) => ({
      ...video,
      publicLink: fixImagePath(video.publicLink || video.url),
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
      .then(([
        basicRes,
        contentTreeRes,
        advsRes,
        videosRes,
        flightsRes,
        weatherRes,
        newsRes,
        tidesRes,
        vlineRes
      ]) => {
        if (basicRes.status === 'fulfilled') {
          const info = basicRes.value;
          setVenueBasicInfo(info);

          const logo = info?.landing?.venueLogo;
          const cleanedLogo = typeof logo === 'string' ? logo.trim() : '';
          const isValidHttpUrl = (url) => /^https?:\/\/.+/.test(url);
          setFallbackImage(
            isValidHttpUrl(cleanedLogo)
              ? cleanedLogo
              : '/images/main/touch_and_explore_banner.jpg'
          );
        } else {
          setVenueBasicInfo(null);
          if (!hasDataRef.current) {
            setError('Failed to load venue data');
          }
        }

        if (contentTreeRes.status === 'fulfilled') setContentTree(contentTreeRes.value || []);
        if (advsRes.status === 'fulfilled') setVenueAdvs(advsRes.value || []);
        if (videosRes.status === 'fulfilled') setVenueVideos(videosRes.value || []);
        if (flightsRes.status === 'fulfilled') setFlightsData(flightsRes.value || []);
        if (weatherRes.status === 'fulfilled') setWeatherData(weatherRes.value || []);
        if (newsRes.status === 'fulfilled') setNewsData(newsRes.value || []);
        if (tidesRes.status === 'fulfilled') setTidesData(tidesRes.value || []);
        if (vlineRes.status === 'fulfilled') setVLineData(vlineRes.value || []);
        else setVLineData([]);
      })
      .catch((err) => {
        console.error('Venue load error:', err);
        if (!hasDataRef.current) {
          setError('Failed to load venue data');
        }
      })
      .finally(() => setLoading(false));
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
