import type { AvailableLocationService, Location } from "@/types/location";

/** Net amounts from the Popup Location quote (3 August 2026). VAT is in the copy. */
const QUOTE_SERVICES: AvailableLocationService[] = [
  {
    name: "Cena a buffet",
    description:
      "40 € + IVA 10% a persona. Minimo 40 partecipanti. Una decina di finger, un primo caldo, dolci al cucchiaio e buffet vini (prosecco, spritz, analcolici) per tutta la durata della cena.",
    pricing: { type: "per_person", pricePerPerson: 40 },
  },
  {
    name: "Cocktail dopo cena",
    description: "6 € + IVA 10% a persona. Opzionale.",
    pricing: { type: "per_person", pricePerPerson: 6 },
  },
  {
    name: "Cachet DJ esterno",
    description: "200 € + IVA 22% se portate un artista esterno. Opzionale.",
    pricing: { type: "fixed", price: 200 },
  },
  {
    name: "Attrezzatura tecnica luci e console",
    description: "150 € + IVA 22%. Opzionale, insieme al DJ esterno.",
    pricing: { type: "fixed", price: 150 },
  },
  {
    name: "Diritti SIAE",
    description:
      "150 € + IVA 22% se la richiesta agli uffici di competenza la gestisce la location.",
    pricing: { type: "fixed", price: 150 },
  },
];

const QUOTE_DESCRIPTION_TAIL =
  "L’affitto delle sale è 1.200 € + IVA 22% a serata, con chiusura alle 01:30. La cena a buffet (finger, primo caldo, dolci e buffet vini per tutta la cena) è 40 € + IVA 10% a persona, con un minimo di 40 partecipanti. È obbligatoria la presenza di un addetto alla sicurezza ogni 25/30 invitati, a 120 € + IVA 22% cadauno.";

const QUOTE_TERMS = {
  technicalDetails: {
    surfaceSqm: 0,
    parkingSpots: 0,
    minHours: 0,
    maxGuests: 0,
  },
  priceModel: "event" as const,
  eventPrice: 1200,
  hourlyPrice: 1200,
  priceBadge: "IVA 22% esclusa",
  capacity: 0,
  partyTypes: ["compleanno", "festa", "matrimonio"] as Location["partyTypes"],
  deposit: 360,
  includedServices: ["Utilizzo delle sale", "Chiusura alle 01:30"],
  availableServices: QUOTE_SERVICES,
  drinksPricing: {
    drinkUnitPrice: 6,
    openBarPerInvitee: 6,
  },
  contactsBeenHere: { count: 0, contacts: [] },
  latitude: 0,
  longitude: 0,
};

const VITTORINA_GALLERY = [
  "/locations/la-vittorina/01-corte.jpg",
  "/locations/la-vittorina/02-facciata.jpg",
  "/locations/la-vittorina/03-portico.jpg",
  "/locations/la-vittorina/04-sala.jpg",
  "/locations/la-vittorina/05-tavoli.jpg",
] as const;

const ROVERE_GALLERY = [
  "/locations/castello-della-rovere/01-aerea.jpg",
  "/locations/castello-della-rovere/02-facciata.jpg",
  "/locations/castello-della-rovere/03-sala.jpg",
  "/locations/castello-della-rovere/04-sala-sera.jpg",
] as const;

const SASSI_GALLERY = [
  "/locations/villa-sassi/01-facciata.jpg",
  "/locations/villa-sassi/02-giardino.jpg",
  "/locations/villa-sassi/03-sala-sera.jpg",
  "/locations/villa-sassi/04-sala.jpg",
] as const;

const BEACH_GALLERY = [
  "/locations/the-beach/01-serata.jpg",
  "/locations/the-beach/02-sala.jpg",
  "/locations/the-beach/03-pranzo.jpg",
  "/locations/the-beach/04-consolle.jpg",
] as const;

const NUVOLA_GALLERY = [
  "/locations/spazio-nuvola-9/01-diciottesimo.jpg",
  "/locations/spazio-nuvola-9/02-esterno.jpg",
  "/locations/spazio-nuvola-9/03-sala.jpg",
  "/locations/spazio-nuvola-9/04-open-space.jpg",
] as const;

const DOCKS_GALLERY = [
  "/locations/spazio-docks/01-esterno.jpg",
  "/locations/spazio-docks/02-sala.jpg",
  "/locations/spazio-docks/03-diciottesimo.jpg",
] as const;

const CERIANA_GALLERY = [
  "/locations/palazzo-ceriana/01-facciata.jpg",
  "/locations/palazzo-ceriana/02-sala-specchi.jpg",
  "/locations/palazzo-ceriana/03-sala-pranzo.jpg",
  "/locations/palazzo-ceriana/04-buffet.jpg",
  "/locations/palazzo-ceriana/05-scalone.jpg",
] as const;

const CHEERS_GALLERY = [
  "/locations/cheers-superga/01-esterno.jpg",
  "/locations/cheers-superga/02-terrazza.jpg",
  "/locations/cheers-superga/03-terrazza-sera.jpg",
  "/locations/cheers-superga/04-sala.jpg",
] as const;

const MONTALDO_GALLERY = [
  "/locations/castello-di-montaldo/01-aerea.jpg",
  "/locations/castello-di-montaldo/02-corte.jpg",
  "/locations/castello-di-montaldo/03-sala.jpg",
  "/locations/castello-di-montaldo/04-sala-lampadari.jpg",
  "/locations/castello-di-montaldo/05-notte.jpg",
] as const;

/**
 * Real venues supplied by the team. Prices are the net amounts from the
 * Popup Location quote (3 August 2026); VAT is stated in the copy.
 */
export const PARTNER_LOCATIONS: Location[] = [
  {
    id: "loc-vittorina",
    name: "La Vittorina",
    city: "Moncalieri",
    comune: "Moncalieri",
    regione: "Piemonte",
    address:
      "Strada alla vetta del Colle della Maddalena 170/4, 10024 Moncalieri",
    geoArea: "dintorni",
    zone: "moncalieri",
    zoneLabel: "Moncalieri",
    imageUrl: VITTORINA_GALLERY[0],
    gallery: [...VITTORINA_GALLERY],
    description: `Location sul Colle della Maddalena, a Moncalieri. ${QUOTE_DESCRIPTION_TAIL}`,
    characteristics: ["Collina", "Giardino", "Ricevimenti"],
    ...QUOTE_TERMS,
  },
  {
    id: "loc-castello-della-rovere",
    name: "Castello della Rovere",
    city: "Vinovo",
    comune: "Vinovo",
    regione: "Piemonte",
    address: "Via del Castello 2, 10048 Vinovo",
    geoArea: "dintorni",
    zoneLabel: "Vinovo",
    imageUrl: ROVERE_GALLERY[0],
    gallery: [...ROVERE_GALLERY],
    description: `Castello a Vinovo. ${QUOTE_DESCRIPTION_TAIL}`,
    characteristics: ["Castello", "Sale", "Ricevimenti"],
    ...QUOTE_TERMS,
  },
  {
    id: "loc-villa-sassi",
    name: "Villa Sassi",
    city: "",
    comune: "",
    regione: "Piemonte",
    address: "",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: SASSI_GALLERY[0],
    gallery: [...SASSI_GALLERY],
    description:
      "Villa Sassi ospita anche i diciottesimi. L’affitto parte da 2.500 €, IVA esclusa. Il catering è interno e il prezzo del menù si valuta insieme. Il DJ costa circa 600 €, IVA esclusa. Per il fotografo la location mette in contatto con i propri partner.",
    characteristics: ["Villa", "Giardino", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "event",
    eventPrice: 2500,
    hourlyPrice: 2500,
    priceBadge: "IVA esclusa",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 750,
    includedServices: [],
    availableServices: [
      {
        name: "DJ",
        description: "Circa 600 €, IVA esclusa.",
        pricing: { type: "fixed", price: 600 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-the-beach",
    name: "The Beach",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "",
    geoArea: "torino_citta",
    zoneLabel: "Murazzi",
    imageUrl: BEACH_GALLERY[0],
    gallery: [...BEACH_GALLERY],
    description:
      "The Beach ai Murazzi. Per i compleanni le formule di partenza includono catering e DJ. Il prezzo in scheda è la formula Solo aperitivo: 22 € a persona, dalle 20:30 alle 23:30, con aperitivo (6 antipastini e primo caldo), 1 consumazione a scelta e tavolo riservato fino alle 23:30. Aperitivo + serata, dalle 20:30 fino all’alba: 30 € a persona, con aperitivo e 2 consumazioni, tavolo fino alle 23:30 e ingresso alla serata. Aperitivo + tavolo, dalle 20:30 fino all’alba: 40 € a persona, con aperitivo e 1 consumazione, tavolo per tutta la serata e 1 bottiglia base ogni 5 persone oppure 2 consumazioni. Ci sono proposte vegetariane, vegane, gluten free e senza lattosio.",
    characteristics: ["Murazzi", "Sala", "Serata"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "person",
    personPrice: 22,
    hourlyPrice: 22,
    priceBadge: "Formula di partenza, a persona",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 0,
    includedServices: [
      "Catering",
      "DJ",
      "Aperitivo: 6 antipastini e primo caldo",
      "1 consumazione a scelta",
      "Tavolo riservato fino alle 23:30",
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-spazio-nuvola-9",
    name: "Spazio Nuvola 9",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Corso Moncalieri 506/28, 10133 Torino",
    geoArea: "torino_citta",
    zoneLabel: "Corso Moncalieri",
    imageUrl: NUVOLA_GALLERY[0],
    gallery: [...NUVOLA_GALLERY],
    description:
      "Spazio Nuvola 9, in Corso Moncalieri, è una location in esclusiva per feste private, anche i diciottesimi. Il listino 2025 per la serata 18:30–02:00, oppure 14:00–20:00, è 700 € fino a 30 invitati, 800 € fino a 50 e 900 € fino a 80. Nel prezzo ci sono lo spazio, l’esterno in base alla stagione, la cucina per cibi freddi e finger food, la pulizia durante la festa, l’impianto audio Bose e le luci della zona dance. La musica dance va fino a mezzanotte; dall’1:30 solo musica soft. Non fanno ristorazione: la torta si porta dalla pasticceria, oppure ci si affida a un catering esterno. La cucina per cibi caldi è un extra da 100 €. Se si chiede il DJ, il prezzo è 200 €; in alternativa ci si collega all’impianto con una playlist. Altri extra: guardaroba 100 €, pagoda 3×3 30 €, stufa esterna 30 €, pulizia extra 50 €, ora extra 100 €. Pulizie finali da 30 a 90 €.",
    characteristics: ["Open space", "Esterno", "Esclusiva"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 80,
      outdoorArea: true,
    },
    priceModel: "event",
    eventPrice: 700,
    hourlyPrice: 700,
    priceBadge: "Listino 2025, in base agli invitati",
    guestPriceTiers: [
      { maxGuests: 30, price: 700 },
      { maxGuests: 50, price: 800 },
      { maxGuests: 80, price: 900 },
    ],
    capacity: 80,
    partyTypes: ["compleanno", "festa"],
    deposit: 210,
    includedServices: [
      "Location 18:30–02:00 oppure 14:00–20:00",
      "Spazio all’aperto, in base alla stagione",
      "Cucina per cibi freddi e finger food",
      "Pulizia durante l’evento",
      "Impianto audio Bose",
      "Luci per la zona dance e il bar",
    ],
    availableServices: [
      {
        name: "DJ",
        description: "200 € se si chiede un DJ. In alternativa si usa una playlist sull’impianto Bose.",
        pricing: { type: "fixed", price: 200 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-spazio-docks",
    name: "Spazio Docks",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Via Valprato 68, 10155 Torino",
    geoArea: "torino_citta",
    zoneLabel: "Docks Dora",
    imageUrl: DOCKS_GALLERY[0],
    gallery: [...DOCKS_GALLERY],
    description:
      "Spazio Docks, ai Docks Dora in Via Valprato 68, è in esclusiva fino alle 02:00. Proposta dell’8 agosto 2026 per un 18° a ottobre. L’affitto della location è 500 € e l’addetto alla sicurezza è obbligatorio a 100 €. Il prezzo in scheda somma queste due voci. Apericena, dalle 20:00/20:30: 38 € + IVA 10% a persona, minimo 30, con analcolico libero, 2 drink e sbicchierata. Dopo cena, dalle 21:00/21:30: 28 € + IVA 10% a persona, stesso minimo e stesse bevande. I menù si adattano a intolleranze e allergie. Extra: torta 40 € al chilo oppure portata da voi, DJ con attrezzatura 300 € oppure di vostra competenza, SIAE a vostro carico. Il fotografo è indicato senza un prezzo. Caparra 50% prima dell’evento e saldo a fine servizio. Ingresso pedonale. Contatto BBEvents: info@bbevents.it, 334 8765508.",
    characteristics: ["Docks", "Esclusiva", "Veranda"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
      outdoorArea: true,
    },
    priceModel: "event",
    eventPrice: 600,
    hourlyPrice: 600,
    priceBadge: "Affitto 500 € + sicurezza 100 €",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 180,
    includedServices: [
      "Location in esclusiva fino alle 02:00",
      "Allestimento della sala",
      "Personale",
      "Addetto alla sicurezza",
      "Ingresso pedonale",
    ],
    availableServices: [
      {
        name: "Catering apericena",
        description:
          "38 € + IVA 10% a persona. Minimo 30 persone. Analcolico libero, 2 drink e sbicchierata. Dalle 20:00/20:30.",
        pricing: { type: "per_person", pricePerPerson: 38, minGuests: 30 },
      },
      {
        name: "DJ",
        description: "300 € con attrezzatura, oppure di vostra competenza.",
        pricing: { type: "fixed", price: 300 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-palazzo-ceriana",
    name: "Palazzo Ceriana",
    city: "",
    comune: "",
    regione: "Piemonte",
    address: "",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: CERIANA_GALLERY[0],
    gallery: [...CERIANA_GALLERY],
    description:
      "Palazzo Ceriana. L’affitto è 2.000 € + IVA 22%. La cena a buffet è 40 € + IVA 10% a persona, minimo 40: una decina di finger, un primo caldo, dolci al cucchiaio e buvette dei vini (prosecco, spritz, analcolici) aperta per tutta la cena. È obbligatorio 1 addetto alla sicurezza ogni 25/30 invitati, 120 € + IVA 22% ciascuno. Cocktail dopo cena 6 € + IVA 10% a persona. DJ esterno: cachet 200 € + IVA 22%, luci e consolle 150 € + IVA 22%. Diritti SIAE 150 € + IVA 22%, a carico vostro; la location può fare la richiesta.",
    characteristics: ["Palazzo", "Specchi", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
    },
    priceModel: "event",
    eventPrice: 2000,
    hourlyPrice: 2000,
    priceBadge: "IVA 22% esclusa",
    capacity: 0,
    partyTypes: ["festa"],
    deposit: 600,
    includedServices: [],
    availableServices: [
      {
        name: "Catering cena a buffet",
        description:
          "40 € + IVA 10% a persona. Minimo 40. Finger, primo caldo, dolci al cucchiaio e buvette dei vini aperta per tutta la cena.",
        pricing: { type: "per_person", pricePerPerson: 40, minGuests: 40 },
      },
      {
        name: "Cocktail dopo cena",
        description: "6 € + IVA 10% a persona.",
        pricing: { type: "per_person", pricePerPerson: 6 },
      },
      {
        name: "DJ",
        description: "Cachet di un DJ esterno: 200 € + IVA 22%.",
        pricing: { type: "fixed", price: 200 },
      },
      {
        name: "Luci e consolle",
        description: "Attrezzatura luci ballo e consolle: 150 € + IVA 22%.",
        pricing: { type: "fixed", price: 150 },
      },
      {
        name: "Diritti SIAE",
        description: "150 € + IVA 22%. La location può occuparsi della richiesta.",
        pricing: { type: "fixed", price: 150 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-cheers-superga",
    name: "Cheers Bistrot Superga",
    city: "Torino",
    comune: "Torino",
    regione: "Piemonte",
    address: "Str. Basilica di Superga 45, Torino",
    geoArea: "torino_citta",
    zoneLabel: "Superga",
    imageUrl: CHEERS_GALLERY[0],
    gallery: [...CHEERS_GALLERY],
    description:
      "Cheers Bistrot Superga, in Str. Basilica di Superga 45 a Torino, ospita i diciottesimi. La saletta privata è al massimo per 30 persone, solo il vostro gruppo: oltre le 30 non ci state. Il prezzo in scheda è l’Opzione Soft, 35 € a persona: focacce miste, taglieri di salumi e formaggi con chiacchiere, vitello tonnato, chicche di patate con salsa di datterino, crema di pecorino e coulis al basilico, acqua e caffè. Opzione Silver, 40 € a persona: taglieri, battuta di fassona con stracciatella agli agrumi e pomodorini confit, plin al sugo d’arrosto, guancia di manzo con patate arrosto, acqua e caffè. Opzione Gold, 45 € a persona: battuta di fassona, vitello tonnato, plin, chicche di patate, guancia di manzo, acqua e caffè. Nei tre menù il vino è compreso, una bottiglia ogni 4 persone: Barbera d’Asti, Dolcetto d’Alba o Langhe Arneis. Si può sostituire con altri vini in bottiglia, sempre una ogni 4: Ruchè +3 €, Erbaluce +3 €, Valdobbiadene Brut +3 €, Barbera d’Asti superiore +5 €, Gewurztraminer +5 €. Le modifiche valgono per tutto il tavolo. Sostituzioni allo stesso prezzo: vitello tonnato, battuta con stracciatella, plin al sugo d’arrosto, rigatoni con crema di zucchine, menta, Castelmagno e guanciale. Orecchiette con crema di patate allo zafferano, pecorino, cozze e prezzemolo +3 €. Filetto di maialino con fondo bruno +2 €. Aggiunte a persona: vitello tonnato o battuta +5 €, plin, rigatoni o filetto di maialino +6 €, orecchiette +7 €. Torta o dolce monoporzione 3 € a persona, minimo 10: pan di Spagna al cioccolato o alla crema, tiramisù o cheesecake ai frutti di bosco. Non fanno il fotografo e non mettono il DJ. Il catering non è un servizio a parte: sono un ristorante e il menù è il prezzo. L’aperitivo è senza prenotazione dalle 15:00 alle 20:00; i tavoli si liberano alle 19:30 dentro e alle 20:00 fuori. Si prenota per telefono, non su WhatsApp, oppure su https://octotable.com/book/restaurant/319470/welcome. Non si può chiedere un posto attaccato alla ringhiera: i tavoli seguono l’ordine di prenotazione. Se la terrazza non compare come sala, per quella data è al completo.",
    characteristics: ["Superga", "Terrazza", "Sala"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 30,
      outdoorArea: true,
    },
    priceModel: "person",
    personPrice: 35,
    hourlyPrice: 35,
    priceBadge: "Menù di partenza, a persona",
    capacity: 30,
    partyTypes: ["compleanno", "festa", "aziendale"],
    deposit: 0,
    includedServices: [
      "Opzione Soft",
      "Acqua e caffè",
      "Vino: 1 bottiglia ogni 4 persone",
    ],
    availableServices: [
      {
        name: "Torta o dolce",
        description:
          "3 € a persona, minimo 10. Pan di Spagna al cioccolato o alla crema, tiramisù o cheesecake ai frutti di bosco.",
        pricing: { type: "per_person", pricePerPerson: 3, minGuests: 10 },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
  {
    id: "loc-castello-di-montaldo",
    name: "Castello di Montaldo",
    city: "Montaldo Torinese",
    comune: "Montaldo Torinese",
    regione: "Piemonte",
    address: "Piazza Superga, 1, 10020 Montaldo Torinese (TO)",
    geoArea: "dintorni",
    zoneLabel: "",
    imageUrl: MONTALDO_GALLERY[0],
    gallery: [...MONTALDO_GALLERY],
    description:
      "Castello di Montaldo, in Piazza Superga 1 a Montaldo Torinese. Per i diciottesimi la mail del 7 agosto 2026 propone due formule a persona, IVA 10% esclusa. Il prezzo in scheda è la Proposta 1, 75 € a persona: aperitivo reale, un primo a passaggio, torta e bevande illimitate. L’aperitivo è un’isola di formaggi DOP con composte di frutta, miele e crostini al nero di segale; un’isola di salumi nostrani e grissini al rosmarino; quiche alle verdure e tartellata al burro di Normandia con gambero al lime; pizze rosse con pomodoro del Gargano e focaccia all’olio EVO; omelette alle erbette di campo e Parmigiano al taglio pietra; crudité di verdurine e bocconcini di bufala campana DOP; crock and soft di patate con fontina d’alpeggio; tapas di terra e di mare. Le bevande illimitate sono vino bianco, bollicine, miscelati alcolici, cocktail analcolici, acqua naturale e gasata e bevande gasate. La Proposta 2 è 85 € a persona, IVA 10% esclusa: lo stesso aperitivo, un primo, un secondo, la torta e le stesse bevande. Nella mail non ci sono prezzi per DJ, fotografo o per un affitto della sala separato dal menù. Contatto: +39 011 0620566, eventi@castellodimontaldo.it, www.castellodimontaldo.it.",
    characteristics: ["Castello", "Corte", "Sale"],
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 0,
      maxGuests: 0,
      outdoorArea: true,
    },
    priceModel: "person",
    personPrice: 75,
    hourlyPrice: 75,
    priceBadge: "Proposta di partenza, IVA 10% esclusa",
    capacity: 0,
    partyTypes: ["compleanno", "festa"],
    deposit: 0,
    includedServices: [
      "Aperitivo reale",
      "1 primo a passaggio",
      "Torta",
      "Bevande illimitate",
    ],
    availableServices: [
      {
        name: "Aperitivo reale",
        description: "Incluso nella proposta, insieme al primo e alla torta.",
        pricing: { type: "included" },
      },
      {
        name: "Bevande illimitate",
        description:
          "Vino bianco, bollicine, miscelati alcolici, cocktail analcolici, acqua e bevande gasate.",
        pricing: { type: "included" },
      },
    ],
    contactsBeenHere: { count: 0, contacts: [] },
    latitude: 0,
    longitude: 0,
  },
];
