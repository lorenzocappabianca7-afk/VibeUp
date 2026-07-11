# Provider Calendar Availability

Stack previsto: Next.js API Routes + Supabase/Postgres + Google Calendar API + Apple iCloud CalDAV.

## Variabili ambiente

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CALENDAR_TOKEN_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_STATE_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://tuodominio.it/api/calendar/google/callback
APPLE_CALDAV_SERVER_URL=https://caldav.icloud.com
```

## Database

Lo schema in `docs/GOOGLE_CALENDAR_SCHEMA.sql` crea la tabella unica `provider_calendars`.

Campi principali:

- `provider_id`
- `calendar_type`: `google` o `apple`
- `access_token_encrypted` e `refresh_token_encrypted` per Google
- `account_email` e `apple_app_password_encrypted` per Apple/iCloud
- `calendar_id`: `primary` o identificativo/nome calendario specifico

## Collegamento Google OAuth

Apri:

```text
/api/calendar/google/start?provider_id=dj-marco-beat&provider_role=dj&provider_name=Marco%20Beat&redirect_path=/?tab=profile
```

Il callback salva access token e refresh token cifrati in `provider_calendars`.
Lo `state` OAuth viene firmato lato server con `GOOGLE_OAUTH_STATE_SECRET`
per evitare manomissioni di provider e redirect.

## Collegamento Apple/iCloud

Apple Calendar non usa OAuth pubblico per iCloud CalDAV: il fornitore deve generare una password specifica per app da Apple ID.

```http
POST /api/calendar/apple/connect
Content-Type: application/json

{
  "provider_id": "foto-chiara-eventi",
  "provider_role": "photographer",
  "provider_name": "Chiara Eventi Photo",
  "icloud_email": "fornitore@icloud.com",
  "app_specific_password": "xxxx-xxxx-xxxx-xxxx",
  "calendar_id": "primary"
}
```

La password specifica per app viene cifrata nel database.

## Verifica disponibilita'

```http
POST /api/calendar/availability
Content-Type: application/json

{
  "provider_id": "dj-marco-beat",
  "data_inizio": "2026-08-02T18:00:00+02:00",
  "data_fine": "2026-08-02T23:00:00+02:00"
}
```

Risposta:

```json
{
  "data": {
    "provider_id": "dj-marco-beat",
    "calendar_type": "google",
    "available": true,
    "busy": []
  }
}
```

La funzione backend unificata e' `checkAvailability(provider_id, data_inizio, data_fine)`.
Legge `provider_calendars.calendar_type` e usa Google `freebusy` oppure Apple CalDAV.
Se `available` e' `false`, la UI deve disabilitare lo slot.

## Creazione evento su calendario fornitore

```http
POST /api/calendar/events
Content-Type: application/json

{
  "provider_id": "dj-marco-beat",
  "data_inizio": "2026-08-02T18:00:00+02:00",
  "data_fine": "2026-08-02T23:00:00+02:00",
  "title": "VibeUp - Festa estiva",
  "description": "Evento confermato da VibeUp",
  "event_id": "evt-123",
  "service_id": "dj-marco-beat"
}
```

L'endpoint ricontrolla `freeBusy` prima di creare l'evento. Se il fornitore e' occupato risponde `409`.
Per Apple crea un oggetto `.ics` sul calendario CalDAV.
