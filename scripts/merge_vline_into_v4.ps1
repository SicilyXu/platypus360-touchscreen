$ErrorActionPreference = 'Stop'

$root = 'D:\Codes\Touchscreen-Frontend-V4-main\Touchscreen-Frontend-V4'
$srcRoot = 'd:\Touchscreen-Fixed'

$apiContent = @'
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

export function getVenueBasicInfo(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/basic-info`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueContentTree(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/ts-content-tree`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueAdvs(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/ads`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueVideos(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/videos`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getFlights(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/flights`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getNews(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/news`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getWeather(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/weather`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getTides(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/tides`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVLine(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/vline`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}
'@

$appContextContent = @'
import React, { createContext, useState, useEffect, useRef } from 'react';
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

/**
 * AppProvider锛氭牴鎹?venueId 绠＄悊骞跺叡浜叏灞€涓氬姟鏁版嵁
 */
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fallbackImage, setFallbackImage] = useState('/images/main/touch_and_explore_banner.jpg');
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

    useEffect(() => {
        const applyThemeCSSVariables = (configuration) => {
            const root = document.documentElement;
            Object.entries(configuration || {}).forEach(([k, v]) => {
                if (v != null && v !== '') {
                    root.style.setProperty(`--${k}`, String(v));
                }
            });
        };

        const looksLikeThemeObject = (obj) => {
            if (!obj || typeof obj !== 'object') return false;
            const keys = Object.keys(obj);
            return ['standard', 'light', 'dark'].some((k) => keys.includes(k));
        };

        const applyTheme = (conf) => {
            if (!looksLikeThemeObject(conf)) {
                console.warn('[Preview:new] ignored: not a theme object', conf);
                return;
            }

            setVenueBasicInfo((prev) => {
                if (!prev) return prev;
                const nextTheme = { ...(prev.theme || {}), ...(conf || {}) };
                console.log('[Preview:new] setVenueBasicInfo.theme ->', nextTheme);
                return { ...prev, theme: nextTheme };
            });

            applyThemeCSSVariables(conf);
            console.log('[Preview:new] Applied CSS vars from theme:', conf);
        };

        window.__APPLY_PREVIEW_THEME__ = (conf) => {
            console.log('[Preview:new] __APPLY_PREVIEW_THEME__ called with:', conf);
            applyTheme(conf);
        };

        const onMsg = (e) => {
            const CHECK_ORIGIN = false;
            const allowedOrigins = new Set([
                window.origin,
                'https://manage.platypus360.com',
                'http://localhost:3004',
            ]);
            if (CHECK_ORIGIN && !allowedOrigins.has(e.origin)) {
                console.warn('[Preview:new] message ignored due to origin:', e.origin);
                return;
            }

            console.log('[Preview:new] message received:', { origin: e.origin, data: e.data });
            if (looksLikeThemeObject(e.data)) {
                applyTheme(e.data);

                try {
                    e.source?.postMessage({ type: 'PREVIEW_THEME_ACK', ok: true, ts: Date.now() }, e.origin);
                } catch { }
            }
        };

        window.addEventListener('message', onMsg);
        console.log('[Preview:new] Listener ready (raw theme only).');

        return () => {
            window.removeEventListener('message', onMsg);
            console.log('[Preview:new] Listener removed.');
        };
    }, [setVenueBasicInfo]);

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
            .then(([basicRes, contentTreeRes, advsRes, videosRes, flightsRes, weatherRes, newsRes, tidesRes, vlineRes]) => {
                if (basicRes.status === 'fulfilled') {
                    const info = basicRes.value;
                    setVenueBasicInfo(info);

                    const logo = info?.landing?.venueLogo;
                    const cleanedLogo = typeof logo === 'string'
                        ? logo.trim()
                        : '';

                    const isValidHttpUrl = (url) => /^https?:\/\/.+/.test(url);

                    setFallbackImage(
                        isValidHttpUrl(cleanedLogo)
                            ? cleanedLogo
                            : '/images/main/touch_and_explore_banner.jpg'
                    );
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
            .catch(err => {
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
                .catch(err => {
                    console.error('Failed to refresh flight/weather/news:', err);
                });
        }, 3 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [venueId]);

    return (
        <AppContext.Provider value={{
            venueId, setVenueId,
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
        }}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;
'@

$liveInfoBarContent = @'
import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../context/AppContext';
import { Typography } from 'antd';
import { adjustLightness } from '../utils/colorCalculator';
import '../App.css';

const { Text } = Typography;

const formatVLineDisplay = (service) => {
  if (!service) return 'No V/Line timetable available';
  return `V/Line: ${service.from || '-'} 鈫?${service.to || '-'} ${service.departureTime || '--:--'}`;
};

const LiveInfoBar = (props) => {
  const { flightsData, weatherData, venueBasicInfo, tidesData, vlineData } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const color = adjustLightness(standardColor, 0.35);
  const lightColor = venueBasicInfo?.theme?.light || color;

  const rawLiveInfo = venueBasicInfo?.landing?.liveInfo;
  const liveInfoList = Array.isArray(rawLiveInfo)
    ? rawLiveInfo.map(s => s.toLowerCase())
    : (rawLiveInfo ? [rawLiveInfo.toLowerCase()] : ['flight']);

  const [dateTime, setDateTime] = useState('');
  const [formattedWeather, setFormattedWeather] = useState([]);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('dateTime');
  const [currentDisplay, setCurrentDisplay] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const date = now.getDate().toString().padStart(2, '0');
      const month = now.toLocaleString('default', { month: 'short' });
      const year = now.getFullYear();
      setDateTime(`${hours}:${minutes} ${ampm} | ${date}-${month}-${year}`);
    };
    updateDateTime();
    const id = setInterval(updateDateTime, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sequence = ['dateTime', 0, 'dateTime', 1, 'dateTime', 2];
    let index = 0;
    const tick = () => {
      setCurrentTimeDisplay(sequence[index]);
      index = (index + 1) % sequence.length;
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!weatherData?.length) {
      setFormattedWeather([]);
      return;
    }
    const result = weatherData.map(item => {
      const date = new Date(item.date);
      const formattedDate = `${date.getDate()}-${date.toLocaleString('default', { month: 'short' })}`;
      const brief = item.condition?.text?.split(' ').slice(0, 2).join(' ') || '';
      const temp = `${item.mintemp_c}鈩?${item.maxtemp_c}鈩僠;
      return `${formattedDate} ${brief} ${temp}`;
    });
    setFormattedWeather(result);
  }, [weatherData]);

  useEffect(() => {
    if (liveInfoList.includes('flight')) {
      if (!flightsData?.length) {
        setCurrentDisplay('No flight information available');
        return;
      }

      let flightIndex = 0;
      const updateFlight = () => {
        const flight = flightsData[flightIndex];
        if (!flight?.departure?.estimated) {
          setCurrentDisplay('Invalid flight data');
          return;
        }
        const timePart = flight.departure.estimated.split('T')[1]?.slice(0, 5) || '00:00';
        let [h, m] = timePart.split(':').map(Number);
        h = (h + 10) % 24;
        setCurrentDisplay(`${flight.flight.iata}: ${flight.departure.iata}鈫?{flight.arrival.iata} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        flightIndex = (flightIndex + 1) % flightsData.length;
      };

      updateFlight();
      const id = setInterval(updateFlight, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('tide')) {
      const rawTideData = tidesData || [];

      const flatTides = rawTideData.flatMap(item =>
        item.tides.map(tide => ({
          date: item.date,
          ...tide
        }))
      );

      if (!flatTides.length) {
        setCurrentDisplay('No tide information available');
        return;
      }

      let tideIndex = 0;
      const updateTide = () => {
        const tide = flatTides[tideIndex];
        const display = `${tide.date} ${tide.type}: ${tide.time} ${tide.height}`;
        setCurrentDisplay(display);
        tideIndex = (tideIndex + 1) % flatTides.length;
      };

      updateTide();
      const id = setInterval(updateTide, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('vline')) {
      if (!vlineData?.length) {
        setCurrentDisplay('No V/Line timetable available');
        return;
      }

      let serviceIndex = 0;
      const updateVLine = () => {
        const service = vlineData[serviceIndex];
        setCurrentDisplay(formatVLineDisplay(service));
        serviceIndex = (serviceIndex + 1) % vlineData.length;
      };

      updateVLine();
      const id = setInterval(updateVLine, 5000);
      return () => clearInterval(id);
    }
  }, [flightsData, props.tidesData, liveInfoList, tidesData, vlineData]);

  const flipKey = currentTimeDisplay === 'dateTime'
    ? dateTime
    : formattedWeather[currentTimeDisplay] || 'No weather information available';

  useEffect(() => {
    // console.log("馃寠 currentDisplay:", currentDisplay);
  }, [currentDisplay]);

  return (
    <div className="flex flex-col text-white">
      <div className="flex h-[26%]">
        <div
          className="w-1/2 flex justify-center items-center cursor-pointer p-2"
          style={{ backgroundColor: standardColor }}
          onClick={() => {
            if (liveInfoList.includes('flight')) {
              const match = flightsData.find((f) => {
                const timePart = f?.departure?.estimated?.split('T')[1]?.slice(0, 5);
                if (!timePart) return false;
                let [h, m] = timePart.split(':').map(Number);
                h = (h + 10) % 24;
                const display = `${f.flight.iata}: ${f.departure.iata}鈫?{f.arrival.iata} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                return display === currentDisplay;
              });

              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }

            if (liveInfoList.includes('tide')) {
              const rawTideData = props.tidesData || [];

              const flatTides = rawTideData.flatMap((item) =>
                item.tides.map((t) => ({
                  ...t,
                  date: item.date,
                }))
              );

              const match = flatTides.find((t) => {
                const display = `${t.date} ${t.type}: ${t.time} ${t.height}`;
                return display === currentDisplay;
              });

              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }

            if (liveInfoList.includes('vline')) {
              const match = vlineData.find((service) => formatVLineDisplay(service) === currentDisplay);
              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }
          }}
        >
          <Text
            key={currentDisplay}
            className="animate-slideFadeLoop inline-block text-white text-[1.8rem] font-500 whitespace-nowrap"
          >
            {currentDisplay}
          </Text>
        </div>

        <div
          className="w-1/2 flex justify-center items-center p-2"
          style={{ backgroundColor: lightColor }}
        >
          <Text
            key={flipKey}
            className="animate-slideFadeLoop inline-block text-white text-[1.8rem] font-500 whitespace-nowrap"
          >
            {flipKey}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LiveInfoBar;
'@

$mainPageContent = @'
import React, { useEffect, useContext, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import AppContext from '../context/AppContext';

import Banner from '../components/Banner';
import LiveInfoBar from '../components/LiveInfoBar';
import ContentTreeSection from '../components/Content/ContentTreeSection';
import NewsSection from '../components/News/NewsSection';
import ImageSliders from '../components/ImageSliders';
import VideoSection from '../components/VideoSection';
import AdsSection from '../components/AdsSection';

import OverlayPage from '../components/Content/OverlayPage';
import SidebarPage from '../components/Content/SidebarPage';
import MapNodePage from '../components/Content/MapNodePage';
import LeafNodePage from '../components/Content/LeafNodePage';

import FlightDetailPage from '../components/FlightDetail';
import TideDetailPage from '../components/TideDetail';
import VLineDetailPage from '../components/VLineDetail';
import NewsListPage from '../components/News/NewsList';
import NewsDetailPage from '../components/News/NewsDetail';

import useIdleReset from '../components/UserIdle';

import '../index.css';

function DotsLoading() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length < 3 ? prev + '.' : ''));
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80"
      style={{ minHeight: '100vh', minWidth: '100vw' }}
    >
      <span className="text-4xl font-bold text-gray-700 select-none" style={{ letterSpacing: 1 }}>
        Loading{dots}
      </span>
    </div>
  );
}

const findContentById = (tree, targetId) => {
  for (const node of tree) {
    if (node.id === targetId) return node;
    if (Array.isArray(node.attributes) && node.attributes.length > 0) {
      const found = findContentById(node.attributes, targetId);
      if (found) return found;
    }
  }
  return null;
};

const MainPage = () => {
  const {
    setVenueId,
    venueBasicInfo,
    venueAdvs,
    contentTree,
    venueVideos,
    flightsData,
    weatherData,
    tidesData,
    newsData,
    loading,
    error,
  } = useContext(AppContext);

  const [searchParams] = useSearchParams();
  const [selectedTreeItem, setSelectedTreeItem] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedTide, setSelectedTide] = useState(null);
  const [selectedVLineService, setSelectedVLineService] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const [fromAdv, setFromAdv] = useState(false);

  const overlayRef = useRef();

  useEffect(() => {
    const host = window.location.hostname;
    let id = "";

    const isLocalhost = host === "localhost" || host === "192.168.0.190";
    if (isLocalhost) {
      id = searchParams.get('venue_id');
    } else {
      id = host.split('.')[0];
    }
    setVenueId(id);
    window.scrollTo(0, 0);
  }, [setVenueId, searchParams]);

  useEffect(() => {
    if (venueBasicInfo?.name) {
      document.title = venueBasicInfo.name;
    }
  }, [venueBasicInfo]);

  useEffect(() => {
    if (selectedTreeItem) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedTreeItem]);

  const handleItemSelect = useCallback((item) => {
    setSelectedFlight(null);
    setSelectedTide(null);
    setSelectedVLineService(null);
    setSelectedNews(null);
    setSelectedTreeItem(item);
  }, []);

  const handleAdvClick = (tsContentId) => {
    const node = findContentById(contentTree, tsContentId);
    if (node) {
      setSelectedFlight(null);
      setSelectedNews(null);
      setSelectedTide(null);
      setSelectedVLineService(null);
      setSelectedTreeItem(node);
      setFromAdv(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn("鉂?ts_content not found for ID:", tsContentId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideOverlay = e.target.closest('#overlay-root') !== null;
      if (!isInsideOverlay) {
        setSelectedTreeItem(null);
        setSelectedFlight(null);
        setSelectedNews(null);
        setShowAllNews(false);
        setSelectedTide(null);
        setSelectedVLineService(null);
      }
    };

    if (selectedTreeItem || selectedFlight || selectedNews || showAllNews || selectedTide || selectedVLineService) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedTreeItem, selectedFlight, selectedNews, showAllNews, selectedTide, selectedVLineService]);

  useIdleReset(() => {
    setSelectedTreeItem(null);
    setSelectedFlight(null);
    setSelectedNews(null);
    setShowAllNews(false);
    setSelectedTide(null);
    setSelectedVLineService(null);
  }, 60000);

  if (loading || !venueBasicInfo) {
    return <DotsLoading />;
  }

  console.log('[MainPage] render', { venueBasicInfo, venueAdvs, venueVideos, contentTree });

  return (
    <div className="main-wrapper">
      <div
        className="main-content"
        style={{ backgroundColor: venueBasicInfo.theme?.standard || '#234B92' }}
      >
        <Banner venueBasicInfo={venueBasicInfo} />

        <LiveInfoBar
          flightsData={flightsData}
          weatherData={weatherData}
          tidesData={tidesData}
          venueBasicInfo={venueBasicInfo}
          onLeftItemClick={(item) => {
            setSelectedTreeItem(null);
            setSelectedFlight(null);
            setSelectedNews(null);
            setShowAllNews(false);
            setSelectedTide(null);
            setSelectedVLineService(null);

            if (item?.flight) {
              setSelectedFlight(item);
            } else if (item?.type && item?.height) {
              setSelectedTide(item);
            } else if (item?.serviceType && item?.from && item?.to) {
              setSelectedVLineService(item);
            }
          }}
        />

        <ContentTreeSection
          contentTree={contentTree}
          selectedItem={selectedTreeItem}
          onItemSelect={handleItemSelect}
        />

        {!selectedTreeItem && !selectedFlight && !selectedNews && !showAllNews && !selectedTide && !selectedVLineService && (
          <div>
            <NewsSection
              newsData={newsData}
              selectedNews={selectedNews}
              onNewsClick={() => {
                setShowAllNews(true);
                setSelectedTreeItem(null);
                setSelectedFlight(null);
                setSelectedNews(null);
                setSelectedTide(null);
                setSelectedVLineService(null);
              }}
            />
            <ImageSliders venueBasicInfo={venueBasicInfo} />
            <VideoSection venueVideos={venueVideos} />
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-red-100 text-red-600 rounded shadow">
          {error}
        </div>
      )}

      {(selectedTreeItem || selectedFlight || selectedNews || showAllNews || selectedTide || selectedVLineService) && (
        <div ref={overlayRef} id="overlay-root" className="overlay-section">
          {selectedTreeItem && (
            selectedTreeItem.isLeaf ? (
              <LeafNodePage
                node={selectedTreeItem}
                onBack={() => setSelectedTreeItem(null)}
                rootName={selectedTreeItem.name}
                fromAdv={fromAdv}
              />
            ) : selectedTreeItem.layoutStyle === 'overlay' ? (
              <OverlayPage
                node={selectedTreeItem}
                onBack={() => setSelectedTreeItem(null)}
                rootName={selectedTreeItem.name}
              />
            ) : selectedTreeItem.layoutStyle === 'sidebar' ? (
              <SidebarPage
                node={selectedTreeItem}
                onBack={() => setSelectedTreeItem(null)}
                rootName={selectedTreeItem.name}
              />
            ) : selectedTreeItem.layoutStyle === 'map' ? (
              <MapNodePage
                node={selectedTreeItem}
                onBack={() => setSelectedTreeItem(null)}
                rootName={selectedTreeItem.name}
              />
            ) : null
          )}

          {selectedFlight && (
            <div className="w-full h-full overflow-hidden flex flex-col items-center">
              <FlightDetailPage
                selectedFlight={selectedFlight}
                onBack={() => setSelectedFlight(null)}
                onFlightClick={(flight) => {
                  setSelectedFlight(flight);
                }}
              />
            </div>
          )}

          {selectedTide && (
            <div className="w-full h-full overflow-hidden flex flex-col items-center">
              <TideDetailPage
                selectedTide={selectedTide}
                onBack={() => setSelectedTide(null)}
                onTideClick={(tide) => {
                  setSelectedTide(tide);
                }}
              />
            </div>
          )}

          {selectedVLineService && (
            <div className="w-full h-full overflow-hidden flex flex-col items-center">
              <VLineDetailPage
                selectedService={selectedVLineService}
                onBack={() => setSelectedVLineService(null)}
                onServiceClick={(service) => {
                  setSelectedVLineService(service);
                }}
              />
            </div>
          )}

          {showAllNews && !selectedNews && (
            <NewsListPage
              newsData={newsData}
              onSelect={(news) => {
                setSelectedNews(news);
                setShowAllNews(false);
              }}
              onBack={() => {
                setShowAllNews(false);
              }}
            />
          )}

          {selectedNews && (
            <div className="w-full h-full overflow-hidden flex flex-col items-center">
              <NewsDetailPage
                selectedNews={selectedNews}
                onBack={() => {
                  setSelectedNews(null);
                  setShowAllNews(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      <AdsSection venueAdvs={venueAdvs} onAdvClick={handleAdvClick} />
    </div>
  );
};

export default MainPage;
'@

Set-Content -Path (Join-Path $root 'frontend-web\src\api.js') -Value $apiContent
Set-Content -Path (Join-Path $root 'frontend-web\src\context\AppContext.js') -Value $appContextContent
Set-Content -Path (Join-Path $root 'frontend-web\src\components\LiveInfoBar.js') -Value $liveInfoBarContent
Set-Content -Path (Join-Path $root 'frontend-web\src\pages\MainPage.js') -Value $mainPageContent

Copy-Item -Path (Join-Path $srcRoot 'frontend-web\src\components\VLineDetail.js') -Destination (Join-Path $root 'frontend-web\src\components\VLineDetail.js') -Force

$electronPath = Join-Path $root 'touchscreen-desktop\electron\utils\downloadVenueData.js'
$raw = Get-Content -Raw -Path $electronPath
if ($raw -notmatch 'live-info/vline') {
  $raw = $raw.Replace(
    "      tides: `${baseUrl}/ts/${venueId}/live-info/tides`,",
    "      tides: `${baseUrl}/ts/${venueId}/live-info/tides`,`r`n      vline: `${baseUrl}/ts/${venueId}/live-info/vline`,"
  )
}
Set-Content -Path $electronPath -Value $raw
