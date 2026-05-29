import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X } from "lucide-react";

const MapPreviewModal = ({ mapUrl, onClose }) => {
  if (!mapUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4"
    >

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[90vw] max-h-full bg-white rounded-lg overflow-hidden"
      >
        <TransformWrapper
          initialScale={1}
          minScale={1}
          limitToBounds
          doubleClick={{ disabled: false }}
          pinch={{ step: 5 }}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent>
            <img
              src={mapUrl}
              alt="map"
              className="w-full h-full object-contain touch-none"
            />
          </TransformComponent>
        </TransformWrapper>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 shadow-md cursor-pointer bg-transparent"
        >
          <X size={24} color="black" />
        </button>
      </div>
    </div>
  );
};

export default MapPreviewModal;
