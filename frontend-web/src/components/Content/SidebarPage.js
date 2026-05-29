import React, { useState, useContext, useEffect } from "react";
import LayoutWrapper from "./LayoutWrapper";
import OverlayPage from "./OverlayPage";
import LeafNodePage from "./LeafNodePage";
import { adjustLightness } from "../../utils/colorCalculator";
import AppContext from "../../context/AppContext";
import MapPreviewModal from "../MapPreviewModal";

const SidebarPage = ({ node, onBack, rootName }) => {
  const [activeChild, setActiveChild] = useState(null);
  const [mapImage, setMapImage] = useState(null);
  const { venueBasicInfo, fallbackImage } = useContext(AppContext);


  const standardColor = venueBasicInfo?.theme?.standard || "#8b6c2b";
  const lightColor = adjustLightness(standardColor, 0.3);
  const darkColor = adjustLightness(standardColor, -0.1);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--scrollbar-thumb-color",
      standardColor
    );
  }, [standardColor]);


  const handleChildClick = (child) => {
    setActiveChild({ ...child, hasParent: true });
  };

  const handleBackToParent = () => {
    setActiveChild(null);
  };

  if (activeChild) {
    const props = { node: activeChild, onBack: handleBackToParent, rootName };
    if (activeChild.isLeaf) return <LeafNodePage {...props} />;
    if (activeChild.layoutStyle === "overlay") return <OverlayPage {...props} />;
    if (activeChild.layoutStyle === "sidebar") return <SidebarPage {...props} />;
  }

  return (
    <>
      <LayoutWrapper node={node} onBack={onBack} rootName={rootName}>
        {/* 顶部栏 */}
        <div
          className="h-[5.7rem] flex items-center justify-center text-white text-[2.5rem] font-medium tracking-[0.2em] relative z-10 text-center"
          style={{
            background: `linear-gradient(to right, ${darkColor}, ${lightColor})`,
          }}
        >
          {node.name?.toUpperCase() || "Untitled"}
        </div>

        {/* 内容区 */}
        <div
          className="custom-scrollbar overflow-y-auto pt-[0.15rem] pb-2"
          style={{ maxHeight: "calc(100vh - 58.5rem)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {node.attributes?.length > 0 ? (
            <div className="flex flex-col gap-[0.2rem] px-1">
              {node.attributes.map((child) => {
                const clickable = child.isLeaf === true || child.layoutStyle !== "none";

                return (
                  <div
                    key={child.id}
                    onClick={() => clickable && handleChildClick(child)}
                    className="flex h-[8.555rem] overflow-hidden shadow-md cursor-pointer"
                    style={{ backgroundColor: standardColor }}
                  >
                    <img
                      src={
                        child.bannerImage?.replace(/^\{|\}$/g, "").trim() || fallbackImage
                      }
                      alt={child.name}
                      className="w-[14.2rem] h-full object-cover flex-shrink-0"
                      style={{ backgroundColor: standardColor }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallbackImage;
                      }}
                    />

                    <div className="flex-1 ml-4 text-white flex flex-col justify-center px-2">
                      <div className="text-[1.8rem] font-normal ml-8 flex items-center gap-4">
                        {child.name}
                      </div>
                      <div className="text-[1.4rem] opacity-80 ml-8 mr-8">
                        {(() => {
                          const w = (child.description || "").trim().split(/\s+/);
                          const s = w.slice(0, 10).join(" ");
                          return s.charAt(0).toUpperCase() + s.slice(1) + (w.length > 10 ? "..." : "");
                        })()}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-[1.2rem] mt-12">

            </div>
          )}
        </div>
      </LayoutWrapper>

      {/* 地图弹窗组件 */}
      <div className="bg-black bg-opacity-50">
        <MapPreviewModal mapUrl={mapImage} onClose={() => setMapImage(null)} />
      </div>
    </>
  );
};

export default SidebarPage;
