import React, { useEffect, useRef, useState, useContext, useMemo } from "react";
import AppContext from "../context/AppContext";

const VideoSection = () => {
  const { venueVideos } = useContext(AppContext);
  const displayMode = false; // 绂荤嚎鐗堟案杩滄槸false

  const videoRef = useRef(null);

  // 鍏滃簳锛歷enueVideos 闈炴暟缁勬椂杩斿洖绌烘暟缁?
  const videos = useMemo(
    () => (Array.isArray(venueVideos) ? venueVideos : []),
    [venueVideos]
  );

  const [curIdx, setCurIdx] = useState(0); // 褰撳墠鎾斁瑙嗛绱㈠紩

  // 姣忔鍒囨崲寮哄埗浠庡ご鎾斁
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } catch {}
    }
  }, [curIdx]);

  // 瑙嗛鑷劧鎾斁瀹岋紝鑷姩鍒囨崲鍒颁笅涓€娈?
  const handleEnded = () => {
    if (!videos.length) return;
    setCurIdx((idx) => (idx + 1) % videos.length);
  };

  // 鎵嬪姩涓婁竴娈?涓嬩竴娈碉紙displayMode 涓?true 鎵嶆樉绀烘寜閽級
  const goPrev = () => {
    if (!videos.length) return;
    setCurIdx((idx) => (idx - 1 + videos.length) % videos.length);
  };

  const goNext = () => {
    if (!videos.length) return;
    setCurIdx((idx) => (idx + 1) % videos.length);
  };

  if (!videos.length) return null;

  // 褰撳墠瑙嗛
  const v = videos[curIdx];

  return (
    <div className="w-full h-full bg-black overflow-hidden flex items-center justify-center relative">
      <video
        key={v.id || v.publicLink || curIdx}
        ref={videoRef}
        src={v.publicLink}
        className="w-full h-full object-cover"
        onEnded={handleEnded}
        playsInline
        preload="auto"
        controls={false}
      />

     {displayMode && (
        <>
          {/* 宸︾澶?*/}
          <button
            type="button"
            aria-label="Previous video"
            onClick={goPrev}
            className="absolute left-[1rem] top-1/2 -translate-y-1/2 w-[3rem] h-[3rem] flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm border border-white/30 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="white"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 鍙崇澶?*/}
          <button
            type="button"
            aria-label="Next video"
            onClick={goNext}
            className="absolute right-[1rem] top-1/2 -translate-y-1/2 w-[3rem] h-[3rem] flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm border border-white/30 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="white"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 褰撳墠搴忓彿 */}
          <div className="absolute bottom-[0.75rem] left-1/2 -translate-x-1/2 text-white/90 text-[0.9rem] px-[0.5rem] py-[0.25rem] bg-black/30 rounded">
            {curIdx + 1} / {videos.length}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoSection;
