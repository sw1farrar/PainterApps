export type Locale = "en" | "es";

export type Messages = {
  nav: {
    freeTools: string;
    signIn: string;
    getEarlyAccess: string;
    backToFreeTools: string;
    homeAria: string;
    menuTitle: string;
    openMenuAria: string;
    languageLabel: string;
  };
  home: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    joinWaitlist: string;
    seeWhatsComing: string;
    stats: {
      faster: string;
      closeRates: string;
      spreadsheets: string;
    };
  };
  freeTools: {
    title: string;
    subtitle: string;
    buildSellSheet: {
      name: string;
      description: string;
    };
  };
  sellSheet: {
    title: string;
    subtitle: string;
    companyName: string;
    projectName: string;
    tiersLegend: string;
    tierName: string;
    tierPrice: string;
    tierDetails: string;
    pricePlaceholder: string;
    preview: string;
    tierLabels: {
      good: string;
      better: string;
      best: string;
    };
  };
  language: {
    english: string;
    spanish: string;
    englishAria: string;
    spanishAria: string;
    groupLabel: string;
    switchToSpanish: string;
    switchToEnglish: string;
  };
};