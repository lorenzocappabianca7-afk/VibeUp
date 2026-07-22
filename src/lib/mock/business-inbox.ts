export interface BusinessNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "booking" | "payment" | "message" | "system";
}

export interface BusinessConfirmedEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  organizerName: string;
  status: "confirmed";
  notes?: string;
}

export const MOCK_BUSINESS_NOTIFICATIONS: BusinessNotification[] = [
  {
    id: "bn-1",
    title: "Nuova prenotazione confermata",
    body: "Sara M. ha confermato la serata del 28 agosto per 70 ospiti.",
    time: "Ora",
    unread: true,
    kind: "booking",
  },
  {
    id: "bn-2",
    title: "Caparra ricevuta",
    body: "Hai ricevuto la caparra di €450 per Compleanno Giulia.",
    time: "2 ore fa",
    unread: true,
    kind: "payment",
  },
  {
    id: "bn-3",
    title: "Messaggio dall'organizzatore",
    body: "Marco chiede se è possibile anticipare l'ingresso alle 19:30.",
    time: "Ieri",
    unread: false,
    kind: "message",
  },
  {
    id: "bn-4",
    title: "Promemoria evento",
    body: "Domani alle 21:00 hai Laurea Luca. Controlla il setup sala.",
    time: "2 giorni fa",
    unread: false,
    kind: "system",
  },
];

function isoInDays(daysFromToday: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const MOCK_BUSINESS_CONFIRMED_EVENTS: BusinessConfirmedEvent[] = [
  {
    id: "be-1",
    title: "Compleanno Giulia",
    date: isoInDays(7),
    startTime: "20:00",
    endTime: "02:00",
    guestCount: 65,
    organizerName: "Giulia R.",
    status: "confirmed",
    notes: "Allestimento rosa e bianco",
  },
  {
    id: "be-2",
    title: "Laurea Luca",
    date: isoInDays(14),
    startTime: "21:00",
    endTime: "03:00",
    guestCount: 90,
    organizerName: "Luca B.",
    status: "confirmed",
  },
  {
    id: "be-3",
    title: "Cena aziendale Nova",
    date: isoInDays(21),
    startTime: "19:30",
    endTime: "23:30",
    guestCount: 45,
    organizerName: "Nova Events",
    status: "confirmed",
    notes: "Menu vegetariano richiesto",
  },
  {
    id: "be-4",
    title: "Addio al nubilato Chiara",
    date: isoInDays(35),
    startTime: "18:00",
    endTime: "00:00",
    guestCount: 30,
    organizerName: "Chiara V.",
    status: "confirmed",
  },
];
