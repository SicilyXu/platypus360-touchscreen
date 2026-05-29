import React, { useContext, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { adjustLightness } from "../utils/colorCalculator";
import AppContext from "../context/AppContext";

/**
 * 单条潮汐信息卡片
 */
const TideInfoCard = ({ info }) => (
  <div className="w-full text-[1.3rem]">
    {/* 数据列表 */}
    <div className="grid grid-cols-2 gap-[0.5rem]">
      {info.map((item, index) => (
        <div
          key={index}
          className="col-span-1 w-full flex justify-between items-center px-[1rem] py-[0.5rem] bg-white bg-opacity-10 rounded text-white"
        >
          <span className="text-white font-semibold text-xl">{item.label}</span>
          <span className="text-white text-opacity-100 font-medium">{item.value || "-"}</span>
        </div>
      ))}
    </div>
  </div>
);


const TideDetailPage = ({ selectedTide, onBack, onTideClick }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);
  const { venueBasicInfo, tidesData } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";
  // const lightColor = adjustLightness(standardColor, 0.3);
  const bgColor = adjustLightness(standardColor, -0.1);
  const itemsPerGroup = 5;

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const parseTideTime = (dateStr, timeStr) => {
    const [h, m] = timeStr.replace(/am|pm/i, "").split(":").map(Number);
    const isPM = /pm/i.test(timeStr);
    const hour = isPM && h < 12 ? h + 12 : h;
    return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).getTime();
  };

  const upcomingTides = useMemo(() => {
    return tidesData
      .flatMap((day) =>
        day.tides.map((tide) => ({
          ...tide,
          date: day.date,
          timestamp: parseTideTime(day.date, tide.time),
        }))
      )
      .filter((t) => t.timestamp > currentTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [tidesData, currentTime]);

  useEffect(() => {
    const totalGroups = Math.ceil(upcomingTides.length / itemsPerGroup);
    const interval = setInterval(() => {
      setCurrentGroupIndex((prev) => (prev + 1) % totalGroups);
      setAnimateKey(Date.now());
    }, 8000);
    return () => clearInterval(interval);
  }, [upcomingTides.length]);

  const pagedTides = useMemo(() => {
    const start = currentGroupIndex * itemsPerGroup;
    return upcomingTides.slice(start, start + itemsPerGroup);
  }, [upcomingTides, currentGroupIndex]);

  if (!selectedTide) return null;

  return (
    <div
      className="w-full h-full text-white px-[2rem] py-[3rem] overflow-y-auto flex flex-col items-center"
      style={{ background: `linear-gradient(to bottom, ${standardColor}, ${bgColor})` }}
    >
      {/* 顶部标题 */}
      <div className="w-full max-w-[64rem] flex items-center justify-between">
        <button onClick={onBack} className="text-white" aria-label="Close">
          <X size={28} />
        </button>
        <div className="w-[28px]" />
      </div>

      {/* 当前潮汐信息 */}
      <div className="w-full bg-white bg-opacity-10 p-[2rem] shadow-md rounded-md mt-[1rem] flex flex-col items-center">
        <img
          src={
            selectedTide.type.toLowerCase().includes("high")
              ? "https://touchscreen-cms.s3.ap-southeast-2.amazonaws.com/icons/icons8-high-tide-100.png"
              : "https://touchscreen-cms.s3.ap-southeast-2.amazonaws.com/icons/icons8-low-tide-50.png"
          }
          alt="Tide Icon"
          className="
            w-[6rem] h-[6rem] mb-[1.5rem]
            filter invert brightness-[180%]
            animate-float-wobble
          "
        />

        <TideInfoCard
          info={[
            { label: "Date", value: selectedTide.date },
            { label: "Time", value: selectedTide.time },
            { label: "Type", value: selectedTide.type },
            { label: "Height", value: selectedTide.height },
          ]}
        />
      </div>


      {/* Tides Forecast */}
      <div className="w-full mt-[2.5rem]">
        <h2 className="text-[1.8rem] font-bold mb-[2rem] text-center text-white">Tides Forecast</h2>
        <div className="flex flex-col md:flex-row gap-[2rem]">
          <div className="flex-1 bg-white bg-opacity-10 shadow-md rounded-md p-[1.5rem] h-[23rem] overflow-hidden">
            {pagedTides.length > 0 ? (
              <ul key={animateKey} className="space-y-[0.8rem] text-white pl-0">
                {pagedTides.map((tide, index) => {
                  const isHigh = tide.type.toLowerCase().includes("high");
                  const iconUrl = isHigh
                    ? "https://img.icons8.com/ios-filled/50/ffffff/high-tide.png"
                    : "https://img.icons8.com/ios-filled/50/ffffff/low-tide.png";

                  return (
                    <li
                      key={index}
                      onClick={() => onTideClick?.(tide)}
                      className="cursor-pointer flex items-center gap-[0.6rem] px-[1rem] py-[0.6rem] rounded bg-white bg-opacity-10 text-[1.4rem] font-medium hover:bg-opacity-20 active:scale-[0.98] transition-all duration-200 flip-in"
                      style={{
                        animationDelay: `${index * 0.5}s`,
                        animationDuration: "0.6s",
                        animationFillMode: "both",
                      }}
                    >
                      <img src={iconUrl} alt="tide icon" className="w-[1.6rem] h-[1.6rem]" />
                      <span>{tide.date} · {tide.time}  {tide.type}: {tide.height}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-white text-opacity-60">No Tides Forecast</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TideDetailPage;
