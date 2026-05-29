import React, { useContext, useEffect, useRef, useState } from 'react';
import AppContext from '../../context/AppContext.js';
import { adjustLightness } from '../../utils/colorCalculator.js';

/**
 * 新闻滚动条（点击进入 NewsDetailPage）
 */
const NewsSection = ({ newsData, selectedNews, onNewsClick }) => {
  const { venueBasicInfo } = useContext(AppContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentNews, setCurrentNews] = useState('');
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const animationRef = useRef(null);
  const [translateX, setTranslateX] = useState(0);

  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const lightColor = adjustLightness(standardColor, 0.35);

  useEffect(() => {
    if (!newsData || newsData.length === 0) {
      setCurrentNews('News unavailable');
      return;
    }
    setCurrentNews(newsData[0]?.header || '');
  }, [newsData]);

  // 自动滚动逻辑
  useEffect(() => {
    if (!currentNews) return;

    let start = null;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const textWidth = textRef.current?.offsetWidth || 0;
    const speed = 100; // px/sec

    cancelAnimationFrame(animationRef.current);
    setTranslateX(containerWidth); // 初始右侧

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const newX = containerWidth - (elapsed / 1000) * speed;

      if (newX > -textWidth) {
        setTranslateX(newX);
        animationRef.current = requestAnimationFrame(step);
      } else {
        const nextIndex = (currentIndex + 1) % newsData.length;
        setCurrentIndex(nextIndex);
        setCurrentNews(newsData[nextIndex]?.header || '');
      }
    };

    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [currentNews, newsData, currentIndex]);

  // 点击跳转详情页
  const handleClick = () => {
    if (newsData?.length > 0 && onNewsClick) {
      onNewsClick(newsData[currentIndex]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden text-white flex items-center px-6 cursor-pointer"
      style={{
        backgroundColor: lightColor,
        height: '3.4rem',
        fontSize: '1.8rem',
        userSelect: 'none',
      }}
      onClick={handleClick}
    >
      <div
        ref={textRef}
        className="whitespace-nowrap hover:opacity-80 transition-opacity"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: 'transform 0s linear',
        }}
      >
        <span className="font-bold mr-2">NEWS:</span> {currentNews}
      </div>
    </div>
  );
};

export default NewsSection;
