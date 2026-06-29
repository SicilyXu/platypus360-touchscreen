import React, { useEffect, useContext, useState, useCallback, useRef, useMemo } from 'react';
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
import MapPage from '../components/Content/MapPage';
import LeafNodePage from '../components/Content/LeafNodePage';

import FlightDetailPage from '../components/FlightDetail';
import TideDetailPage from '../components/TideDetail';
import VLineDetailPage from '../components/VLineDetail';
import NewsListPage from '../components/News/NewsList';
import NewsDetailPage from '../components/News/NewsDetail';

import useIdleReset from '../components/UserIdle';

import '../index.css';
import { getVenueDisplayName } from '../utils/venueDisplayName';

function StatusScreen({ message }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 px-6"
      style={{ minHeight: '100vh', minWidth: '100vw' }}
    >
      <div className="max-w-[36rem] text-center text-gray-700">
        <div className="text-3xl font-bold">Unable to Load Venue</div>
        <div className="mt-4 text-xl">{message}</div>
      </div>
    </div>
  );
}
function DotsLoading() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
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

const renderContentNode = (node, onBack, rootName, fromAdv) => {
  if (node.isLeaf) {
    return <LeafNodePage node={node} onBack={onBack} rootName={rootName} fromAdv={fromAdv} />;
  }
  if (node.layoutStyle === 'overlay') {
    return <OverlayPage node={node} onBack={onBack} rootName={rootName} />;
  }
  if (node.layoutStyle === 'sidebar') {
    return <SidebarPage node={node} onBack={onBack} rootName={rootName} />;
  }
  if (node.layoutStyle === 'map') {
    return <MapPage node={node} onBack={onBack} rootName={rootName} />;
  }
  return null;
};

const MainPage = () => {
  const {
    setVenueId,
    venueId,
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
  const [venueResolved, setVenueResolved] = useState(false);

  const overlayRef = useRef();

  useEffect(() => {
    const host = window.location.hostname;
    let id = '';

    const isLocalhost = host === 'localhost' || host === '192.168.0.190';
    if (isLocalhost) {
      id = searchParams.get('venue_id');
    } else {
      id = host.split('.')[0];
    }
    setVenueId(id);
    setVenueResolved(true);
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
    setFromAdv(false);
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
      console.warn('ts_content not found for ID:', tsContentId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideOverlay = e.target.closest('#overlay-root') !== null;
      const isInsideNav = e.target.closest('#content-tree-section') !== null;
      if (!isInsideOverlay && !isInsideNav) {
        setSelectedTreeItem(null);
        setSelectedFlight(null);
        setSelectedNews(null);
        setShowAllNews(false);
        setSelectedTide(null);
        setSelectedVLineService(null);
        setFromAdv(false);
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
    setFromAdv(false);
  }, 60000);

  const selectedTreeDisplayName = getVenueDisplayName(selectedTreeItem?.name, venueId);
  const selectedTreeNodeForDisplay = useMemo(() => {
    if (!selectedTreeItem) return null;
    return { ...selectedTreeItem, displayName: selectedTreeDisplayName };
  }, [selectedTreeItem, selectedTreeDisplayName]);

  if (loading || !venueResolved) {
    return <DotsLoading />;
  }

  if (!venueBasicInfo) {
    return <StatusScreen message={error || 'Venue data is unavailable.'} />;
  }

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
            setFromAdv(false);

            if (item?.flight) {
              setSelectedFlight(item);
            } else if (item?.type && item?.height) {
              setSelectedTide(item);
            } else if (item?.serviceType && item?.to) {
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
          {selectedTreeNodeForDisplay && (
            renderContentNode(
              selectedTreeNodeForDisplay,
              () => {
                setFromAdv(false);
                setSelectedTreeItem(null);
              },
              selectedTreeDisplayName,
              fromAdv
            )
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







