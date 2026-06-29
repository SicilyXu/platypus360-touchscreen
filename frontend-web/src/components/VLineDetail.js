import React, { useContext, useMemo } from 'react';
import { Bus, Clock3, Route, Train, X } from 'lucide-react';
import AppContext from '../context/AppContext';
import { adjustLightness } from '../utils/colorCalculator';

const VLineInfoCard = ({ title, rows }) => (
  <div className="flex-1 bg-white bg-opacity-10 shadow-md rounded-md p-[1.5rem]">
    <h2 className="text-[1.6rem] font-bold text-white mb-[1rem] text-center">{title}</h2>
    <div className="space-y-[0.8rem] text-white text-[1.2rem]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-[1rem] px-[1rem] py-[0.75rem] rounded bg-white bg-opacity-10"
        >
          <span className="font-semibold">{row.label}</span>
          <span className="text-right">{row.value || '-'}</span>
        </div>
      ))}
    </div>
  </div>
);

const getServiceIcon = (serviceType = '') => {
  if (serviceType.toLowerCase().includes('train')) return <Train size={20} />;
  return <Bus size={20} />;
};

const getServiceKey = (service = {}) =>
  `${service.serviceType || ''}-${service.from || ''}-${service.to || ''}-${service.departureTime || ''}`;

function extractDestination(toStr) {
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
}

const getDisplayFrom = (fromStr) => (fromStr?.includes('Departure time') ? '' : fromStr || '');

const getVenueOriginName = (name) => {
  if (!name) return '';
  return String(name)
    .replace(/\s*Visitor Information Centre\s*/i, '')
    .replace(/\s*Visitor Information\s*/i, '')
    .replace(/\s*Visitor Centre\s*/i, '')
    .trim();
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

const VLineDetailPage = ({ selectedService, onBack, onServiceClick }) => {
  const { venueBasicInfo, vlineData } = useContext(AppContext);

  const standardColor = venueBasicInfo?.theme?.standard || '#234B92';
  const bgColor = adjustLightness(standardColor, -0.1);

  const upcomingServices = useMemo(() => {
    if (!Array.isArray(vlineData)) return [];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return vlineData.filter((service) => {
      const departureMinutes = timeStringToMinutes(service?.departureTime);
      return (
        getServiceKey(service) !== getServiceKey(selectedService) &&
        departureMinutes != null &&
        departureMinutes > currentMinutes
      );
    });
  }, [selectedService, vlineData]);

  if (!selectedService) return null;

  const detailFallbackFrom = venueBasicInfo?.name
    ? getVenueOriginName(venueBasicInfo.name)
    : 'Origin';
  const selectedFrom = getDisplayFrom(selectedService.from) || detailFallbackFrom;
  const selectedTo = extractDestination(selectedService.to);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const selectedDepartureMinutes = timeStringToMinutes(selectedService?.departureTime);
  const selectedServiceIsUpcoming = selectedDepartureMinutes != null && selectedDepartureMinutes > currentMinutes;

  if (!selectedServiceIsUpcoming && upcomingServices.length === 0) {
    return (
      <div
        className="w-full h-full text-white px-[2rem] py-[3rem] overflow-y-auto flex flex-col items-center"
        style={{ background: `linear-gradient(to bottom, ${standardColor}, ${bgColor})` }}
      >
        <div className="w-full max-w-[64rem] flex items-center justify-between">
          <button onClick={onBack} className="text-white" aria-label="Close">
            <X size={28} />
          </button>
          <div className="flex flex-col items-center text-center flex-1">
            <h1 className="text-[1.9rem] font-bold">V/Line Timetable</h1>
          </div>
          <div className="w-[28px]" />
        </div>
        <div className="w-full bg-white bg-opacity-10 p-[2rem] shadow-md rounded-md mt-[2rem]">
          <p className="text-white text-opacity-80 text-center text-[1.3rem]">No more services today</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full text-white px-[2rem] py-[3rem] overflow-y-auto flex flex-col items-center"
      style={{ background: `linear-gradient(to bottom, ${standardColor}, ${bgColor})` }}
    >
      <div className="w-full max-w-[64rem] flex items-center justify-between">
        <button onClick={onBack} className="text-white" aria-label="Close">
          <X size={28} />
        </button>
        <div className="flex flex-col items-center text-center flex-1">
          <h1 className="text-[1.9rem] font-bold">V/Line Timetable</h1>
          <p className="text-[1.5rem] opacity-80">
            {selectedFrom} -> {selectedTo}
          </p>
        </div>
        <div className="w-[28px]" />
      </div>

      <div className="w-full bg-white bg-opacity-10 p-[2rem] shadow-md rounded-md mt-[1rem]">
        <div className="flex flex-row gap-[1rem]">
          <VLineInfoCard
            title="Service"
            rows={[
              { label: 'Type', value: selectedService.serviceType },
              { label: 'From', value: selectedFrom },
              { label: 'To', value: selectedTo },
              { label: 'Status', value: selectedService.status },
            ]}
          />
          <VLineInfoCard
            title="Timing"
            rows={[
              { label: 'Departs', value: selectedService.departureTime },
              { label: 'Arrival', value: selectedService.arrivalTime },
              { label: 'Connection', value: selectedService.connection },
              { label: 'Note', value: selectedService.note },
            ]}
          />
        </div>
      </div>

      <div className="w-full mt-[2rem]">
        <h2 className="text-[1.8rem] font-bold mb-[1.5rem] text-center text-white">Upcoming Services</h2>
        <div className="bg-white bg-opacity-10 shadow-md rounded-md p-[1.5rem]">
          {upcomingServices.length === 0 ? (
            <p className="text-white text-opacity-60">No more services today</p>
          ) : (
            <ul className="space-y-[0.8rem] text-white pl-0">
              {upcomingServices.map((service) => (
                <li
                  key={getServiceKey(service)}
                  onClick={() => onServiceClick?.(service)}
                  className="cursor-pointer flex items-center gap-[0.75rem] px-[1rem] py-[0.8rem] rounded bg-white bg-opacity-10 text-[1.3rem] font-medium hover:bg-opacity-20 active:scale-[0.98] transition-all duration-200"
                >
                  {getServiceIcon(service.serviceType)}
                  <span className="flex-1">
                    {getDisplayFrom(service.from)} -> {extractDestination(service.to)}
                  </span>
                  <span className="flex items-center gap-[0.35rem]">
                    <Clock3 size={18} />
                    {service.departureTime}
                  </span>
                  <span className="flex items-center gap-[0.35rem]">
                    <Route size={18} />
                    {service.connection || '-'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VLineDetailPage;
