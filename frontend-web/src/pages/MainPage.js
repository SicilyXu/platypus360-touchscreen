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
import NewsListPage from '../components/News/NewsList';
import NewsDetailPage from '../components/News/NewsDetail';

import useIdleReset from '../components/UserIdle';


import '../index.css';

// const DEFAULT_VENUE_ID = 'ts_holiday_inn_express_hotel';

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

// 在tscontent中递归查找指定 id 的内容节点
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
  const [selectedNews, setSelectedNews] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const [fromAdv, setFromAdv] = useState(false);



  const overlayRef = useRef();

  // 初始化场馆
  useEffect(() => {
    const venue_id = searchParams.get('venue_id');
    if (venue_id) {
      setVenueId(venue_id);
    }
    window.scrollTo(0, 0);
  }, [searchParams, setVenueId]);

  // 设置页面标题
  useEffect(() => {
    if (venueBasicInfo?.name) {
      document.title = venueBasicInfo.name;
    }
  }, [venueBasicInfo]);

  // 当切换内容项，自动滚动顶部
  useEffect(() => {
    if (selectedTreeItem) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedTreeItem]);

  // 点击内容树项
  const handleItemSelect = useCallback((item) => {
    setSelectedFlight(null); // ❗关闭 flight
    setSelectedTide(null); // ❗关闭 tide
    setSelectedNews(null); // ❗关闭新闻
    setSelectedTreeItem(item); // ✅打开内容项
  }, []);


  // 点击广告跳转
  const handleAdvClick = (tsContentId) => {
    const node = findContentById(contentTree, tsContentId);
    if (node) {
      setSelectedFlight(null); // ❗关闭 flight
      setSelectedNews(null); // ❗关闭新闻
      setSelectedTide(null); // ❗关闭 tide
      setSelectedTreeItem(node);
      setFromAdv(true); // ❗标记为广告点击
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn("❗ ts_content not found for ID:", tsContentId);
    }
  };

  // 监听点击，点击 overlay 外部才关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isInsideOverlay = e.target.closest('#overlay-root') !== null;
      if (!isInsideOverlay) {
        setSelectedTreeItem(null);
        setSelectedFlight(null);
        setSelectedNews(null);
        setShowAllNews(false);
        setSelectedTide(null);
      }
    };

    if (selectedTreeItem || selectedFlight || selectedNews || showAllNews || selectedTide) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedTreeItem, selectedFlight, selectedNews, showAllNews, selectedTide]);

  useIdleReset(() => {
    setSelectedTreeItem(null);
    setSelectedFlight(null);
    setSelectedNews(null);
    setShowAllNews(false);
    setSelectedTide(null);
  }, 60000); // 60秒无操作自动清空状态


  if (!venueBasicInfo) {
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

            if (item?.flight) {
              setSelectedFlight(item); // 是航班
            } else if (item?.type && item?.height) {
              setSelectedTide(item);   // 是潮汐
            }
          }}

        />

        <ContentTreeSection
          contentTree={contentTree}
          selectedItem={selectedTreeItem}
          onItemSelect={handleItemSelect}
        />

        {/* 主内容区（仅无选中内容或航班或新闻时显示） */}
        {!selectedTreeItem && !selectedFlight && !selectedNews && !showAllNews && !selectedTide && (
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
              }}
            />
            <ImageSliders venueBasicInfo={venueBasicInfo} />
            <VideoSection venueVideos={venueVideos} />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-red-100 text-red-600 rounded shadow">
          {error}
        </div>
      )}

      {/* 遮罩层：显示内容页 / 航班 / 新闻列表 / 新闻详情 */}
      {(selectedTreeItem || selectedFlight || selectedNews || showAllNews || selectedTide) && (
        <div ref={overlayRef} id="overlay-root" className="overlay-section">
          {selectedTreeItem && (
            renderContentNode(
              selectedTreeItem,
              () => setSelectedTreeItem(null),
              selectedTreeItem.name,
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
                  setShowAllNews(true); // 返回新闻列表页
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 广告区域常驻展示 */}
      <AdsSection venueAdvs={venueAdvs} onAdvClick={handleAdvClick} />
    </div>
  );


};

export default MainPage;
