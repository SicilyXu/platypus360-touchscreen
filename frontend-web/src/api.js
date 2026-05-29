const BASE_URL = 'https://apis.platypus360.com';


export function getVenueBasicInfo(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/basic-info`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueContentTree(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/ts-content-tree`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueAdvs(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/ads`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getVenueVideos(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/videos`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getFlights(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/flights`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getNews(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/news`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getWeather(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/weather`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}

export function getTides(venueId) {
  return fetch(`${BASE_URL}/ts/${venueId}/live-info/tides`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    });
}
