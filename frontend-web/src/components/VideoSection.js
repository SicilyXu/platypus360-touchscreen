import React, { useEffect, useRef, useState, useContext, useMemo, useCallback } from "react";
import AppContext from "../context/AppContext";

function weightedOrder(videos) {
  const idxArr = [];
  videos.forEach((v, i) => {
    const count = v.weight && v.weight > 0 ? v.weight : 1;
    for (let j = 0; j < count; j++) idxArr.push(i);
  });
  return idxArr;
}

function shuffle(arr) {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const VIDEO_LOAD_TIMEOUT_MS = 8000;

const VideoSection = () => {
  const { venueVideos } = useContext(AppContext);
  const videoRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const switchingRef = useRef(false);

  const videos = useMemo(
    () => (Array.isArray(venueVideos) ? venueVideos : []).filter(v => Boolean(v?.videoUrl || v?.publicLink)),
    [venueVideos]
  );
  const [order, setOrder] = useState([]);
  const [curIdx, setCurIdx] = useState(0);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const advanceVideo = useCallback(() => {
    if (!order.length) return;
    switchingRef.current = true;

    if (curIdx === order.length - 1) {
      setOrder(shuffle(weightedOrder(videos)));
      setCurIdx(0);
      return;
    }

    setCurIdx(idx => idx + 1);
  }, [curIdx, order.length, videos]);

  useEffect(() => {
    clearLoadTimeout();

    if (!videos.length) {
      setOrder([]);
      setCurIdx(0);
      return;
    }

    setOrder(shuffle(weightedOrder(videos)));
    setCurIdx(0);
  }, [videos, clearLoadTimeout]);

  useEffect(() => {
    clearLoadTimeout();

    if (!videoRef.current || !order.length) {
      return undefined;
    }

    const player = videoRef.current;
    switchingRef.current = true;
    player.currentTime = 0;
    player.load();

    loadTimeoutRef.current = setTimeout(() => {
      console.warn("[VideoSection] Video load timed out, skipping to next video");
      advanceVideo();
    }, VIDEO_LOAD_TIMEOUT_MS);

    return clearLoadTimeout;
  }, [curIdx, order, advanceVideo, clearLoadTimeout]);

  const handleEnded = useCallback(() => {
    clearLoadTimeout();
    advanceVideo();
  }, [advanceVideo, clearLoadTimeout]);

  const handleVideoReady = useCallback(() => {
    clearLoadTimeout();

    if (!videoRef.current) return;

    videoRef.current.play().catch((err) => {
      console.warn("[VideoSection] play() failed after ready event:", err?.message || err);
    });
    switchingRef.current = false;
  }, [advanceVideo, clearLoadTimeout]);

  const handleVideoError = useCallback(() => {
    clearLoadTimeout();
    if (switchingRef.current) {
      console.warn("[VideoSection] Ignoring transient error while switching sources");
      return;
    }
    const mediaError = videoRef.current?.error;
    console.warn(
      "[VideoSection] Video playback error, skipping to next video:",
      mediaError?.message || mediaError?.code || "unknown"
    );
    advanceVideo();
  }, [advanceVideo, clearLoadTimeout]);

  if (!videos.length || !order.length) return null;

  const currentVideo = videos[order[curIdx]];
  const src = currentVideo.videoUrl || currentVideo.publicLink;
  return (
    <div className="w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <video
        key={currentVideo.id || src || curIdx}
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        onEnded={handleEnded}
        onLoadedData={handleVideoReady}
        onCanPlay={handleVideoReady}
        onError={handleVideoError}
        playsInline
        preload="auto"
        controls={false}
        autoPlay
        muted
      />
    </div>
  );
};

export default VideoSection;
