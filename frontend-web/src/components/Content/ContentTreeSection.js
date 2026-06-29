import React, { useContext, useRef, useMemo } from "react";
import AppContext from "../../context/AppContext";
import ContentIcon from "./ContentIcon";
import { getVenueDisplayName } from '../../utils/venueDisplayName';

const isNodeOrChildSelected = (node, targetId) => {
  if (node.id === targetId) return true;
  if (Array.isArray(node.attributes)) {
    return node.attributes.some(child => isNodeOrChildSelected(child, targetId));
  }
  return false;
};

/**
 * 顶部横向内容导航条组件（仅负责展示与选中）
 */
const ContentTreeSection = ({ onItemSelect, selectedItem }) => {
  const { contentTree, venueBasicInfo, venueId } = useContext(AppContext);
  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";

  const containerRef = useRef(null);
  const items = useMemo(() => {
    return Array.isArray(contentTree) ? contentTree.slice(0, 7) : [];
  }, [contentTree]);

  const handleClick = (item) => {
    const isSame = selectedItem?.id === item.id;
    onItemSelect?.(isSame ? null : item);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-[10.77625rem] flex"
      style={{ backgroundColor: standardColor }}
    >
      {items.map((item, idx) => {
        const isSelected = selectedItem ? isNodeOrChildSelected(item, selectedItem.id) : false;


        return (
          <div
            key={idx}
            onClick={() => handleClick(item)}
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ease-in-out border border-white box-border ${
              isSelected
                ? "bg-white/30 border-[0.05rem]"
                : "bg-opacity-100 border-[0.025rem]"
            }`}
            style={{
              background: isSelected
                ? `linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.2)), ${standardColor}`
                : standardColor,
            }}
          >
            {/* 图标部分 */}
            <div className="h-[6rem] w-[5rem] mb-[0.8rem] flex items-center justify-center">
              <ContentIcon
                name={item}
                size={isSelected ? 90 : 75}
                style={{
                  maxHeight: isSelected ? "6rem" : "4.5rem",
                  maxWidth: isSelected ? "6rem" : "4.5rem",
                  transition: "all 0.2s",
                }}
              />
            </div>

            {/* 名称文字 */}
            <span
              className={`text-white text-center uppercase leading-[1.1] select-none transition-all duration-200 ${
                isSelected
                  ? "font-bold tracking-widest border-b-[0.15rem] pb-[0.2rem]"
                  : "font-medium tracking-wide"
              } text-[1rem]`}
            >
              {getVenueDisplayName(item?.name, venueId)?.toUpperCase() || ""}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ContentTreeSection;
