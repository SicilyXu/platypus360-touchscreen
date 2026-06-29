import React, { useContext, useState, useEffect } from "react";
import AppContext from "../../context/AppContext";
import { Carousel } from "antd";
import { X } from "lucide-react";
import LayoutWrapper from "./LayoutWrapper";
import MapPreviewModal from "../MapPreviewModal";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "react-medium-image-zoom/dist/styles.css";

/**
 * LeafNodePage 终端节点页面，展示滑动图、banner、左右描述、地图等
 */
const LeafNodePage = ({ node, onBack, rootName, fromAdv = false }) => {
  const { venueBasicInfo, fallbackImage } = useContext(AppContext);
  const [showMap, setShowMap] = useState(false);
  const standardColor = venueBasicInfo?.theme?.standard || "#8b6c2b";

  const theme = venueBasicInfo?.theme || {};
  const bgColor = theme.standard || "white";
  const darkColor = theme.dark || "black";

  const {
    imageUrls = [],
    bannerImage,
    name,
    description,
    leftDescription,
    rightDescription,
  } = node;

  const searchTags = typeof node?.searchTags === "string"
    ? [node.searchTags.toLowerCase().trim()]
    : Array.isArray(node?.searchTags)
      ? node.searchTags.map(tag => tag.toLowerCase().trim())
      : [];

  const isMapOnly = searchTags.includes("map");
  const showLogo = searchTags.includes("logo");
  const cleanMapUrl = node.mapUrl?.replace(/^\{|\}$/g, "");


  useEffect(() => {
    document.documentElement.style.setProperty("--scrollbar-thumb-color", standardColor);
  }, [standardColor]);

  // ✅ 仅地图模式
  if (isMapOnly) {
    return (
      // 地图预览弹窗

      <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-[90vw] max-h-full bg-white rounded-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <TransformWrapper initialScale={1} minScale={1} limitToBounds>
            <TransformComponent>
              <img
                src={cleanMapUrl}
                alt="map"
                className="w-full h-full object-contain touch-none"
              />
            </TransformComponent>
          </TransformWrapper>
          <button
            className="absolute top-4 right-4 bg-white rounded-full p-1 shadow-md z-10"
            onClick={onBack}
          >
            <X size={24} color="black" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <LayoutWrapper node={node} onBack={onBack} rootName={rootName} fromAdv={fromAdv}>

      <div
        className="w-full h-full text-white p-2 overflow-y-auto"
        style={{
          background: `linear-gradient(to bottom right, ${darkColor}, ${bgColor})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部轮播图 */}
        {imageUrls?.length > 0 && (
          <Carousel autoplay autoplaySpeed={3000} dots arrows>
            {imageUrls.map((url, idx) => (
              <div key={idx}>
                <img
                  src={url}
                  alt={`image-${idx}`}
                  className="w-full h-[25rem] object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </Carousel>
        )}


        {imageUrls?.length === 0 && (
          <div className="w-full h-[25rem] flex items-center justify-center bg-gray-200">
            <img
              src={fallbackImage}
              alt="fallback"
              className="max-h-full max-w-full object-contain"
            />
          </div>  
        )}

        {/* logo 模式 banner 图 */}
        {showLogo && bannerImage && (
          <img
            src={bannerImage.replace(/^\{|\}$/g, "")}
            alt="banner"
            className="absolute top-[21rem] left-[11rem] h-[8rem] border-4 border-white z-10"
          />
        )}

        {/* 标题（右或居中） */}
        <div
          className={`text-[2rem] font-bold tracking-wide my-2 ${showLogo ? "text-right pl-[12rem] mr-5" : "text-center pt-3"
            }`}
        >
          {name?.toUpperCase() || "UNTITLED"}
        </div>

        {/* 内容区域 */}
        <div className="flex flex-wrap gap-6 justify-between overflow-hidden pt-4">
          {/* 无左右描述，显示 description + map */}
          {(!leftDescription?.trim() && !rightDescription?.trim() && description?.trim()) ? (
            <>
              <div className="w-full bg-white bg-opacity-10 py-4 px-6 mx-auto max-h-[19rem] overflow-y-auto text-[1.15rem] leading-[1.8rem] break-words">
                <div dangerouslySetInnerHTML={{ __html: description }} />
              </div>

              {cleanMapUrl?.trim() && (
                <div className="ml-auto mr-4">
                  <button
                    onClick={() => setShowMap(true)}
                    className="text-white border-2 border-white text-[1.2rem] px-4 py-2 w-[15rem] transition hover:border-standardColor
                     hover:text-black mb-8"
                  >
                    SEE MAP
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 左描述块 */}
              {leftDescription?.trim() && (
                <div
                  className="flex-1 min-w-[20rem] max-h-[20rem] overflow-y-auto bg-white bg-opacity-10 p-4 break-words"
                  dangerouslySetInnerHTML={{ __html: leftDescription }}
                />
              )}

              {/* 右描述块 + map */}
              {rightDescription?.trim() && (
                <div className="relative flex-1 min-w-[20rem] max-h-[20rem] overflow-y-auto bg-white bg-opacity-10 p-4 break-words">
                  <div dangerouslySetInnerHTML={{ __html: rightDescription }} />
                  {cleanMapUrl?.trim() && (
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => setShowMap(true)}
                        className="sticky bottom-0 mx-auto flex justify-center items-center w-3/4 text-white border-2 border-white px-4 py-2 text-sm backdrop-blur-sm z-20"
                      >
                        SEE MAP
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 地图弹窗（可手势缩放） */}
        {showMap && (
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <MapPreviewModal mapUrl={cleanMapUrl} onClose={() => setShowMap(false)} />
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
};

export default LeafNodePage;
