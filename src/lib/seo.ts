import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import type { ServiceCategory } from "@/lib/mock/service-providers";

export const SITE_NAME = "VibeUp";
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;
export const MAX_TITLE_LENGTH = 60;
export const META_DESCRIPTION_MIN = 120;
export const META_DESCRIPTION_MAX = 158;

const HOME_TITLE = "VibeUp — Organizza feste senza stress";
const HOME_DESCRIPTION =
  "VibeUp (Vibe Up) è la web app per organizzare feste: trova location, DJ, fotografi e servizi per il tuo evento in un unico posto.";

const DESCRIPTION_PAD =
  "Organizza la festa su VibeUp: location, DJ, fotografi e servizi in Piemonte.";

export const SERVICE_CATEGORY_SEO_LABEL: Record<ServiceCategory, string> = {
  dj: "DJ",
  fotografo: "fotografo",
  decorazioni: "decorazioni",
  altri: "servizio",
};

export type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  follow?: boolean;
  canonical?: string | false;
  image?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
};

function clipAtWord(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const slice = normalized.slice(0, Math.max(0, max - 1));
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > Math.min(24, max - 12) ? lastSpace : slice.length;
  return `${slice.slice(0, cut).trimEnd()}…`;
}

export function brandedTitle(pageTitle: string): string {
  const budget = MAX_TITLE_LENGTH - TITLE_SUFFIX.length;
  return `${clipAtWord(pageTitle, budget)}${TITLE_SUFFIX}`;
}

export function fitMetaDescription(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  let value = normalized;
  if (value.length < META_DESCRIPTION_MIN) {
    if (!value) {
      value = DESCRIPTION_PAD;
    } else if (/[.!?…]$/.test(value)) {
      value = `${value} ${DESCRIPTION_PAD}`;
    } else {
      value = `${value}. ${DESCRIPTION_PAD}`;
    }
  }
  if (value.length <= META_DESCRIPTION_MAX) return value;

  const sliced = value.slice(0, META_DESCRIPTION_MAX);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut =
    lastSpace >= META_DESCRIPTION_MIN - 8 ? lastSpace : META_DESCRIPTION_MAX;
  let clipped = value.slice(0, cut).trimEnd().replace(/[,:;–—-]+$/, "");
  if (!/[.!?…]$/.test(clipped)) clipped = `${clipped}…`;
  if (clipped.length > META_DESCRIPTION_MAX) {
    clipped = `${clipped.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }
  return clipped;
}

function toAbsoluteUrl(path: string): string {
  const origin = getSiteUrl().replace(/\/$/, "");
  if (!path || path === "/") return origin;
  return path.startsWith("http")
    ? path
    : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  follow = index,
  canonical = path,
  image,
}: PageMetadataInput): Metadata {
  const documentTitle = brandedTitle(title);
  const metaDescription = fitMetaDescription(description);
  const pageUrl = toAbsoluteUrl(path);
  const images = image
    ? [
        {
          url: image.url,
          alt: image.alt,
          width: image.width ?? 1200,
          height: image.height ?? 630,
        },
      ]
    : undefined;

  return {
    title: { absolute: documentTitle },
    description: metaDescription,
    robots: { index, follow },
    ...(canonical === false
      ? {}
      : { alternates: { canonical: canonical || path } }),
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      url: pageUrl,
      title: documentTitle,
      description: metaDescription,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: documentTitle,
      description: metaDescription,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export const HOME_METADATA = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
} as const;

export const STATIC_PAGE_METADATA = {
  onboarding: {
    title: "Pubblica la tua attività",
    description:
      "Pubblica locale, DJ, fotografo o altri servizi su VibeUp e ricevi richieste di disponibilità da chi organizza feste in Piemonte.",
    path: "/business/onboarding",
  },
  adminCatalog: {
    title: "Catalogo admin",
    description:
      "Area riservata per gestire il catalogo VibeUp: locali e servizi pubblicati, bozze e contenuti da revisionare prima di andare online.",
    path: "/admin/catalog",
    index: false,
  },
  activate: {
    title: "Attiva l'account",
    description:
      "Conferma l'indirizzo email del tuo account VibeUp per attivare il profilo e organizzare feste con location, DJ, fotografi e servizi.",
    path: "/activate",
    index: false,
  },
  resetPassword: {
    title: "Reimposta password",
    description:
      "Imposta una nuova password per il tuo account VibeUp e torna ad accedere in sicurezza a eventi, preventivi salvati e messaggi.",
    path: "/reset-password",
    index: false,
  },
  paymentSuccess: {
    title: "Pagamento confermato",
    description:
      "Pagamento confermato su VibeUp. Lo stato della prenotazione e i prossimi passi per la tua festa sono disponibili nella dashboard eventi.",
    path: "/booking/payment-success",
    index: false,
  },
  paymentCancel: {
    title: "Pagamento annullato",
    description:
      "Pagamento annullato su VibeUp. Nessun addebito è andato a buon fine: puoi riprovare dal dettaglio dell'evento quando sei pronto.",
    path: "/booking/payment-cancel",
    index: false,
  },
  managerRespond: {
    title: "Rispondi alla richiesta",
    description:
      "Rispondi alla richiesta di disponibilità ricevuta su VibeUp: accetta, rifiuta o proponi un'alternativa per la data dell'evento.",
    path: "/r",
    index: false,
  },
  managerAccept: {
    title: "Accetta richiesta",
    description:
      "Conferma la disponibilità per questa richiesta VibeUp. La risposta viene inviata all'organizzatore e aggiorna lo stato della prenotazione.",
    path: "/r",
    index: false,
  },
  managerDecline: {
    title: "Rifiuta richiesta",
    description:
      "Rifiuta questa richiesta di disponibilità su VibeUp. L'organizzatore viene avvisato e può cercare un'altra location o un altro servizio.",
    path: "/r",
    index: false,
  },
  managerPropose: {
    title: "Proponi alternativa",
    description:
      "Proponi una data o un orario alternativo su VibeUp in risposta alla richiesta di disponibilità dell'organizzatore della festa.",
    path: "/r",
    index: false,
  },
  locationMissing: {
    title: "Location non trovata",
    description:
      "Questa location non è disponibile su VibeUp. Torna a Esplora per scoprire locali per feste in Piemonte e richiedere un preventivo.",
    index: false,
  },
  serviceMissing: {
    title: "Servizio non trovato",
    description:
      "Questo servizio non è disponibile su VibeUp. Torna a Esplora per trovare DJ, fotografi, decorazioni e altri fornitori per la tua festa.",
    index: false,
  },
  eventFallback: {
    title: "Dettaglio evento",
    description:
      "Gestisci il tuo evento su VibeUp: ospiti, location, servizi prenotati e scadenze restano in una dashboard privata e non indicizzata.",
    index: false,
  },
  notFound: {
    title: "Pagina non trovata",
    description:
      "La pagina richiesta non esiste su VibeUp. Torna alla home per organizzare la festa: location, DJ, fotografi e servizi in un unico posto.",
    index: false,
  },
} as const;
