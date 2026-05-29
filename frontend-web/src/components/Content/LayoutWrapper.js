import React, { useContext } from "react";
import AppContext from "../../context/AppContext";
import { adjustLightness } from "../../utils/colorCalculator.js";
import { ArrowLeftCircleIcon } from '@heroicons/react/24/solid';

/**
 * LayoutWrapper - 页面统一布局容器组件
 * 功能：
 * - 顶部栏（包含返回按钮 + 页面名 + 地图图标）
 * - 左侧竖排栏（展示页面名）
 * - 中间插槽内容 children
 */
const LayoutWrapper = ({ node, children, onBack, rootName }) => {
  const { venueBasicInfo } = useContext(AppContext);
  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";
  const verticalTextSize = rootName?.length > 15 ? "text-[2rem]" : "text-[2.9rem]";


  const lightColor = adjustLightness(standardColor, 0.2);

  if (!node) return null;

  return (
    <div
      className="relative w-full h-full flex overflow-hidden"
      style={{ backgroundColor: standardColor }}
    >
      {/* 左侧竖排栏 */}
      <div
        className="w-[9rem] min-w-[9rem] h-full text-white font-normal text-[2.9rem] select-none tracking-[0.3rem] relative z-[5]"
        style={{ backgroundColor: lightColor }}
      >

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-white text-base font-light cursor-pointer"
          >
            <ArrowLeftCircleIcon className="w-12 h-12" />
            BACK
          </button>
        )}

        {/* 左侧文字：竖排 + 居中 + 旋转 */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-90deg] vertical-rl text-center whitespace-nowrap ${verticalTextSize}`}
        >
          {rootName?.toUpperCase() || "Untitled"}
        </div>

      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-hidden">{children}</div>
    </div>
  );
};

export default LayoutWrapper;
