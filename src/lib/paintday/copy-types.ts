export type NavCopy = {
  home: string;
  systems: string;
  news: string;
  calc: string;
  app: string;
  login: string;
  signup: string;
  signOut: string;
  language: string;
  theme: string;
  menu: string;
  primary: string;
  skip: string;
};

export type ZipSearchCopy = {
  searchLabel: string;
  searchPlaceholder: string;
  searchCta: string;
  invalidZip: string;
};

export type HomeMapCopy = {
  mapToday: string;
  mapTomorrow: string;
  mapHeading: string;
  mapPrevDay: string;
  mapNextDay: string;
  close: string;
  loadingForecast: string;
  forecastMiss: string;
  zip: ZipSearchCopy;
  summaries: Record<string, string>;
};
