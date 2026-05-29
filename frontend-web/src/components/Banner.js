import React, { useState } from "react";
import "../App.css"; // Ensure your CSS is imported

const Banner = ({ venueBasicInfo }) => {
  const [logoError, setLogoError] = useState(false);

  if (!venueBasicInfo) return null;

  const logoUrl = venueBasicInfo.landing?.venueLogo;
  const themeColor = venueBasicInfo.theme?.standard || "#234B92";

  return (
    <div
      className="w-full flex items-center justify-center relative shadow-lg overflow-hidden"
      style={{
        height: "18.3125rem",
        background: `linear-gradient(120deg, ${themeColor} 70%, #e2c886 100%)`,
      }}
    >
      {/* 💡 wave 覆盖在 logo 上面 */}
      <div className="absolute inset-0 w-full  h-[18.3125rem] pointer-events-none z-20 overflow-hidden">
        <div className="banner-wave-glow" />
      </div>

      {logoUrl && !logoError ? (
        <img
          src={logoUrl}
          alt={venueBasicInfo.name}
          className="w-full h-full object-fill animate-fadeInScale z-10"
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className="text-white text-2xl font-bold drop-shadow-lg animate-fadeInScale z-10">
          {venueBasicInfo.name}
        </span>
      )}
    </div>
  );

};

export default Banner;
