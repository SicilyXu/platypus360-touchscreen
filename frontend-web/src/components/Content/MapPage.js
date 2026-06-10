import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import LayoutWrapper from "./LayoutWrapper";
import AppContext from "../../context/AppContext";
import { adjustLightness } from "../../utils/colorCalculator";

const GOOGLE_MAPS_API_KEY = "AIzaSyD63grvHYISPK4dLfyj5kKmC6MR_wQPJ80".trim();

function toHexColor(value) {
  if (!value) return "#8b6c2b";
  if (value.startsWith("#")) return value;

  const parts = value.match(/\d+/g);
  if (!parts || parts.length < 3) return "#8b6c2b";

  const [r, g, b] = parts.map((part) => Math.max(0, Math.min(255, parseInt(part, 10))));
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5f5f5f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d6d6d6" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ededed" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e4e4e4" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#efefef" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cccccc" }, { weight: 0.5 }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#808080" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
];

const MapPage = ({ node, onBack, rootName, fromAdv = false }) => {
  const { venueBasicInfo } = useContext(AppContext);
  const mainMapRef = useRef(null);
  const routeMapRef = useRef(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [holdUntil, setHoldUntil] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [travelMode, setTravelMode] = useState("DRIVING");
  const [routeInfo, setRouteInfo] = useState({ driving: null, transit: null });
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  const standardColor = venueBasicInfo?.theme?.standard || "#8b6c2b";
  const lightColor = venueBasicInfo?.theme?.light || standardColor;
  const baseHex = toHexColor(standardColor);
  const darkerStandard = adjustLightness(baseHex, -0.1);
  const darkColor = venueBasicInfo?.theme?.dark || darkerStandard;
  const carouselBackground = adjustLightness(baseHex, 0.45);

  const venueGeo = useMemo(
    () =>
      venueBasicInfo?.landing?.geoLocation || {
        latitude: -37.8136,
        longitude: 144.9631,
        address: "Melbourne VIC",
      },
    [venueBasicInfo?.landing?.geoLocation]
  );

  const locationsWithDistance = useMemo(() => {
    return (node?.attributes || [])
      .filter((item) => item?.mapData?.geoLocation)
      .map((item) => {
        const geo = item.mapData.geoLocation;
        const lat = Number(geo.lat ?? geo.latitude);
        const lng = Number(geo.lng ?? geo.longitude);

        return {
          lat,
          lng,
          name: item.name || "Unnamed",
          desc: item.mapData.desc || "",
          address: geo.address || "",
          imageUrl: item.mapData.imageUrl || "",
          distance: calculateDistance(venueGeo.latitude, venueGeo.longitude, lat, lng),
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }, [node?.attributes, venueGeo.latitude, venueGeo.longitude]);

  useEffect(() => {
    if (window.google?.maps) {
      setMapsReady(true);
      return undefined;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      const onLoad = () => setMapsReady(true);
      existing.addEventListener("load", onLoad, { once: true });
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsReady(true);
    document.body.appendChild(script);
    return undefined;
  }, []);

  useEffect(() => {
    if (!mapsReady || !mainMapRef.current || !window.google?.maps) return undefined;

    const googleMaps = window.google.maps;
    const map = new googleMaps.Map(mainMapRef.current, {
      zoom: 15,
      mapTypeId: "roadmap",
      center: { lat: venueGeo.latitude, lng: venueGeo.longitude },
      mapTypeControl: false,
      disableDefaultUI: true,
      fullscreenControl: false,
      styles: mapStyles,
    });

    const venuePosition = { lat: venueGeo.latitude, lng: venueGeo.longitude };
    const markerIcon = {
      path: "M16 0C7.163 0 0 7.163 0 16c0 9.941 16 32 16 32s16-22.059 16-32C32 7.163 24.837 0 16 0z",
      fillColor: baseHex,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 5,
      scale: 1.5,
      anchor: new googleMaps.Point(16, 48),
    };

    new googleMaps.Marker({
      position: venuePosition,
      map,
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        fillColor: "rgba(0,0,0,0.25)",
        fillOpacity: 0.4,
        scale: 18,
        strokeWeight: 0,
      },
      zIndex: 9998,
    });

    const venueMarker = new googleMaps.Marker({
      position: venuePosition,
      map,
      icon: markerIcon,
      zIndex: 9999,
      optimized: false,
      animation: googleMaps.Animation.BOUNCE,
    });

    const pulse = setInterval(() => {
      venueMarker.setAnimation(null);
      setTimeout(() => venueMarker.setAnimation(googleMaps.Animation.BOUNCE), 200);
    }, 2000);

    return () => clearInterval(pulse);
  }, [mapsReady, baseHex, venueGeo.latitude, venueGeo.longitude]);

  useEffect(() => {
    if (!selectedLocation || !mapsReady || !window.google?.maps || !routeMapRef.current) {
      return undefined;
    }

    const googleMaps = window.google.maps;
    const routeMap = new googleMaps.Map(routeMapRef.current, {
      zoom: 12,
      center: { lat: venueGeo.latitude, lng: venueGeo.longitude },
      mapTypeControl: false,
      fullscreenControl: false,
      disableDefaultUI: true,
      styles: mapStyles,
    });

    const origin = { lat: venueGeo.latitude, lng: venueGeo.longitude };
    const directionsService = new googleMaps.DirectionsService();
    const drivingRenderer = new googleMaps.DirectionsRenderer({
      suppressInfoWindows: true,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: baseHex,
        strokeOpacity: 0.95,
        strokeWeight: 5,
      },
      map: travelMode === "DRIVING" ? routeMap : null,
    });
    const transitRenderer = new googleMaps.DirectionsRenderer({
      suppressInfoWindows: true,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: adjustLightness(baseHex, -0.25),
        strokeOpacity: 0.95,
        strokeWeight: 5,
      },
      map: travelMode === "TRANSIT" ? routeMap : null,
    });

    const randomOffset = 0.0005;
    const destination = {
      lat: selectedLocation.lat + (Math.random() - 0.5) * randomOffset,
      lng: selectedLocation.lng + (Math.random() - 0.5) * randomOffset,
    };

    const requestDrivingRoute = async (originPoint, destinationPoint, attempt = 1) => {
      return new Promise((resolve) => {
        directionsService.route(
          {
            origin: originPoint,
            destination: destinationPoint,
            travelMode: googleMaps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date() },
            avoidFerries: true,
          },
          (result, status) => {
            const legs = result?.routes?.[0]?.legs;
            const allDriving =
              legs &&
              legs.every((leg) => leg.steps.every((step) => step.travel_mode === "DRIVING"));

            if (status === "OK" && allDriving) {
              drivingRenderer.setDirections(result);
              const firstLeg = legs[0];
              setRouteInfo((current) => ({
                ...current,
                driving: {
                  durationText: firstLeg.duration?.text || "",
                  distanceText: firstLeg.distance?.text || "",
                },
              }));
              resolve(true);
              return;
            }

            if (attempt < 3) {
              const jitter = 0.001 * attempt;
              const nextDestination = {
                lat: destinationPoint.lat + (Math.random() - 0.5) * jitter,
                lng: destinationPoint.lng + (Math.random() - 0.5) * jitter,
              };
              resolve(requestDrivingRoute(originPoint, nextDestination, attempt + 1));
              return;
            }

            setRouteInfo((current) => ({ ...current, driving: null }));
            resolve(false);
          }
        );
      });
    };

    setRouteInfo({ driving: null, transit: null });
    requestDrivingRoute(origin, destination);

    directionsService.route(
      {
        origin,
        destination,
        travelMode: googleMaps.TravelMode.TRANSIT,
      },
      (result, status) => {
        if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
          transitRenderer.setDirections(result);
          const firstLeg = result.routes[0].legs[0];
          setRouteInfo((current) => ({
            ...current,
            transit: {
              durationText: firstLeg.duration?.text || "",
              distanceText: firstLeg.distance?.text || "",
            },
          }));
        } else {
          setRouteInfo((current) => ({ ...current, transit: null }));
        }
      }
    );

    return () => {
      drivingRenderer.setMap(null);
      transitRenderer.setMap(null);
    };
  }, [selectedLocation, mapsReady, travelMode, baseHex, venueGeo.latitude, venueGeo.longitude]);

  useEffect(() => {
    if (locationsWithDistance.length <= 1) return undefined;

    const interval = setInterval(() => {
      if (Date.now() < holdUntil) return;
      setActiveIndex((current) => (current + 1) % locationsWithDistance.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [locationsWithDistance.length, holdUntil]);

  useEffect(() => {
    if (activeIndex >= locationsWithDistance.length && locationsWithDistance.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, locationsWithDistance.length]);

  const focusCard = (index) => {
    setActiveIndex(index);
    setHoldUntil(Date.now() + 2000);
  };

  const visibleIndexes = (() => {
    if (!locationsWithDistance.length) return [];
    if (locationsWithDistance.length <= 3) {
      return locationsWithDistance.map((_, index) => index);
    }

    const count = locationsWithDistance.length;
    return [(activeIndex - 1 + count) % count, activeIndex % count, (activeIndex + 1) % count];
  })();

  return (
    <LayoutWrapper node={node} onBack={onBack} rootName={rootName} fromAdv={fromAdv}>
      <div
        className="w-full h-full flex flex-col relative"
        style={{ background: `linear-gradient(to bottom right, ${darkerStandard}, ${darkColor})` }}
      >
        <div className="text-white text-[2rem] font-bold text-center py-4">
          {node?.name || "Map"}
        </div>

        <div className="relative h-[70%] overflow-hidden">
          <div ref={mainMapRef} className="absolute inset-0" />

          {selectedLocation && (
            <div className="absolute inset-0 bg-black/60 flex flex-col z-30">
              <div
                className="flex flex-wrap items-center gap-4 p-3"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  color: "#333",
                  borderBottom: `2px solid ${baseHex}`,
                }}
              >
                <div className="font-semibold">
                  Route to: <span style={{ color: baseHex }}>{selectedLocation.name}</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span>
                    Driving:{" "}
                    {routeInfo.driving
                      ? `${routeInfo.driving.durationText} (${routeInfo.driving.distanceText})`
                      : "-"}
                  </span>
                  <span>
                    Transit:{" "}
                    {routeInfo.transit
                      ? `${routeInfo.transit.durationText} (${routeInfo.transit.distanceText})`
                      : "-"}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-6">
                  {(routeInfo.driving || routeInfo.transit) && (
                    <div className="flex items-center gap-3 text-sm">
                      {routeInfo.driving && (
                        <button
                          onClick={() => setTravelMode("DRIVING")}
                          className={`px-3 py-1 rounded font-medium ${travelMode === "DRIVING" ? "text-white" : ""}`}
                          style={{
                            background: travelMode === "DRIVING" ? baseHex : "transparent",
                            border: `1px solid ${baseHex}`,
                          }}
                        >
                          Show Driving
                        </button>
                      )}

                      {routeInfo.transit && (
                        <button
                          onClick={() => setTravelMode("TRANSIT")}
                          className={`px-3 py-1 rounded font-medium ${travelMode === "TRANSIT" ? "text-white" : ""}`}
                          style={{
                            background: travelMode === "TRANSIT" ? baseHex : "transparent",
                            border: `1px solid ${baseHex}`,
                          }}
                        >
                          Show Transit
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="px-3 py-1 rounded text-white bg-red-500 hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div ref={routeMapRef} className="flex-1" />
            </div>
          )}
        </div>

        <div
          className="relative h-[30%] border-t flex items-center justify-center overflow-hidden"
          style={{ background: carouselBackground, borderColor: adjustLightness(baseHex, 0.1) }}
        >
          {locationsWithDistance.length > 1 && (
            <>
              <button
                onClick={(evt) => {
                  evt.stopPropagation();
                  focusCard((activeIndex - 1 + locationsWithDistance.length) % locationsWithDistance.length);
                }}
                className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-lg hover:bg-white transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={(evt) => {
                  evt.stopPropagation();
                  focusCard((activeIndex + 1) % locationsWithDistance.length);
                }}
                className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-lg hover:bg-white transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="flex justify-center items-center gap-2 transition-all duration-500 ease-in-out h-[95%] overflow-hidden w-[100%] mx-auto">
            {visibleIndexes.map((index) => {
              const location = locationsWithDistance[index];
              const highlighted = selectedCardIndex === index;
              const routeOpen =
                selectedLocation &&
                selectedLocation.lat === location.lat &&
                selectedLocation.lng === location.lng;

              return (
                <div
                  key={`${location.lat}-${location.lng}-${index}`}
                  onClick={() => {
                    setActiveIndex(index);
                    setSelectedLocation(locationsWithDistance[index]);
                    setSelectedCardIndex(index);
                    setHoldUntil(Date.now() + 5000);
                    setTravelMode("DRIVING");
                    setTimeout(() => setSelectedCardIndex(null), 5000);
                  }}
                  className="cursor-pointer transition-all duration-300 overflow-hidden rounded-xl shadow"
                  style={{
                    width: locationsWithDistance.length <= 3 ? "32%" : "32%",
                    height: "100%",
                    background: highlighted ? adjustLightness(lightColor, 0.85) : "#fff",
                    border: routeOpen ? `2px solid ${baseHex}` : "1px solid rgba(0,0,0,0.05)",
                    color: adjustLightness(baseHex, highlighted ? -0.4 : -0.2),
                    transform: highlighted ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {location.imageUrl ? (
                    <img src={location.imageUrl} alt={location.name} className="w-full h-[68%] object-cover" />
                  ) : (
                    <div className="w-full h-[68%] flex items-center justify-center text-sm text-gray-500" style={{ background: "#f2f2f2" }}>
                      No Image
                    </div>
                  )}

                  <div className="h-[80px] flex flex-col justify-center px-3">
                    <div className="flex items-baseline justify-between">
                      <div className="font-semibold text-[15px] text-gray-800 truncate">{location.name}</div>
                      <div className="text-[12px] text-gray-500 ml-2 flex-shrink-0">{location.distance} km</div>
                    </div>
                    {location.desc && (
                      <div className="text-gray-500 text-[12px] mt-1 overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {location.desc}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default MapPage;
