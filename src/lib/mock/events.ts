import type { UserEvent } from "@/types/event";

export const MOCK_EVENTS: UserEvent[] = [
  {
    id: "evt-1",
    title: "Il mio 30° Compleanno",
    description: "Grande festa a tema anni '90 con DJ e torta personalizzata.",
    date: "2026-09-15",
    time: "20:00",
    locationName: "Villa Aurora",
    city: "Milano",
    status: "organizing",
    guestCount: 45,
    services: [
      {
        id: "svc-1-1",
        category: "location",
        name: "Location",
        providerName: "Villa Aurora",
        status: "confirmed",
        amountPaid: 600,
      },
      {
        id: "svc-1-2",
        category: "dj",
        name: "DJ",
        providerName: "DJ Max Sound",
        status: "pending",
        amountPaid: 450,
      },
      {
        id: "svc-1-3",
        category: "bakery",
        name: "Torta",
        providerName: "Pasticceria Dolce Vita",
        status: "confirmed",
        amountPaid: 105,
      },
    ],
  },
  {
    id: "evt-2",
    title: "Festa estiva in giardino",
    description: "BBQ e musica live con amici e famiglia.",
    date: "2026-10-02",
    time: "18:30",
    locationName: "Giardino delle Rose",
    city: "Monza",
    status: "confirmed",
    guestCount: 60,
    services: [
      {
        id: "svc-2-1",
        category: "location",
        name: "Location",
        providerName: "Giardino delle Rose",
        status: "confirmed",
        amountPaid: 375,
      },
      {
        id: "svc-2-2",
        category: "decorations",
        name: "Decorazioni",
        providerName: "Party Deco Store",
        status: "confirmed",
        amountPaid: 220,
      },
      {
        id: "svc-2-3",
        category: "photographer",
        name: "Fotografo",
        providerName: "Studio Luce",
        status: "pending",
        amountPaid: 380,
      },
    ],
  },
  {
    id: "evt-3",
    title: "Laurea di Marco",
    description: "Festa di laurea con aperitivo e torta.",
    date: "2025-12-20",
    time: "19:00",
    locationName: "Loft Industriale Navigli",
    city: "Milano",
    status: "completed",
    guestCount: 35,
    services: [
      {
        id: "svc-3-1",
        category: "location",
        name: "Location",
        providerName: "Loft Industriale Navigli",
        status: "confirmed",
        amountPaid: 475,
      },
      {
        id: "svc-3-2",
        category: "dj",
        name: "DJ",
        providerName: "DJ Max Sound",
        status: "confirmed",
        amountPaid: 450,
      },
      {
        id: "svc-3-3",
        category: "bakery",
        name: "Torta",
        providerName: "Pasticceria Dolce Vita",
        status: "cancelled",
        amountPaid: 70,
      },
    ],
  },
];

export function getEventById(id: string): UserEvent | undefined {
  return MOCK_EVENTS.find((event) => event.id === id);
}
