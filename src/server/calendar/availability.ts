import { checkAppleCalendarAvailability } from "@/server/calendar/apple";
import { checkGoogleCalendarAvailability } from "@/server/calendar/google";
import { getCalendarConnection } from "@/server/calendar/repository";
import type {
  CalendarAvailabilityResult,
  CreateProviderCalendarEventInput,
} from "@/server/calendar/types";

export async function checkAvailability(
  providerId: string,
  dataInizio: string,
  dataFine: string,
): Promise<CalendarAvailabilityResult> {
  const connection = await getCalendarConnection(providerId);

  if (connection.calendar_type === "google") {
    return checkGoogleCalendarAvailability({
      connection,
      dataInizio,
      dataFine,
    });
  }

  return checkAppleCalendarAvailability({
    connection,
    dataInizio,
    dataFine,
  });
}

export function assertValidCalendarRequest(
  input: Pick<
    CreateProviderCalendarEventInput,
    "provider_id" | "data_inizio" | "data_fine"
  >,
) {
  if (!input.provider_id || !isValidDateRange(input.data_inizio, input.data_fine)) {
    throw new Error("Richiesta calendario non valida.");
  }
}

function isValidDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return (
    Number.isFinite(startDate.getTime()) &&
    Number.isFinite(endDate.getTime()) &&
    endDate.getTime() > startDate.getTime()
  );
}
