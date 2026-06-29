const YARRAWONGA_VENUE_ID = "ts_yarrawonga_visitor_centre";

const YARRAWONGA_LABEL_MAP = {
  "Attractions & Tours": "See & Do",
  "Attractions and Tours": "See & Do",
  Dining: "Wine & Dine",
};

export function getVenueDisplayName(name, venueId) {
  if (venueId !== YARRAWONGA_VENUE_ID || typeof name !== "string") {
    return name;
  }

  return YARRAWONGA_LABEL_MAP[name] || name;
}
