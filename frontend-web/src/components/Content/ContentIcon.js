import React from "react";

const ICON_PREFIX = "https://touchscreen-cms.s3.ap-southeast-2.amazonaws.com/icons/";
const DEFAULT_ICONS = {
  default1: ICON_PREFIX + "default1.png",
  default2: ICON_PREFIX + "default2.png",
};

const ICON_DICT = [
  {
    icon: "accomodation",
    aliases: [
      "accomodation", "accommodation", "accommodations", "accomodations",
      "hotel", "hotels", "our hotel", "our hotels", "stay", "stays", "lodging", "lodgings"
    ],
  },
  { icon: "activities",   aliases: ["activity", "activities", "explore", "explores"] },
  { icon: "destinations", aliases: ["destonations", "destination", "destinations", "destionations"] },
  { icon: "eating_out",   aliases: ["eating out", "eat out", "dining", "dine", "restaurant", "restaurants"] },
  { icon: "events",       aliases: ["event", "events", "festival", "festivals"] },
  { icon: "map",          aliases: ["map", "maps", "location", "locations"] },
  { icon: "services",     aliases: ["service", "services"] },
];

/** 鏍规嵁鍚嶇О鍖归厤 ICON */
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
 * - `name` 鍙互鏄?string锛堢被鍒悕锛夋垨瀵硅薄锛堝寘鍚?{ name, bannerImage/bannerimage }锛?
 * - 浠呰鍙栤€滃綋鍓嶅璞￠《灞傗€濈殑 bannerImage锛涗笉鏌?attributes
 */
export default function ContentIcon({ name, size = 32, defaultType = "default1", style = {} }) {
  let rawName = name;
  let bannerImage = null;

  if (name && typeof name === "object") {
    rawName = name.name || "";
    bannerImage = name.bannerImage || name.bannerimage || null; // 浠呴《灞?
  }

  const cleanBannerImage = typeof bannerImage === 'string' ? bannerImage.replace(/^\\{|\\}$/g, '').trim() : bannerImage;
  const base = cleanBannerImage ? null : getIconBaseByName(rawName);
  const fallbackIcon = DEFAULT_ICONS[defaultType] || DEFAULT_ICONS.default1;
  const url = cleanBannerImage
    ? cleanBannerImage
    : base
      ? `${ICON_PREFIX}${base}_icon.png`
      : fallbackIcon;

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
