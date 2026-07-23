import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import type {
  BookingQuote,
  ExtraService,
  ExtraServiceId,
  Location,
} from "@/types/location";

export function getLocationById(id: string): Location | undefined {
  return MOCK_LOCATIONS.find((location) => location.id === id);
}

export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

export function getExtraServicePrice(
  service: ExtraService,
  options?: { cakeKg?: number; guestCount?: number },
): number {
  const { cakeKg = 3, guestCount = 20 } = options ?? {};

  if (service.pricing.type === "fixed") {
    return service.pricing.price;
  }
  if (service.pricing.type === "per_kg") {
    return service.pricing.pricePerKg * cakeKg;
  }
  return (
    service.pricing.pricePerPerson *
    Math.max(guestCount, service.pricing.minGuests)
  );
}

export function calculateBookingQuote(params: {
  hourlyPrice: number;
  startTime: string;
  endTime: string;
  selectedExtras: ExtraServiceId[];
  cakeKg?: number;
  guestCount?: number;
}): BookingQuote {
  const {
    hourlyPrice,
    startTime,
    endTime,
    selectedExtras,
    cakeKg = 3,
    guestCount = 20,
  } = params;

  const hours = calculateHours(startTime, endTime);
  const locationCost = hours * hourlyPrice;

  const extrasCost = selectedExtras.reduce((sum, id) => {
    const service = EXTRA_SERVICES.find((s) => s.id === id);
    if (!service) return sum;
    return (
      sum + getExtraServicePrice(service, { cakeKg, guestCount })
    );
  }, 0);

  const total = locationCost + extrasCost;
  const depositAmount = locationCost * 0.3;

  return {
    hours,
    locationCost,
    extrasCost,
    drinksCost: 0,
    total,
    depositAmount,
  };
}
