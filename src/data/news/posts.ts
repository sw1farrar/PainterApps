import type { NewsPost } from "@/lib/news/types";

/** File-based posts. Live until you publish the same slug from /app/news. */
export const SEED_NEWS: NewsPost[] = [
  {
    id: "seed-tds-revision",
    slug: "always-check-the-tds-revision-date",
    category: "specs",
    published: true,
    publishedAt: "2026-09-08T14:00:00.000Z",
    title: {
      en: "Always check the TDS revision date before you specify",
      es: "Siempre revise la fecha de revisión de la TDS antes de especificar",
    },
    excerpt: {
      en: "A system is only as current as the sheet you cited. Here’s the 30-second habit that keeps a spec honest.",
      es: "Un sistema solo es vigente si la ficha que citó lo es. El hábito de 30 segundos que mantiene honesta una especificación.",
    },
    body: {
      en: `Manufacturer technical data sheets move. VOC limits, spread rates, and recoat windows get revised without a press release.

## The habit

- Pull the live TDS from the manufacturer, not a PDF you saved last spring.
- Record **product name + revision + date + URL** on the job file.
- If the sheet is older than 18 months, look again before you bid.

PainterApps cites the revision that was in our corpus when we published the match. You still verify the current sheet and local codes. That is not fine print — it is the job.`,
      es: `Las fichas técnicas se mueven. Los límites de VOC, el rendimiento y las ventanas de repintado se revisan sin comunicado de prensa.

## El hábito

- Baje la TDS vigente del fabricante, no el PDF que guardó en primavera.
- Anote **nombre de producto + revisión + fecha + URL** en la ficha del trabajo.
- Si la hoja tiene más de 18 meses, vuelva a mirarla antes de cotizar.

PainterApps cita la revisión que estaba en nuestro corpus al publicar el match. Usted sigue verificando la ficha vigente y los códigos locales. Eso no es letra chica — es el trabajo.`,
    },
    origin: "seed",
  },
  {
    id: "seed-humidity-window",
    slug: "humidity-is-the-crew-day-you-did-not-plan",
    category: "weather",
    published: true,
    publishedAt: "2026-09-04T15:30:00.000Z",
    title: {
      en: "Humidity is the crew day you did not plan",
      es: "La humedad es el día de cuadrilla que no planeó",
    },
    excerpt: {
      en: "Rain gets the blame. High RH and a tight dew-point spread wreck more latex film in September.",
      es: "La lluvia se lleva la culpa. La HR alta y un punto de rocío pegado echan a perder más película de látex en septiembre.",
    },
    body: {
      en: `A 10% shower chance with 88% humidity is not a good exterior day. The coat may go on. It will not cure the way the TDS wrote it.

Watch three numbers together:

- **Precipitation** in the next 24 hours
- **Relative humidity** at application time (roughly 40–70% is the comfortable band for architectural latex)
- **Dew-point spread** — if the air is within about 5°F of dew point, expect condensation on the wall

PaintDay weights those factors on purpose. If the score is in the 50s, read the factor cards before you roll a truck.`,
      es: `Un 10 % de chubascos con 88 % de humedad no es un buen día de exterior. La mano puede entrar. No va a curar como lo escribió la TDS.

Mire tres números juntos:

- **Precipitación** en las próximas 24 horas
- **Humedad relativa** a la hora de aplicar (más o menos 40–70 % es la banda cómoda para látex arquitectónico)
- **Separación del punto de rocío** — si el aire está a unos 5 °F del rocío, espere condensación en el muro

PaintDay pondera esos factores a propósito. Si el puntaje anda en los 50, lea las tarjetas antes de mover la camioneta.`,
    },
    origin: "seed",
  },
  {
    id: "seed-lead-safe",
    slug: "pre-1978-still-means-lead-safe",
    category: "regulation",
    published: true,
    publishedAt: "2026-08-26T16:00:00.000Z",
    title: {
      en: "Pre-1978 still means lead-safe — even on a “simple repaint”",
      es: "Antes de 1978 sigue siendo trabajo con plomo — aunque sea un “repintado sencillo”",
    },
    excerpt: {
      en: "A previously painted house is not a free pass. Confirm the year, the rule, and who is certified before you scrape.",
      es: "Una casa ya pintada no es carta blanca. Confirme el año, la norma y quién está certificado antes de raspar.",
    },
    body: {
      en: `If the building went up before 1978, assume lead until a test says otherwise. That is EPA RRP territory for most residential work in the United States, plus whatever your state stacked on top.

A “simple” exterior scrape is still disturbance. Containment, cleaning, and a certified renovator are not optional extras you add when the homeowner looks nervous.

We are not a law firm. Read the current EPA RRP rule and your state program before you price the job. Then write the assumption into the proposal so nobody “discovers” it on day two.`,
      es: `Si el edificio es de antes de 1978, asuma plomo hasta que una prueba diga lo contrario. En la mayoría de trabajos residenciales en Estados Unidos eso es territorio EPA RRP, más lo que haya puesto su estado encima.

Un raspado “sencillo” de exterior sigue siendo disturbio. Contención, limpieza y un renovador certificado no son extras que se agregan cuando el cliente se pone nervioso.

No somos un despacho de abogados. Lea la regla RRP vigente y el programa de su estado antes de cotizar. Luego escriba el supuesto en la propuesta para que nadie lo “descubra” el día dos.`,
    },
    origin: "seed",
  },
];
