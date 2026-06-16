import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../context/AppContext';
import { Typography } from 'antd';
import { adjustLightness } from '../utils/colorCalculator';
import '../App.css';

const { Text } = Typography;

const formatVLineDisplay = (service) => {
  if (!service) return 'No V/Line timetable available';
  return `V/Line: ${service.from || '-'} → ${service.to || '-'} ${service.departureTime || '--:--'}`;
};

const LiveInfoBar = (props) => {
  const { flightsData, weatherData, venueBasicInfo, tidesData, vlineData } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const lightColor = adjustLightness(standardColor, 0.35);
  const rawLiveInfo = venueBasicInfo?.landing?.liveInfo;
  const liveInfoList = Array.isArray(rawLiveInfo)
    ? rawLiveInfo.map(s => s.toLowerCase())
    : (rawLiveInfo ? [rawLiveInfo.toLowerCase()] : ['flight']);

  const [dateTime, setDateTime] = useState('');
  const [formattedWeather, setFormattedWeather] = useState([]);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('dateTime');
  const [currentDisplay, setCurrentDisplay] = useState('');

  // 更新时间
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

  // 轮播时间 / 天气
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

  // 格式化天气
  useEffect(() => {
    if (!weatherData?.length) {
      setFormattedWeather([]);
      return;
    }
    const result = weatherData.map(item => {
      const date = new Date(item.date);
      const formattedDate = `${date.getDate()}-${date.toLocaleString('default', { month: 'short' })}`;
      const brief = item.condition?.text?.split(' ').slice(0, 2).join(' ') || '';
      const temp = `${item.mintemp_c}℃-${item.maxtemp_c}℃`;
      return `${formattedDate} ${brief} ${temp}`;
    });
    setFormattedWeather(result);
  }, [weatherData]);

  // 切换航班 / 潮汐显示
  useEffect(() => {
    if (liveInfoList.includes('flight')) {
      if (!flightsData?.length) {
        setCurrentDisplay('No flight information available');
        return;
      }

      let flightIndex = 0;
      const updateFlight = () => {
        const flight = flightsData[flightIndex];
        if (!flight?.departure?.estimated) {
          setCurrentDisplay('Invalid flight data');
          return;
        }
        const timePart = flight.departure.estimated.split('T')[1]?.slice(0, 5) || '00:00';
        let [h, m] = timePart.split(':').map(Number);
        h = (h + 10) % 24;
        setCurrentDisplay(`${flight.flight.iata}: ${flight.departure.iata}→${flight.arrival.iata} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        flightIndex = (flightIndex + 1) % flightsData.length;
      };

      updateFlight();
      const id = setInterval(updateFlight, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('tide')) {
      // console.log('Tides Data:', tidesData);
      const rawTideData = tidesData || [];

      // 展平结构
      const flatTides = rawTideData.flatMap(item =>
        item.tides.map(tide => ({
          date: item.date,
          ...tide
        }))
      );

      if (!flatTides.length) {
        setCurrentDisplay('No tide information available');
        return;
      }
      // console.log('Flat Tides:', flatTides);

      let tideIndex = 0;
      const updateTide = () => {
        const tide = flatTides[tideIndex];
        const display = `${tide.date} ${tide.type}: ${tide.time} ${tide.height}`;
        setCurrentDisplay(display);
        tideIndex = (tideIndex + 1) % flatTides.length;
      };

      updateTide();
      const id = setInterval(updateTide, 5000);
      return () => clearInterval(id);
    }

    if (liveInfoList.includes('vline')) {
      if (!vlineData?.length) {
        setCurrentDisplay('No V/Line timetable available');
        return;
      }

      let serviceIndex = 0;
      const updateVLine = () => {
        const service = vlineData[serviceIndex];
        setCurrentDisplay(formatVLineDisplay(service));
        serviceIndex = (serviceIndex + 1) % vlineData.length;
      };

      updateVLine();
      const id = setInterval(updateVLine, 5000);
      return () => clearInterval(id);
    }
  }, [flightsData, props.tidesData, liveInfoList, tidesData, vlineData]);

  const flipKey = currentTimeDisplay === 'dateTime'
    ? dateTime
    : formattedWeather[currentTimeDisplay] || 'No weather information available';
useEffect(() => {
  // console.log("🌊 currentDisplay:", currentDisplay);
}, [currentDisplay]);

  return (
    <div className="flex flex-col text-white">
      <div className="flex h-[26%]">
        {/* 左侧：航班 or 潮汐 */}
        <div
          className="w-1/2 flex justify-center items-center cursor-pointer p-2"
          style={{ backgroundColor: standardColor }}
          onClick={() => {
           

            if (liveInfoList.includes('flight')) {
              const match = flightsData.find((f) => {
                const timePart = f?.departure?.estimated?.split('T')[1]?.slice(0, 5);
                if (!timePart) return false;
                let [h, m] = timePart.split(':').map(Number);
                h = (h + 10) % 24;
                const display = `${f.flight.iata}: ${f.departure.iata}→${f.arrival.iata} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                return display === currentDisplay;
              });

              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }

            if (liveInfoList.includes('tide')) {
              const rawTideData = props.tidesData || [];

              // 展平 tide 数据并附上日期
              const flatTides = rawTideData.flatMap((item) =>
                item.tides.map((t) => ({
                  ...t,
                  date: item.date,
                }))
              );

              // 构造匹配字符串
              const match = flatTides.find((t) => {
                const display = `${t.date} ${t.type}: ${t.time} ${t.height}`;
                return display === currentDisplay;
              });

              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }

            if (liveInfoList.includes('vline')) {
              const match = vlineData.find((service) => formatVLineDisplay(service) === currentDisplay);
              if (match && typeof props.onLeftItemClick === 'function') {
                props.onLeftItemClick(match);
              }
            }
          }}

        >
          <Text
            key={currentDisplay}
            className="animate-slideFadeLoop inline-block text-white text-[1.8rem] font-500 whitespace-nowrap"
          >
            {currentDisplay}
          </Text>
        </div>

        {/* 右侧：时间 / 天气 */}
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
