import type { Messages } from "@/i18n/types";

export const es: Messages = {
  nav: {
    freeTools: "Herramientas gratis",
    signIn: "Iniciar sesión",
    getEarlyAccess: "Solicitar acceso anticipado",
    backToFreeTools: "← Herramientas gratis",
    homeAria: "Inicio de PainterApps",
    menuTitle: "Menú",
    openMenuAria: "Abrir menú de navegación",
    languageLabel: "Idioma",
  },
  auth: {
    signInTitle: "Iniciar sesión",
    signInDescription:
      "Accede a tu portal de PainterApps para gestionar cotizaciones y trabajos.",
    signIn: "Iniciar sesión",
    signingIn: "Iniciando sesión",
    signingInHint: "Un momento…",
    email: "Correo electrónico",
    password: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    backToHome: "← Volver al inicio",
    missingCredentials: "Introduce tu correo y contraseña.",
    noAccount: "¿No tienes cuenta?",
    createAccount: "Crear cuenta",
  },
  home: {
    badge: "HECHO PARA PINTORES",
    headline: "Gana más trabajos con",
    headlineAccent: "propuestas que venden",
    subheadline:
      "PainterApps te da las herramientas para cotizar más rápido, presentar opciones bueno-mejor-óptimo y proyectar la misma profesionalidad que el acabado que entregas — en proyectos residenciales y comerciales.",
    joinWaitlist: "Unirme a la lista de espera",
    seeWhatsComing: "Ver las novedades",
    languageNote:
      "PainterApps is built for English and Spanish speakers — switch language anytime.",
    stats: {
      faster: "PROPUESTAS MÁS RÁPIDAS",
      closeRates: "MAYOR TASA DE CIERRE",
      spreadsheets: "PROBLEMAS CON EXCEL",
    },
    platform: {
      eyebrow: "Herramientas para pintores",
      title: "Empieza con hojas comparativas. Crece con todo.",
      body:
        "Cierra más trabajos con hojas Bueno·Mejor·Óptimo — gratis hoy. Cotizaciones, portales, cuadrillas, calendarios, cobros y contabilidad hechos para pintores vienen en camino.",
      liveBadge: "Gratis hoy",
      soonBadge: "Siguiente",
      soonLabel: "Pronto",
      roadmapTitle: "Todo tu negocio de pintura",
      roadmapFootnote:
        "En el orden real de tu trabajo — ganar, atender, producir, cobrar.",
      exploreFreeTools: "Explorar herramientas gratis",
      phases: {
        winJobs: "Gana trabajos",
        serveCustomers: "Atiende clientes",
        runCrews: "Dirige cuadrillas",
        getPaid: "Cobra y organiza",
      },
      sellSheet: {
        name: "Hojas comparativas",
        tagline: "Bueno · Mejor · Óptimo — una página que vende",
        description: "Tu marca, vista previa y PDF. Gratis — sin cuenta.",
        cta: "Crea la tuya gratis",
        highlights: [
          "Cierra trabajos más rápido",
          "PDF listo para imprimir",
          "Guarda al iniciar sesión",
        ],
      },
      comingSoon: {
        quotes: {
          name: "Cotizaciones",
          teaser: "De paquetes a propuestas",
        },
        customerPortals: {
          name: "Portales de clientes",
          teaser: "Aprueban, agendan, pagan",
        },
        crewSetup: {
          name: "Cuadrillas",
          teaser: "Roles claros por trabajo",
        },
        schedules: {
          name: "Calendarios",
          teaser: "Producción y clima alineados",
        },
        billing: {
          name: "Cobros",
          teaser: "Anticipos sin perseguir cheques",
        },
        invoicing: {
          name: "Facturas",
          teaser: "Facturas pulidas por trabajo",
        },
        accounting: {
          name: "Contabilidad",
          teaser: "Costos sincronizados al campo",
        },
      },
    },
  },
  freeTools: {
    title: "Herramientas gratis",
    subtitle:
      "Utilidades profesionales para pintores — gratis al inicio, en crecimiento.",
    liveBadge: "Disponible ahora",
    comingSoonBadge: "En camino",
    comingSoonTitle: "Más herramientas en desarrollo",
    comingSoonBody:
      "Estamos construyendo la próxima ola de herramientas gratis para estimadores, consultores de color y jefes de cuadrilla. Las hojas comparativas son solo el comienzo.",
    buildSellSheet: {
      name: "Crear hoja comparativa",
      tagline: "Bueno · Mejor · Óptimo — en una página impresionante",
      description:
        "Convierte comparaciones de paquetes en marketing pulido que tus clientes entienden. Pon tu marca, define niveles, previsualiza y comparte un PDF que vende el trabajo.",
      cta: "Empezar tu hoja comparativa",
      featureTiers: "Diseños bueno-mejor-óptimo",
      featurePdf: "Exportación PDF lista para imprimir",
      featureBrand: "Tu logo y colores de empresa",
    },
    upcoming: {
      estimate: {
        name: "Ayudante de estimación rápida",
        teaser: "Cuenta habitaciones sin abrir una hoja de cálculo.",
      },
      color: {
        name: "Visualizador de color",
        teaser: "Muestra muestras en molduras, paredes y gabinetes en segundos.",
      },
      scope: {
        name: "Lista de alcance",
        teaser: "Recorre el sitio y captura notas de preparación que perduran.",
      },
    },
  },
  sellSheet: {
    title: "Crear hoja comparativa",
    subtitle:
      "Arma una comparación de una página que vende el valor — no el precio.",
    brandingLegend: "Tu marca",
    companyName: "Nombre de la empresa",
    projectName: "Proyecto o cliente",
    projectPlaceholder: "ej. Repintado exterior residencia Smith",
    logoUpload: "Logo de la empresa",
    logoHint: "PNG o JPG con fondo transparente funciona mejor.",
    tiersLegend: "Comparación de paquetes",
    tiersHint:
      "Describe qué hace diferente cada paquete: marca de pintura, preparación, garantía y todo lo incluido.",
    tierDisplayName: "{tier} — nombre del paquete",
    applicationType: "Interior o exterior",
    applicationTypeHint:
      "Aplica a todos los paquetes de esta hoja — guía la IA y etiqueta la comparación.",
    applicationInterior: "Interior",
    applicationExterior: "Exterior",
    applicationInteriorSystem: "Sistema interior",
    applicationExteriorSystem: "Sistema exterior",
    systemsGuide: "Guía de sistemas",
    manufacturer: "{tier} — fabricante",
    manufacturerPlaceholder: "ej. Sherwin-Williams",
    paintType: "{tier} — tipo de pintura",
    paintTypePlaceholder: "ej. Duration Exterior Acrylic Latex",
    paintCanUpload: "{tier} — foto del bote",
    paintCanHint: "Sube una foto del bote de pintura para este nivel.",
    findProductWithAi: "Buscar producto con IA",
    aiLookupProgress: {
      title: "Buscando tu producto",
      failedTitle: "No se encontró el producto",
      complete: "Producto listo",
      close: "Cerrar",
      tryAgain: "Intentar de nuevo",
      steps: {
        searching: "Buscando en el sitio del fabricante",
        foundProduct: "Producto coincidente encontrado",
        downloadingImage: "Descargando imagen del producto",
        verifyingLabel: "Verificando etiqueta del bote",
        analyzingFeatures: "Obteniendo especificaciones del recubrimiento",
        applying: "Aplicando a tu paquete",
      },
      stepHints: {
        searching: "Revisando el sitio oficial del fabricante",
        foundProduct: "Coincidió con tu línea de pintura",
        analyzingFeatures: "Armando tu lista de características",
        downloadingImage: "Cargando la foto del producto",
        verifyingLabel: "Confirmando que es un bote — no un folleto",
        applying: "Finalizando tu paquete",
      },
      errors: {
        headlines: {
          search: "No encontramos ese producto en línea",
          download: "Encontramos el producto — no pudimos cargar la imagen",
          verify: "La imagen no coincide con la etiqueta del producto",
          analyze: "No pudimos confirmar los detalles del producto",
          generic: "Algo salió mal",
        },
        tips: {
          retry:
            "Intenta de nuevo — obtendremos la imagen directamente de la página del fabricante.",
          specificName:
            "Usa el nombre de la línea del bote, ej. \"Emerald Rain Refresh\" o \"SuperPaint Interior Acrylic Latex\".",
          checkApplication:
            "Confirma que Interior o Exterior coincide con el producto que vendes.",
          uploadManual:
            "También puedes subir una foto del bote manualmente abajo.",
        },
      },
    },
    paintSystem: "{tier} — características de pintura",
    paintSystemHint:
      "La IA obtiene una lista completa de especificaciones del fabricante — elige las 2 para tu hoja.",
    paintSystemPlaceholder: "ej. Autoprimerizante una capa",
    paintSystemAdd: "Agregar característica",
    paintSystemEmptyHint:
      "Usa la IA arriba para encontrar especificaciones y luego elige cuáles 2 mostrar.",
    paintSystemHeading: "Características de pintura",
    benefits: "{tier} — características y beneficios",
    featureCatalogHint:
      "Elige hasta {max} beneficios por paquete para que todo quepa en una página. Los niveles superiores incluyen los de niveles inferiores.",
    benefitsPageLimit: "{selected} de {max} beneficios en tu hoja",
    benefitsLimitReached:
      "Cada paquete puede incluir como máximo {max} beneficios en una página.",
    benefitsInheritedNote:
      "{count} beneficio(s) incluidos desde un paquete inferior — quítalos en ese paquete para eliminarlos.",
    benefitsClearedInheritedToast:
      "Paquete limpiado. Los beneficios de paquetes inferiores no cambiaron.",
    paintSystemPageLimit: "{selected} de {max} características de pintura",
    paintSystemLimitReached:
      "Cada paquete puede incluir como máximo {max} características de pintura en una página.",
    paintSystemOptionsLegend: "Características del recubrimiento encontradas",
    paintSystemOptionsHint:
      "{count} especificaciones encontradas — elige hasta {max} para tu hoja",
    paintSystemOptionsLimitReached:
      "Cada paquete puede almacenar como máximo {max} características del recubrimiento.",
    catalogLegend: "Catálogo",
    featureInheritedHint: "Incluido desde un paquete inferior",
    customFeaturesLegend: "Elementos personalizados",
    benefitLibraryLegend: "Tu biblioteca de beneficios",
    benefitLibraryHint:
      "Agrega tus propios beneficios en el administrador de biblioteca, luego márcalos aquí para incluirlos en este paquete.",
    manageCategory: "Administrar",
    manageCategoryHint:
      "Usa Administrar para mostrar elementos ocultos o agregar los tuyos en esta categoría.",
    includeInCatalog: "Oculto — marca para incluir",
    libraryDuplicateItem: "Ese elemento ya está en tu biblioteca.",
    paintSystemLibraryLegend: "Tu biblioteca de características de pintura",
    paintSystemLibraryHint:
      "Guarda especificaciones una vez y reutilízalas en cualquier paquete. Los nuevos elementos se agregan a la lista de arriba.",
    libraryEmptyHint:
      "Abre la biblioteca de beneficios para agregar elementos personalizados por categoría.",
    signInForLibrary:
      "Inicia sesión para guardar una biblioteca reutilizable para tu empresa. Los invitados aún pueden agregar elementos solo para esta hoja.",
    selectAll: "Seleccionar todo",
    clearAll: "Limpiar todo",
    addToLibrary: "Agregar a biblioteca",
    removeFromLibrary: "Quitar de biblioteca",
    hideFromCatalog: "Ocultar del catálogo",
    selectApplicationFirst:
      "Elige Interior o Exterior arriba para ver el catálogo de beneficios correspondiente.",
    categoryFieldLabel: "Categoría",
    scopeFieldLabel: "Aplica a",
    scopeLabels: {
      interior: "Interior",
      exterior: "Exterior",
      both: "Interior y exterior",
    },
    packageOnlyFeaturesLegend: "Solo en este paquete",
    featureCategories: {
      prep: "Preparación de superficies",
      paint: "Aplicación y alcance",
      warranty: "Garantías",
      maintenance: "Mantenimiento y limpieza",
      service: "Servicio y extras",
    },
    featurePlaceholder: "ej. Reparación de estuco incluida",
    addFeature: "Agregar",
    featuresEmptyHint:
      "Agrega elementos personalizados que no estén en la lista.",
    editSelection: "Editar",
    done: "Listo",
    selectedCount: "{count} seleccionados",
    moreItems: "+{count} más",
    benefitsHeading: "Características y beneficios",
    warrantyLegend: "{tier} — garantía",
    warrantyPeriod: "Período de garantía",
    warrantyPeriodPlaceholder: "ej. 5, 7 o 10",
    warrantyPeriodHint:
      "Se muestra en grande en tu hoja — elige la garantía de mano de obra para este paquete.",
    warrantyLengthNone: "Ninguna",
    warrantyCoverage: "Detalles de cobertura",
    warrantyCoveragePlaceholder:
      "ej. Garantía de mano de obra en todas las superficies",
    warrantyHeading: "Garantía",
    preview: "Vista previa de la hoja",
    previewHint:
      "Previsualiza tu comparación de una página en la web o como PDF.",
    save: "Guardar hoja",
    saveModal: {
      title: "Guardar tu hoja de venta",
      subtitle:
        "Crea una cuenta gratuita o inicia sesión para guardar esta hoja en tu cuenta de PainterApps.",
      fullName: "Tu nombre",
      companyName: "Nombre de la empresa",
      email: "Correo electrónico",
      phone: "Teléfono",
      password: "Contraseña",
      passwordHint:
        "Mínimo 8 caracteres — la usarás para iniciar sesión después.",
      save: "Guardar hoja",
      saving: "Guardando…",
      cancel: "Cancelar",
      signInInstead: "Iniciar sesión",
      createFreeAccount: "Crear cuenta gratis",
      loggedInTitle: "Guardar en tu cuenta",
      loggedInSubtitle:
        "Guarda esta hoja en tu cuenta de PainterApps. Puedes editarla cuando quieras.",
      saved: "Hoja de venta guardada.",
    },
    backToEdit: "Volver a editar",
    webPreview: "Vista web",
    pdfPreview: "Vista PDF",
    pdfPreviewTitle: "Vista previa PDF",
    pdfLoading: "Generando PDF…",
    downloadPdf: "Descargar PDF",
    validation: {
      companyRequired: "Ingresa el nombre de tu empresa antes de previsualizar.",
      editRequiresSignIn:
        "Inicia sesión para abrir esta hoja guardada. Tu borrador actual sigue disponible abajo.",
    },
    languageHint:
      "Las etiquetas, la vista previa y el PDF de la hoja siguen tu idioma — English o Español.",
    preparedByFooter: "Preparado por {company}",
    defaultCompanyName: "Tu empresa",
    tierLabels: {
      good: "Bueno",
      better: "Mejor",
      best: "Óptimo",
    },
  },
  language: {
    english: "English",
    spanish: "Español",
    englishAria: "English",
    spanishAria: "Español",
    groupLabel: "Seleccionar idioma",
    switchToSpanish: "Cambiar a español",
    switchToEnglish: "Cambiar a inglés",
  },
};