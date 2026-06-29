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
import LeafNodePage from '../components/Content/LeafNodePage';
import MapPage from '../components/Content/MapPage';

import FlightDetailPage from '../components/FlightDetail';
import TideDetailPage from '../components/TideDetail';
import VLineDetailPage from '../components/VLineDetail';
import NewsListPage from '../components/News/NewsList';
import NewsDetailPage from '../components/News/NewsDetail';

import useIdleReset from '../components/UserIdle';

import '../index.css';
import { getVenueDisplayName } from '../utils/venueDisplayName';

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

const hasChildNodes = (node) => Array.isArray(node?.attributes) && node.attributes.length > 0;

const renderContentNode = (node, onBack, rootName, fromAdv = false) => {
  if (!node) return null;

  if (node.isLeaf) {
    return (
      <LeafNodePage
        node={node}
        onBack={onBack}
        rootName={rootName}
        fromAdv={fromAdv}
      />
    );
  }

  if (node.layoutStyle === 'sidebar') {
    return <SidebarPage node={node} onBack={onBack} rootName={rootName} />;
  }

  if (node.layoutStyle === 'map') {
    return <MapPage node={node} onBack={onBack} rootName={rootName} />;
  }

  if (node.layoutStyle === 'overlay' || hasChildNodes(node)) {
    return <OverlayPage node={node} onBack={onBack} rootName={rootName} />;
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
    const venueId = searchParams.get('venue_id');
    if (venueId) {
      setVenueId(venueId);
    }
    window.scrollTo(0, 0);
  }, [searchParams, setVenueId]);

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

  const closeLiveInfoOverlays = useCallback(() => {
    setSelectedFlight(null);
    setSelectedTide(null);
    setSelectedVLineService(null);
    setSelectedNews(null);
    setShowAllNews(false);
  }, []);

  const handleItemSelect = useCallback((item) => {
    closeLiveInfoOverlays();
    setSelectedTreeItem(item);
  }, [closeLiveInfoOverlays]);

  const handleAdvClick = (tsContentId) => {
    const node = findContentById(contentTree, tsContentId);
    if (!node) {
      console.warn('ts_content not found for ID:', tsContentId);
      return;
    }

    closeLiveInfoOverlays();
    setSelectedTreeItem(node);
    setFromAdv(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideOverlay = e.target.closest('#overlay-root') !== null;
      if (!isInsideOverlay) {
        setSelectedTreeItem(null);
        closeLiveInfoOverlays();
      }
    };

    if (selectedTreeItem || selectedFlight || selectedNews || showAllNews || selectedTide || selectedVLineService) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    selectedTreeItem,
    selectedFlight,
    selectedNews,
    showAllNews,
    selectedTide,
    selectedVLineService,
    closeLiveInfoOverlays,
  ]);

  useIdleReset(() => {
    setSelectedTreeItem(null);
    closeLiveInfoOverlays();
  }, 60000);

  if (!venueBasicInfo) {
    return <DotsLoading />;
  }

  const selectedTreeDisplayName = getVenueDisplayName(selectedTreeItem?.name, venueId);
  const selectedTreeNodeForDisplay = selectedTreeItem ? { ...selectedTreeItem, displayName: selectedTreeDisplayName } : null;

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
            closeLiveInfoOverlays();

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
          {selectedTreeNodeForDisplay && (
            renderContentNode(
              selectedTreeNodeForDisplay,
              () => setSelectedTreeItem(null),
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
