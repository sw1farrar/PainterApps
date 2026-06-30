import type { Messages } from "@/i18n/types";

export const en: Messages = {
  nav: {
    freeTools: "Free Tools",
    signIn: "Sign in",
    getEarlyAccess: "Get early access",
    backToFreeTools: "← Free Tools",
    homeAria: "PainterApps home",
    menuTitle: "Menu",
    openMenuAria: "Open navigation menu",
    languageLabel: "Language",
  },
  auth: {
    signInTitle: "Sign in",
    signInDescription:
      "Access your PainterApps portal to manage quotes and jobs.",
    signIn: "Sign in",
    signingIn: "Signing you in",
    signingInHint: "Just a moment…",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password?",
    backToHome: "← Back to home",
    missingCredentials: "Enter your email and password.",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
  },
  home: {
    badge: "BUILT FOR PAINTERS",
    headline: "Win more jobs with",
    headlineAccent: "proposals that sell",
    subheadline:
      "PainterApps gives you the tools to quote faster, present good-better-best options, and look as professional as the finish you deliver — residential and commercial.",
    joinWaitlist: "Join the waitlist",
    seeWhatsComing: "See what's coming",
    languageNote:
      "PainterApps está optimizado para hispanohablantes y angloparlantes — cambia el idioma cuando quieras.",
    stats: {
      faster: "FASTER PROPOSALS",
      closeRates: "HIGHER CLOSE RATES",
      spreadsheets: "SPREADSHEET HEADACHES",
    },
    platform: {
      eyebrow: "Tools for Painters",
      title: "Start with sell sheets. Grow into everything.",
      body:
        "Close more jobs with Good·Better·Best sell sheets — free now. Quotes, customer portals, crews, schedules, billing, and books built for painters are on the way.",
      liveBadge: "Free today",
      soonBadge: "Up next",
      soonLabel: "Soon",
      roadmapTitle: "Your full painting business stack",
      roadmapFootnote:
        "Built in the order you run jobs — win, serve, produce, get paid.",
      exploreFreeTools: "Explore free tools",
      phases: {
        winJobs: "Win jobs",
        serveCustomers: "Serve customers",
        runCrews: "Run crews",
        getPaid: "Get paid",
      },
      sellSheet: {
        name: "Sell sheets",
        tagline: "Good · Better · Best — one page that sells",
        description: "Brand it, preview live, share a PDF. Free — no account required.",
        cta: "Build yours free",
        highlights: [
          "Close jobs faster",
          "Print-ready PDF",
          "Save when you sign in",
        ],
      },
      comingSoon: {
        quotes: {
          name: "Quotes",
          teaser: "Turn tiers into proposals",
        },
        customerPortals: {
          name: "Customer portals",
          teaser: "Approve, schedule, pay online",
        },
        crewSetup: {
          name: "Crews",
          teaser: "Assign leads and painters",
        },
        schedules: {
          name: "Schedules",
          teaser: "Align crews and weather",
        },
        billing: {
          name: "Billing",
          teaser: "Collect deposits and progress",
        },
        invoicing: {
          name: "Invoicing",
          teaser: "Polished invoices per job",
        },
        accounting: {
          name: "Accounting",
          teaser: "Job costing stays synced",
        },
      },
    },
  },
  freeTools: {
    title: "Free Tools",
    subtitle:
      "Professional-grade utilities for painters — starting free, growing fast.",
    liveBadge: "Live now",
    comingSoonBadge: "On the way",
    comingSoonTitle: "More tools are in the works",
    comingSoonBody:
      "We're building the next wave of free tools for estimators, color consultants, and crew leads. Sell sheets are just the beginning.",
    buildSellSheet: {
      name: "Build sell sheet",
      tagline: "Good · Better · Best — on one stunning page",
      description:
        "Turn package comparisons into polished marketing your clients actually understand. Brand it, tier it, preview it, and share a PDF that sells the job.",
      cta: "Start your sell sheet",
      featureTiers: "Good-better-best tier layouts",
      featurePdf: "Print-ready PDF export",
      featureBrand: "Your logo and company colors",
    },
    upcoming: {
      estimate: {
        name: "Quick estimate helper",
        teaser: "Ballpark room counts without opening a spreadsheet.",
      },
      color: {
        name: "Color visualizer",
        teaser: "Show swatches on trim, walls, and cabinets in seconds.",
      },
      scope: {
        name: "Scope checklist",
        teaser: "Walk the job site and capture prep notes that stick.",
      },
    },
  },
  sellSheet: {
    title: "Build sell sheet",
    subtitle:
      "Craft a one-page good-better-best comparison that sells the value — not the price.",
    brandingLegend: "Your brand",
    companyName: "Company name",
    projectName: "Project or client name",
    projectPlaceholder: "e.g. Smith Residence exterior repaint",
    logoUpload: "Company logo",
    logoHint: "PNG or JPG with a transparent background works best.",
    tiersLegend: "Package comparison",
    tiersHint:
      "Describe what makes each package different — paint brand, prep, warranty, and everything included.",
    tierDisplayName: "{tier} — package name",
    applicationType: "Interior or exterior",
    applicationTypeHint:
      "Applies to every package on this sell sheet — guides AI lookups and labels the comparison.",
    applicationInterior: "Interior",
    applicationExterior: "Exterior",
    applicationInteriorSystem: "Interior system",
    applicationExteriorSystem: "Exterior system",
    systemsGuide: "Systems guide",
    manufacturer: "{tier} — manufacturer",
    manufacturerPlaceholder: "e.g. Your paint manufacturer",
    paintType: "{tier} — paint type",
    paintTypePlaceholder: "e.g. Exterior acrylic latex",
    paintCanUpload: "{tier} — paint can photo",
    paintCanHint: "Upload a photo of the paint can for this package level.",
    findProductWithAi: "Find product with AI",
    aiLookupProgress: {
      title: "Finding your product",
      failedTitle: "Couldn't find product",
      complete: "Product ready",
      close: "Close",
      tryAgain: "Try again",
      steps: {
        searching: "Searching manufacturer's website",
        foundProduct: "Found matching product",
        downloadingImage: "Downloading product image",
        verifyingLabel: "Verifying paint can label",
        analyzingFeatures: "Pulling coating specs from product page",
        applying: "Applying to your package",
      },
      stepHints: {
        searching: "Checking the official manufacturer site",
        foundProduct: "Matched your paint line",
        analyzingFeatures: "Building your feature list to choose from",
        downloadingImage: "Loading the product photo",
        verifyingLabel: "Confirming it's a paint can — not a brochure",
        applying: "Finishing up your package",
      },
      errors: {
        headlines: {
          search: "Couldn't find that product online",
          download: "Found the product — couldn't load the image",
          verify: "Image didn't match the product label",
          analyze: "Found the product page — finishing setup",
          generic: "Something went wrong",
        },
        tips: {
          retry:
            "Try again — we'll pull the image directly from the manufacturer's product page.",
          specificName:
            "Use the exact product line name from the can label, e.g. \"Premium Exterior Acrylic\" or \"Interior Flat Latex\".",
          checkApplication:
            "Confirm Interior or Exterior matches the product you're selling.",
          uploadManual:
            "You can also upload a paint can photo manually below.",
        },
      },
    },
    paintSystem: "{tier} — paint features",
    paintSystemHint:
      "AI pulls a comprehensive list of coating specs from the manufacturer — pick the 2 you want on your sell sheet.",
    paintSystemPlaceholder: "e.g. Self-priming one-coat",
    paintSystemAdd: "Add feature",
    paintSystemEmptyHint:
      "Use AI above to find coating specs, then choose which 2 to display.",
    paintSystemHeading: "Paint Features",
    benefits: "{tier} — features and benefits",
    featureCatalogHint:
      "Choose up to {max} benefits per package so everything fits on one page. Higher tiers include lower-tier selections.",
    benefitsPageLimit: "{selected} of {max} benefits on your sell sheet",
    benefitsLimitReached:
      "Each package can include at most {max} benefits on one page.",
    benefitsInheritedNote:
      "{count} benefit(s) included from a lower package — clear them on that package to remove.",
    benefitsClearedInheritedToast:
      "Cleared this package. Benefits from lower packages are unchanged.",
    paintSystemPageLimit: "{selected} of {max} paint features",
    paintSystemLimitReached:
      "Each package can include at most {max} paint features on one page.",
    paintSystemOptionsLegend: "Coating features found",
    paintSystemOptionsHint:
      "{count} specs found — pick up to {max} for your sell sheet",
    paintSystemOptionsLimitReached:
      "Each package can store at most {max} coating features.",
    catalogLegend: "Catalog",
    featureInheritedHint: "Included from a lower package",
    customFeaturesLegend: "Custom items",
    benefitLibraryLegend: "Your benefit library",
    benefitLibraryHint:
      "Add your own benefits in the library manager, then check them here to include on this package.",
    manageCategory: "Manage",
    manageCategoryHint:
      "Use Manage to show hidden defaults or add your own items for this category.",
    includeInCatalog: "Hidden — check to include",
    libraryDuplicateItem: "That item is already in your library.",
    paintSystemLibraryLegend: "Your paint features library",
    paintSystemLibraryHint:
      "Save coating specs once and reuse them on any package. New items are added to the list above.",
    libraryEmptyHint:
      "Open the benefit library to add custom items organized by category.",
    signInForLibrary:
      "Sign in to save a reusable library for your company. Guests can still add items for this sheet only.",
    selectAll: "Select all",
    clearAll: "Clear all",
    addToLibrary: "Add to library",
    removeFromLibrary: "Remove from library",
    hideFromCatalog: "Hide from catalog",
    selectApplicationFirst:
      "Choose Interior or Exterior above to see the matching benefit catalog.",
    categoryFieldLabel: "Category",
    scopeFieldLabel: "Applies to",
    scopeLabels: {
      interior: "Interior",
      exterior: "Exterior",
      both: "Interior & exterior",
    },
    packageOnlyFeaturesLegend: "On this package only",
    featureCategories: {
      prep: "Surface prep",
      paint: "Application & scope",
      warranty: "Warranties",
      maintenance: "Maintenance & cleaning",
      service: "Service & extras",
    },
    featurePlaceholder: "e.g. Stucco repair included",
    addFeature: "Add",
    featuresEmptyHint: "Add any custom line items not listed above.",
    editSelection: "Edit",
    done: "Done",
    selectedCount: "{count} selected",
    moreItems: "+{count} more",
    benefitsHeading: "Features and Benefits",
    warrantyLegend: "{tier} — warranty",
    warrantyPeriod: "Warranty period",
    warrantyPeriodPlaceholder: "e.g. 5, 7, or 10",
    warrantyPeriodHint:
      "Shown large on your sell sheet — pick the workmanship warranty for this package.",
    warrantyLengthNone: "None",
    warrantyCoverage: "Coverage details",
    warrantyCoveragePlaceholder: "e.g. Workmanship warranty on all surfaces",
    warrantyHeading: "Warranty",
    preview: "Preview sell sheet",
    previewHint: "Preview your one-page comparison on the web or as a PDF.",
    save: "Save sell sheet",
    saveModal: {
      title: "Save your sell sheet",
      subtitle:
        "Create a free account or sign in to save this sell sheet to your PainterApps account.",
      fullName: "Your name",
      companyName: "Company name",
      email: "Email address",
      phone: "Phone number",
      password: "Password",
      passwordHint: "At least 8 characters — you'll use this to sign in later.",
      save: "Save sell sheet",
      saving: "Saving…",
      cancel: "Cancel",
      signInInstead: "Sign in instead",
      createFreeAccount: "Create free account",
      loggedInTitle: "Save to your account",
      loggedInSubtitle:
        "Save this sell sheet to your PainterApps account. You can edit it anytime.",
      saved: "Sell sheet saved.",
    },
    backToEdit: "Back to edit",
    webPreview: "Web preview",
    pdfPreview: "PDF preview",
    pdfPreviewTitle: "PDF preview",
    pdfLoading: "Generating PDF…",
    downloadPdf: "Download PDF",
    validation: {
      companyRequired: "Enter your company name before previewing.",
      editRequiresSignIn:
        "Sign in to open this saved sell sheet. Your current draft is still available below.",
    },
    languageHint:
      "Sell sheet labels, preview, and PDF follow your language choice — English or Español.",
    preparedByFooter: "Prepared by {company}",
    defaultCompanyName: "Your Company",
    tierLabels: {
      good: "Good",
      better: "Better",
      best: "Best",
    },
  },
  language: {
    english: "English",
    spanish: "Español",
    englishAria: "English",
    spanishAria: "Español",
    groupLabel: "Select language",
    switchToSpanish: "Switch to Spanish",
    switchToEnglish: "Switch to English",
  },
};