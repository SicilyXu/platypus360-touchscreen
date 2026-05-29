import React, { useContext, useState } from 'react';
import { X } from 'lucide-react';
import AppContext from '../../context/AppContext';
import { adjustLightness } from '../../utils/colorCalculator';

/**
 * 单个新闻卡片组件
 */
const NewsCard = ({ item, isActive, onClick, lightColor, darkColor }) => {
  return (
    <div
      onClick={onClick}
      className="w-full h-[16rem] overflow-hidden shadow cursor-pointer transition-all duration-200 flex flex-row "
      style={{ backgroundColor: isActive ? darkColor : lightColor }}
    >
      {/* 左侧文字区 */}
      <div className="flex-1 p-8">
        <h2 className="text-[1.5rem] font-semibold mb-[1.5rem]">{item.header}</h2>
        <p className="text-[1.4rem] text-white-300 leading-[2rem] line-clamp-3">
          {item.text || item.content?.slice(0, 100)}
        </p>
      </div>

      {/* 右侧图片 */}
      {item.img && (
        <div className="w-[21rem] pr-4 flex items-center justify-end">
          <img
            src={item.img}
            alt={item.header}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

/**
 * 新闻列表页
 */
const NewsListPage = ({ newsData = [], onSelect, onBack }) => {
  const { venueBasicInfo } = useContext(AppContext);
  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const lightColor = adjustLightness(standardColor, 0.1);
  const darkColor = adjustLightness(standardColor, -0.3);

  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div
      className="w-full h-full overflow-y-auto text-white p-8 relative"
      style={{ backgroundColor: standardColor }}
    >
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="absolute top-[1.5rem] left-[1.5rem] text-white hover:text-red-400 transition-colors z-10"
        aria-label="Close"
      >
        <X size={28} />
      </button>

      {/* 标题 */}
      <h1 className="text-[2rem] font-semibold mb-[2.5rem] text-center tracking-wide">
        LATEST NEWS
      </h1>

      {/* 新闻卡片列表 */}
      <div className="flex flex-col gap-[1.5rem]">
        {newsData.map((item, idx) => (
          <NewsCard
            key={idx}
            item={item}
            isActive={activeIndex === idx}
            lightColor={lightColor}
            darkColor={darkColor}
            onClick={() => {
              setActiveIndex(idx);
              setTimeout(() => setActiveIndex(null), 400); // 触摸点击时临时高亮
              onSelect?.(item);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NewsListPage;
