import React, { useContext, useEffect, useMemo, useState } from 'react';
import AppContext from '../context/AppContext';
import { Typography } from 'antd';
import { adjustLightness } from '../utils/colorCalculator';
import '../App.css';

const { Text } = Typography;
const VLINE_LOGO_SRC = `${process.env.PUBLIC_URL}/vline-logo-white-180x89.png`;

const VLINE_STOP_ABBREVIATIONS = {
  Yarrawonga: 'Yarra',
  Benalla: 'Ben',
  'Benalla Station': 'Benalla Stn',
  'Melbourne, Southern Cross': 'MSC',
  'Melbourne Southern Cross': 'Melb SC',
};

const extractDestination = (toStr) => {
  if (!toStr) return '';
  const cutoff = ['Catering', 'Reserved', 'Disabled', 'VLocity', 'Sprinter', 'service x', 'Up Front'];
  let result = toStr;
  for (const pattern of cutoff) {
    const idx = result.indexOf(pattern);
    if (idx > 0) {
      result = result.substring(0, idx).trim();
      break;
    }
  }
  return result;
};

const getDisplayFrom = (fromStr) => (fromStr?.includes('Departure time') ? '' : fromStr || '');

const getVenueOriginName = (name) => {
  if (!name) return '';
  return String(name)
    .replace(/\s*Visitor Information Centre\s*/i, '')
    .replace(/\s*Visitor Information\s*/i, '')
    .replace(/\s*Visitor Centre\s*/i, '')
    .trim();
};

const abbreviateVLineStop = (name) => {
  if (!name) return '-';
  if (VLINE_STOP_ABBREVIATIONS[name]) {
    return VLINE_STOP_ABBREVIATIONS[name];
  }

  const words = String(name).trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 10);
  }

  return words
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');
};

const formatVLineDisplay = (service, fallbackFrom = '-') => {
  if (!service) return 'No more services today';
  const rawFrom = getDisplayFrom(service.from);
  const from = rawFrom ? abbreviateVLineStop(rawFrom) : fallbackFrom;
  const to = abbreviateVLineStop(extractDestination(service.to));
  return `${from || '-'} -> ${to || '-'} ${service.departureTime || '--:--'}`;
};

const formatFlightDisplay = (flight) => {
  if (!flight?.departure?.estimated) return 'Invalid flight data';

  const timePart = flight.departure.estimated.split('T')[1]?.slice(0, 5) || '00:00';
  let [h, m] = timePart.split(':').map(Number);
  h = (h + 10) % 24;

  return `${flight.flight?.iata || '-'}: ${flight.departure?.iata || '-'} -> ${flight.arrival?.iata || '-'} ${h
    .toString()
    .padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const timeStringToMinutes = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const LiveInfoBar = (props) => {
  const { flightsData, weatherData, venueBasicInfo, tidesData, vlineData } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const color = adjustLightness(standardColor, 0.35);
  const lightColor = venueBasicInfo?.theme?.light || color;
  const vlineFallbackFrom = venueBasicInfo?.name
    ? abbreviateVLineStop(getVenueOriginName(venueBasicInfo.name))
    : '-';

  const rawLiveInfo = venueBasicInfo?.landing?.liveInfo;
  const liveInfoList = useMemo(() => {
    if (Array.isArray(rawLiveInfo)) {
      return rawLiveInfo.map((s) => String(s).toLowerCase());
    }
    return rawLiveInfo ? [String(rawLiveInfo).toLowerCase()] : ['flight'];
  }, [rawLiveInfo]);

  const upcomingVLineServices = useMemo(() => {
    if (!Array.isArray(vlineData)) return [];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return vlineData.filter((service) => {
      const departureMinutes = timeStringToMinutes(service?.departureTime);
      return departureMinutes != null && departureMinutes > currentMinutes;
    });
  }, [vlineData]);

  const [dateTime, setDateTime] = useState('');
  const [formattedWeather, setFormattedWeather] = useState([]);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('dateTime');
  const [currentDisplay, setCurrentDisplay] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const date = now.getDate().toString().padStart(2, '0');
      const month = now.toLocaleString('default', { month: 'short' });
      const year = now.getFullYear();
      setDateTime(`${hours}:${minutes} ${ampm} | ${date}-${month}-${year}`);
    };

    updateDateTime();
    const id = setInterval(updateDateTime, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const sequence = ['dateTime', 0, 'dateTime', 1, 'dateTime', 2];
    let index = 0;

    const tick = () => {
      setCurrentTimeDisplay(sequence[index]);
      index = (index + 1) % sequence.length;
    };

    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!weatherData?.length) {
      setFormattedWeather([]);
      return;
    }

    const result = weatherData.map((item) => {
      const date = new Date(item.date);
      const formattedDate = `${date.getDate()}-${date.toLocaleString('default', { month: 'short' })}`;
      const brief = item.condition?.text?.split(' ').slice(0, 2).join(' ') || '';
      const temp = `${item.mintemp_c}C-${item.maxtemp_c}C`;
      return `${formattedDate} ${brief} ${temp}`;
    });

    setFormattedWeather(result);
  }, [weatherData]);

  useEffect(() => {
    if (liveInfoList.includes('flight')) {
      if (!flightsData?.length) {
        setCurrentDisplay('No flight information available');
        return undefined;
      }

      let flightIndex = 0;
      const updateFlight = () => {
        setCurrentDisplay(formatFlightDisplay(flightsData[flightIndex]));
        flightIndex = (flightIndex + 1) % flightsData.length;
      };

      updateFlight();
      const id = setInterval(updateFlight, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('tide')) {
      const flatTides = (tidesData || []).flatMap((item) =>
        item.tides.map((tide) => ({
          date: item.date,
          ...tide,
        }))
      );

      if (!flatTides.length) {
        setCurrentDisplay('No tide information available');
        return undefined;
      }

      let tideIndex = 0;
      const updateTide = () => {
        const tide = flatTides[tideIndex];
        setCurrentDisplay(`${tide.date} ${tide.type}: ${tide.time} ${tide.height}`);
        tideIndex = (tideIndex + 1) % flatTides.length;
      };

      updateTide();
      const id = setInterval(updateTide, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('vline')) {
      if (!upcomingVLineServices.length) {
        setCurrentDisplay('No more services today');
        return undefined;
      }

      let serviceIndex = 0;
      const updateVLine = () => {
        setCurrentDisplay(formatVLineDisplay(upcomingVLineServices[serviceIndex], vlineFallbackFrom));
        serviceIndex = (serviceIndex + 1) % upcomingVLineServices.length;
      };

      updateVLine();
      const id = setInterval(updateVLine, 5000);
      return () => clearInterval(id);
    }

    setCurrentDisplay('No live information available');
    return undefined;
  }, [flightsData, liveInfoList, tidesData, upcomingVLineServices, vlineFallbackFrom]);

  const flipKey = currentTimeDisplay === 'dateTime'
    ? dateTime
    : formattedWeather[currentTimeDisplay] || 'No weather information available';

  const handleLeftItemClick = () => {
    if (liveInfoList.includes('flight')) {
      const match = flightsData.find((flight) => formatFlightDisplay(flight) === currentDisplay);
      if (match && typeof props.onLeftItemClick === 'function') {
        props.onLeftItemClick(match);
      }
      return;
    }

    if (liveInfoList.includes('tide')) {
      const flatTides = (props.tidesData || tidesData || []).flatMap((item) =>
        item.tides.map((tide) => ({
          ...tide,
          date: item.date,
        }))
      );

      const match = flatTides.find((tide) => `${tide.date} ${tide.type}: ${tide.time} ${tide.height}` === currentDisplay);
      if (match && typeof props.onLeftItemClick === 'function') {
        props.onLeftItemClick(match);
      }
      return;
    }

    if (liveInfoList.includes('vline')) {
      const match = upcomingVLineServices.find(
        (service) => formatVLineDisplay(service, vlineFallbackFrom) === currentDisplay
      );
      if (match && typeof props.onLeftItemClick === 'function') {
        props.onLeftItemClick(match);
      }
    }
  };

  return (
    <div className="flex flex-col text-white">
      <div className="flex h-[26%]">
        <div
          className="w-1/2 flex justify-center items-center cursor-pointer p-2 overflow-hidden"
          style={{ backgroundColor: standardColor }}
          onClick={handleLeftItemClick}
        >
          <div
            key={currentDisplay}
            className="animate-slideFadeLoop flex items-center gap-3 max-w-full overflow-hidden"
          >
            {liveInfoList.includes('vline') && (
              <img
                src={VLINE_LOGO_SRC}
                alt="V/Line"
                className="h-[1.8rem] w-auto shrink-0"
              />
            )}
            <Text className="inline-block max-w-full overflow-hidden text-ellipsis text-white text-[1.8rem] font-500 whitespace-nowrap">
              {currentDisplay}
            </Text>
          </div>
        </div>

        <div
          className="w-1/2 flex justify-center items-center p-2"
          style={{ backgroundColor: lightColor }}
        >
          <Text
            key={flipKey}
            className="animate-slideFadeLoop inline-block text-white text-[1.8rem] font-500 whitespace-nowrap"
          >
            {flipKey}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LiveInfoBar;
