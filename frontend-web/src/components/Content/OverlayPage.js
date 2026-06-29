import React, { useState, useContext, useEffect } from "react";
import LayoutWrapper from "./LayoutWrapper";
import SidebarPage from "./SidebarPage";
import LeafNodePage from "./LeafNodePage";
import MapPage from "./MapPage";
import { MapPin } from "lucide-react";
import { adjustLightness, adjustBrightness } from "../../utils/colorCalculator";
import AppContext from "../../context/AppContext";
import { sortContentChildrenForDisplay } from "../../utils/contentOrder";
import MapPreviewModal from "../MapPreviewModal";

const OverlayPage = ({ node, onBack, rootName }) => {
  const [activeChild, setActiveChild] = useState(null);
  const [mapImage, setMapImage] = useState(null);
  const [orderedChildren, setOrderedChildren] = useState(() => sortContentChildrenForDisplay(node));
  const { venueBasicInfo, fallbackImage } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";
  const lightColor = adjustLightness(standardColor, 0.2);
  const lightBackgroundColor = adjustBrightness(lightColor, 0.85);
  const darkColor = adjustLightness(standardColor, -0.1);

  const title = (node.displayName || node.name)?.toUpperCase() || "Untitled";
  const titleSizeClass = title.length > 15 ? "text-[2rem]" : "text-[2.5rem]";

  useEffect(() => {
    document.documentElement.style.setProperty("--scrollbar-thumb-color", standardColor);
  }, [standardColor]);

  useEffect(() => {
    if (!activeChild) {
      setOrderedChildren(sortContentChildrenForDisplay(node));
    }
  }, [node, activeChild]);

  const handleChildClick = (child) => {
    setActiveChild({ ...child, hasParent: true });
  };

  const handleBackToParent = () => {
    setActiveChild(null);
  };

  const hasChildNodes = (value) => Array.isArray(value?.attributes) && value.attributes.length > 0;

  if (activeChild) {
    const props = { node: activeChild, onBack: handleBackToParent, rootName };
    if (activeChild.isLeaf === true) return <LeafNodePage {...props} />;
    if (activeChild.layoutStyle === "overlay") return <OverlayPage {...props} />;
    if (activeChild.layoutStyle === "sidebar") return <SidebarPage {...props} />;
    if (activeChild.layoutStyle === "map") return <MapPage {...props} />;
    if (hasChildNodes(activeChild)) return <OverlayPage {...props} />;
  }

  const cleanMapUrl = node.mapUrl?.replace(/^\{|\}$/g, "");

  return (
    <>
      <LayoutWrapper node={node} onBack={onBack} rootName={rootName}>
        <div
          className={`h-[5.7rem] flex items-center justify-center text-white font-medium tracking-[0.2em] relative z-10 text-center ${titleSizeClass}`}
          style={{
            background: `linear-gradient(to right, ${darkColor}, ${lightColor})`,
          }}
        >
          <div className="relative flex items-center">
            {title}
            {cleanMapUrl && (
              <button onClick={() => setMapImage(cleanMapUrl)} className="ml-3 text-white">
                <MapPin size={20} />
              </button>
            )}
          </div>
        </div>

        <div
          className="custom-scrollbar overflow-auto pt-1 pb-2"
          style={{
            maxHeight: "calc(100vh - 58rem)",
            backgroundColor: lightBackgroundColor,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {orderedChildren.length > 0 ? (
            <div className="flex flex-col gap-3 px-1">
              {orderedChildren.map((child) => {
                const imageUrl = child.bannerImage?.replace(/^\{|\}$/g, "") || "";

                return (
                  <div
                    key={child.id}
                    className="cursor-pointer relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChildClick(child);
                    }}
                  >
                    <div
                      className="w-full h-[16.7rem] overflow-hidden shadow-[0_1rem_5rem_rgba(0,0,0,0.03)] relative"
                      style={{ backgroundColor: lightColor }}
                    >
                      <img
                        src={imageUrl || fallbackImage}
                        alt={child.name}
                        className="w-full h-full object-cover block"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImage;
                        }}
                      />

                      <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white text-[1.8rem] uppercase text-center py-2 font-medium tracking-wide">
                        {child.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-lg mt-10">
              No content available.
            </div>
          )}
        </div>
      </LayoutWrapper>

      <MapPreviewModal mapUrl={mapImage} onClose={() => setMapImage(null)} />
    </>
  );
};

export default OverlayPage;
