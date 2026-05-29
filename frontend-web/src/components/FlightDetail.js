import React, { useContext, useMemo, useEffect, useState } from "react";
import { X, Plane } from "lucide-react";
import AppContext from "../context/AppContext";
import { adjustLightness } from "../utils/colorCalculator";

// 航班信息卡片
const FlightInfoCard = ({ title, info }) => (
  <div className="w-full p-[0.25rem] text-[1.25rem] leading-[1.8rem]">
    <div className="flex items-center gap-[0.5rem] mb-[1rem]">
      <h2 className="w-full text-[1.6rem] font-bold text-white text-center mb-[1rem]">
        {title}
      </h2>
    </div>
    <div className="space-y-[0.3rem] text-white text-opacity-90 px-[1rem]">
      {info.map((item, index) => (
        <p key={index}>
          <span className="font-semibold text-white text-opacity-100">
            {item.label}:
          </span>{" "}
          {item.value || "-"}
        </p>
      ))}
    </div>
  </div>
);

const FlightDetailPage = ({ selectedFlight, onBack, onFlightClick }) => {
  const { venueBasicInfo, flightsData } = useContext(AppContext);

  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";
  const lightColor = adjustLightness(standardColor, 0.3);
  const bgColor = adjustLightness(standardColor, -0.1);

  const itemsPerGroup = 5;
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [animateKey, setAnimateKey] = useState(0);

  // 每分钟更新当前时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 飞行进度计算
  const progress = useMemo(() => {
    const dep = new Date(selectedFlight.departure?.estimated).getTime();
    const arr = new Date(selectedFlight.arrival?.estimated).getTime();
    if (!dep || !arr || dep >= arr) return null;
    return Math.max(0, Math.min(1, (currentTime - dep) / (arr - dep)));
  }, [selectedFlight, currentTime]);

  const progressPercent = Math.round((progress || 0) * 100);

  useEffect(() => {
    if (progress !== null) {
      setAnimatedPercent(0);
      const timeout = setTimeout(() => {
        setAnimatedPercent(progressPercent);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [progress, progressPercent]);

  const formatTime = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    return d.toLocaleString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatShortTime = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // upcoming 全量
  const upcomingDepartures = useMemo(() => {
    const now = currentTime;
    return flightsData
      .filter(
        (f) =>
          f.departure?.estimated &&
          f.departure.estimated !== selectedFlight.departure?.estimated &&
          new Date(f.departure.estimated).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(a.departure.estimated).getTime() -
          new Date(b.departure.estimated).getTime()
      );
  }, [flightsData, selectedFlight, currentTime]);

  // 每 8 秒自动切换组
  useEffect(() => {
    const totalGroups = Math.ceil(upcomingDepartures.length / itemsPerGroup);
    const interval = setInterval(() => {
      setCurrentGroupIndex((prev) => (prev + 1) % totalGroups);
      setAnimateKey(Date.now()); // 触发动画
    }, 8000);
    return () => clearInterval(interval);
  }, [upcomingDepartures.length]);

  //  当前页展示内容
  const pagedDepartures = useMemo(() => {
    const start = currentGroupIndex * itemsPerGroup;
    return upcomingDepartures.slice(start, start + itemsPerGroup);
  }, [upcomingDepartures, currentGroupIndex]);


  if (!selectedFlight) return null;

  return (
    <div
      className="w-full h-full text-white px-[2rem] py-[3rem] overflow-hidden flex flex-col items-center "
      style={{ background: `linear-gradient(to bottom, ${standardColor}, ${bgColor})` }}
    >
      {/* 顶部标题 */}
      <div className="w-full max-w-[64rem] flex items-center justify-between">
        <button onClick={onBack} className="text-white" aria-label="Close">
          <X size={28} />
        </button>
        <div className="flex flex-col items-center text-center flex-1">
          <h1 className="text-[1.9rem] font-bold">
            Flight {selectedFlight.flight?.iata || selectedFlight.flight?.number || "-"}
          </h1>
          <p className="text-[1.5rem] opacity-80">
            {selectedFlight.departure?.iata}  →  {selectedFlight.arrival?.iata}
          </p>
        </div>
        <div className="w-[28px]" />
      </div>

      {/* 中间内容 */}
      <div className="w-full bg-white bg-opacity-10 p-[2rem] shadow-md rounded-md mt-[1rem]">
        <div className="flex flex-col md:flex-row justify-between gap-[1rem]">
          <div className="flex-1">
            <FlightInfoCard
              title="Departure"
              info={[
                { label: "Airport", value: selectedFlight.departure?.iata },
                { label: "Time", value: formatTime(selectedFlight.departure?.estimated) },
                { label: "Timezone", value: selectedFlight.departure?.timezone?.replace(/_/g, " ") },
              ]}
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center text-white">
            <h2 className="text-[1.6rem] font-bold mb-[1rem]">Progress</h2>
            {progress !== null ? (
              <>
                <div className="w-full h-[1rem] bg-white bg-opacity-30 relative mb-[1rem] overflow-hidden border border-white/30 rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${animatedPercent}%`, backgroundColor: lightColor }}
                  />
                </div>
                <div className="text-[1.25rem] opacity-90">
                  {progressPercent >= 100 ? "Arrived" : `Flying · ${progressPercent}%`}
                </div>
                {selectedFlight.flight?.icao && (
                  <div className="text-[1.5rem] opacity-90 pt-[0.5rem]">
                    ICAO: <span>{selectedFlight.flight.icao}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[1.25rem] opacity-60">No flight data</div>
            )}
          </div>

          <div className="flex-1 ml-[1rem]">
            <FlightInfoCard
              title="Arrival"
              info={[
                { label: "Airport", value: selectedFlight.arrival?.iata },
                { label: "Time", value: formatTime(selectedFlight.arrival?.estimated) },
                { label: "Timezone", value: selectedFlight.arrival?.timezone?.replace(/_/g, " ") },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Upcoming Departures */}
      <div className="w-full mt-[2rem]">
        <h2 className="text-[1.8rem] font-bold mb-[1.5rem] text-center text-white">Upcoming Flights</h2>
        <div className="flex flex-col md:flex-row gap-[2rem]">
          <div className="flex-1 bg-white bg-opacity-10 shadow-md rounded-md p-[1.5rem] h-[23rem] overflow-hidden">
            {pagedDepartures.length > 0 ? (
              <ul key={animateKey} className="space-y-[0.8rem] text-white pl-0">
                {pagedDepartures.map((flight, index) => (
                  <li
                    key={index}
                    onClick={() => onFlightClick?.(flight)}
                    className="pl-0cursor-pointer flex items-center gap-[0.6rem] px-[1rem] py-[0.6rem] rounded bg-white bg-opacity-10 text-[1.4rem] font-medium hover:bg-opacity-20 active:scale-[0.98] transition-all duration-200 flip-in"
                    style={{
                      animationDelay: `${index * 0.5}s`, // 
                      animationDuration: "0.6s",
                      animationFillMode: "both",
                    }}
                  >
                    <Plane size={20} />
                    <span>
                      {flight.flight?.iata || "-"}: {flight.departure?.iata || "-"} → {flight.arrival?.iata || "-"} {formatShortTime(flight.departure?.estimated)}
                    </span>
                  </li>
                ))}
              </ul>

            ) : (
              <p className="text-white text-opacity-60">No upcoming departures</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetailPage;
