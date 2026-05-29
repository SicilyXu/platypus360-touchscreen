import React, { useContext, useState, useMemo, useRef } from "react";
import { Carousel, Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import AppContext from "../context/AppContext";
import { adjustLightness } from "../utils/colorCalculator";
import "antd/dist/reset.css";

const AdsSection = ({ onAdvClick }) => {
  const { venueAdvs, venueBasicInfo } = useContext(AppContext);
  const standardColor = venueBasicInfo?.theme?.standard || "#234B92";
  const lightColor = adjustLightness(standardColor, 0.3);

  const images = useMemo(() => {
    return (venueAdvs || []).map((item) => ({
      image: item.image,
      ts_content_id: item.ts_content_id,
    }));
  }, [venueAdvs]);

  const [curIdx, setCurIdx] = useState(0);
  const slider = useRef(null);

  if (images.length === 0) return null;

  const handleBeforeChange = (_, to) => setCurIdx(to);
  const prevIdx = (curIdx - 1 + images.length) % images.length;

  return (
    <>
      <style>{`
        .slide-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          background: transparent;
          border: none;
          transition: transform 0.1s ease-out;
        }
        .slide-btn:active {
          transform: translateY(-50%) scale(0.85);
        }
        .slide-btn-left {
          left: 12px;
        }
        .slide-btn-right {
          right: 12px;
        }
        .slide-img {
          width: 100%;
          height: 100%;
          object-fit: fill;
        }
      `}</style>

      <div
        style={{
          width: "100%",
          height: "19.5rem",
          position: "relative",
          overflow: "hidden",
          backgroundColor: lightColor,
        }}
      >
        {/* 背景模糊图 */}
        <img
          src={images[prevIdx]?.image}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            opacity: 0.2,
            filter: "blur(4px) grayscale(0.5)",
            zIndex: 1,
            pointerEvents: "none",
          }}
          draggable={false}
        />

        {/* 左箭头 */}
        <Button
          className="slide-btn slide-btn-left"
          type="text"
          shape="circle"
          icon={<LeftOutlined />}
          onClick={() => slider.current.prev()}
          style={{ color: lightColor, fontSize: "2.5rem" }}
        />

        {/* Carousel 内容 */}
        <Carousel
          ref={slider}
          draggable
          autoplay
          effect="slide"
          dots={false}
          autoplaySpeed={5000}
          beforeChange={handleBeforeChange}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            zIndex: 2,
          }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: img.ts_content_id ? "pointer" : "default",
              }}
              onClick={() => {
                console.log("🎯 Clicked slide:", img.ts_content_id);
                if (img.ts_content_id && onAdvClick) {
                  onAdvClick(img.ts_content_id);
                }
              }}
            >
              <img
                src={img.image}
                alt={`adv-${idx}`}
                className="slide-img"
                style={{
                  width: "100%",
                  height: "19.5rem",
                  objectFit: "fill",
                  pointerEvents: "none", // 关键！img 不响应，外层 div 响应
                }}
                draggable={false}
              />
            </div>
          ))}
        </Carousel>

        {/* 右箭头 */}
        <Button
          className="slide-btn slide-btn-right"
          type="text"
          shape="circle"
          icon={<RightOutlined />}
          onClick={() => slider.current.next()}
          style={{ color: lightColor, fontSize: "2.5rem" }}
        />
      </div>
    </>
  );
};

export default AdsSection;
