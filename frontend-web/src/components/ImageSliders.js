import React, { useContext, useState } from "react";
import { Carousel } from "antd";
import AppContext from "../context/AppContext";
import "antd/dist/reset.css";

const ImageSliders = () => {
  const { venueBasicInfo } = useContext(AppContext);
  const images = venueBasicInfo?.landing?.venueSlides || [];
  const [curIdx, setCurIdx] = useState(0);
  const [ready, setReady] = useState(false);

  if (!images.length) return null;

  // 监听轮播切换
  const handleBeforeChange = (from, to) => setCurIdx(to);

  // 获取前一张/后一张下标
  const prevIdx = (curIdx - 1 + images.length) % images.length;
  const nextIdx = (curIdx + 1) % images.length;

  return (
    <div style={{
      width: "100%",
      height: "20rem",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* 下层叠影图片（前一张） */}
      <img
        src={images[prevIdx]}
        alt=""
        style={{
          width: "100%",
          height: "20rem",
          objectFit: "fill",
          position: "absolute",
          left: 0,
          top: 0,
          opacity: ready ? 0.20 : 0,
          filter: "blur(4px) grayscale(0.5)",
          zIndex: 1,
          pointerEvents: "none",
          transition: "opacity 0.6s"
        }}
        draggable={false}
      />
      {/* 当前主图 Carousel */}
      <Carousel
        autoplaySpeed={5000}
        autoplay
        dots={false}
        effect="fade"
        beforeChange={handleBeforeChange}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 2
        }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            style={{
              width: "100%",
              height: "19.5rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div style={{height:"20rem"}}>
              <img
                src={img}
                alt={`slide-${idx}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  display: "block",
                  boxShadow: "0 0 40px 10px rgba(0,0,0,0.09)"
                }}
                draggable={false}
                onLoad={idx === 0 ? () => setReady(true) : undefined}
              />
            </div>

          </div>
        ))}
      </Carousel>
      {/* 下层叠影图片（后一张，可选） */}
      <img
        src={images[nextIdx]}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "fill",
          position: "absolute",
          left: 0,
          top: 0,
          opacity: ready ? 0.13 : 0,
          filter: "blur(6px) grayscale(0.7)",
          zIndex: 0,
          pointerEvents: "none",
          transition: "opacity 0.6s"
        }}
        draggable={false}
      />
    </div>
  );
};

export default ImageSliders;
