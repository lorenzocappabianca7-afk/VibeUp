# Auth email (Resend) & password reset

## Cosa fa il codice

- **Registrazione**: `POST /api/auth/register` crea l’utente via Supabase Admin `generateLink(signup)` e invia l’email di conferma con **Resend** (From: `info@vibeupevents.com`).
- **Recupero password**: `POST /api/auth/send-password-reset` genera un link recovery e lo invia con Resend (non il mailer default di Supabase).
- **Redirect**: `https://vibeupevents.com/auth/callback?next=/reset-password` → `/reset-password`.
- **Cambio password da loggato**: Profilo → Sicurezza → Modifica password.
- **Cambio email da loggato**: Profilo → Impostazioni account → `supabase.auth.updateUser({ email })` (serve conferma sul nuovo indirizzo).
- **Notifiche prenotazioni**: organizer / manager / status-change usano lo stesso mailer Resend.

Sessioni persistenti (resta loggato sul dispositivo, logout solo da Esci): vedi `docs/AUTH_SESSIONS.md`.

## Variabili ambiente (Vercel)

| Variabile | Uso |
|---|---|
| `RESEND_API_KEY` | API key Resend (obbligatoria per inviare email) |
| `NEXT_PUBLIC_SITE_URL` | `https://vibeupevents.com` (senza www) |

Mittente fisso nel codice: **VibeUp \<info@vibeupevents.com\>**.

Su Resend: verifica il dominio `vibeupevents.com` (DNS SPF/DKIM) e usa `info@` come From.

In Authentication → Emails di Supabase, **disattiva i template nativi** di Confirm signup / Recovery (altrimenti partono email doppie). Il reset e la registrazione passano da Resend.

Per il cambio email (`updateUser({ email })`) Supabase può ancora mandare la propria conferma: in Authentication → SMTP settings configura SMTP Resend (`smtp.resend.com`, user `resend`, password = stessa API key, From `info@vibeupevents.com`) così anche quella parte esce da info@.

## Supabase Dashboard

**Authentication → URL configuration**

- **Site URL**: `https://vibeupevents.com`
- **Redirect URLs**:
  - `https://vibeupevents.com/auth/callback`
  - `https://vibeupevents.com/auth/callback?next=/reset-password`
  - `https://vibeupevents.com/reset-password`
  - `http://localhost:3000/auth/callback` (solo sviluppo)
  - `http://localhost:3000/reset-password` (solo sviluppo)

## Admin

Account ufficiale: `info@vibeupevents.com` con `profiles.role = 'admin'`.

Esegui `docs/AUTH_PROFILES_TRIGGER.sql` (trigger profili + promote admin). La password si imposta solo dalla dashboard Auth, mai nel repo.

## SQL da lanciare

1. `docs/AUTH_PROFILES_TRIGGER.sql` — crea `profiles` alla registrazione, sync email, promote info@
2. `docs/AUTH_RLS.sql` — se non già applicato
