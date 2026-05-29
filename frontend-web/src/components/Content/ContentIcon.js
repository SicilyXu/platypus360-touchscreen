import React from "react";
import accomodationIcon from "../../assets/icons/accomodation_icon.png";
import activitiesIcon from "../../assets/icons/activities_icon.png";
import destinationsIcon from "../../assets/icons/destinations_icon.png";
import eatingOutIcon from "../../assets/icons/eating_out_icon.png";
import eventsIcon from "../../assets/icons/events_icon.png";
import mapIcon from "../../assets/icons/map_icon.png";
import servicesIcon from "../../assets/icons/services_icon.png";
import defaultIcon from "../../assets/icons/default1.png";

const DEFAULT_ICONS = {
  default1: defaultIcon,
  default2: defaultIcon,
};

const ICON_DICT = [
  {
    icon: accomodationIcon,
    aliases: [
      "accomodation", "accommodation", "accommodations", "accomodations",
      "hotel", "hotels", "our hotel", "our hotels", "stay", "stays", "lodging", "lodgings"
    ],
  },
  { icon: activitiesIcon,   aliases: ["activity", "activities", "explore", "explores"] },
  { icon: destinationsIcon, aliases: ["destonations", "destination", "destinations", "destionations"] },
  { icon: eatingOutIcon,    aliases: ["eating out", "eat out", "dining", "dine", "restaurant", "restaurants"] },
  { icon: eventsIcon,       aliases: ["event", "events", "festival", "festivals"] },
  { icon: mapIcon,          aliases: ["map", "maps", "location", "locations"] },
  { icon: servicesIcon,     aliases: ["service", "services"] },
];

/** 根据名称匹配 ICON */
function getIconBaseByName(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase().replace(/\s+|-/g, " ");
  for (const entry of ICON_DICT) {
    if (entry.aliases.includes(key)) return entry.icon;
  }
  return null;
}

/**
 * ContentIcon
 * - `name` 可以是 string（类别名）或对象（包含 { name, bannerImage/bannerimage }）
 * - 仅读取“当前对象顶层”的 bannerImage；不查 attributes
 */
export default function ContentIcon({ name, size = 32, defaultType = "default1", style = {} }) {
  let rawName = name;
  let bannerImage = null;

  if (name && typeof name === "object") {
    rawName = name.name || "";
    bannerImage = name.bannerImage || name.bannerimage || null; // 仅顶层
  }

  const localIcon = bannerImage ? null : getIconBaseByName(rawName);
  const fallbackIcon = DEFAULT_ICONS[defaultType] || DEFAULT_ICONS.default1;
  const url = bannerImage || localIcon || fallbackIcon;

  const [imgSrc, setImgSrc] = React.useState(url);

  React.useEffect(() => {
    setImgSrc(url);
  }, [url]);

  const isDefault = imgSrc === DEFAULT_ICONS.default1 || imgSrc === DEFAULT_ICONS.default2;

  return (
    <img
      src={imgSrc}
      alt={typeof rawName === "string" ? rawName : ""}
      width={size}
      height={size}
      style={{
        display: "block",
        objectFit: "contain",
        ...(isDefault ? { filter: "invert(1) brightness(2) opacity(0.5)" } : {}),
        ...style,
      }}
      draggable={false}
      onError={() => {
        if (imgSrc !== fallbackIcon) setImgSrc(fallbackIcon);
      }}
    />
  );
}
