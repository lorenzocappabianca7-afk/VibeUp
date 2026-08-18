# Sessioni persistenti (stile Nike / Airbnb)

Una volta fatto login su un dispositivo, l’utente resta connesso **finché non preme Esci** o la sessione non viene revocata. Il blocco a 7 giorni è uno **sblocco rapido** (Face ID / password), non un nuovo login.

## Cosa fa il codice

| Pezzo | Comportamento |
|---|---|
| Cookie auth | `Max-Age` **400 giorni** (limite browser), `SameSite=Lax`, persistenti (non session cookie) |
| Client browser | `persistSession: true`, `autoRefreshToken: true` |
| Proxy / server | Ad ogni richiesta rinnova access token e riscrive i cookie |
| Logout **Esci** | `signOut({ scope: "global" })` — invalida refresh token e cookie, non solo lo stato UI |
| Idle lock | 7 giorni di inattività → Face ID / password sul **dispositivo già loggato** |

Access token (JWT): di solito **1 ora**, rinnovato in automatico col refresh token. Non chiede la password.

## Dashboard Supabase (da impostare a mano)

**Authentication → Sessions** (o JWT / Auth settings, a seconda della UI):

1. **JWT expiry** (access token): `3600` secondi (1 ora). Va bene: il client lo rinnova da solo.
2. **Time-box user sessions**: **disattivato**, oppure massimo **400 giorni**. Se è a 7 giorni, l’utente dovrà rifare login.
3. **Inactivity timeout**: **disattivato**. L’inattività a 7 giorni è gestita in-app (sblocco rapido, non email+password).
4. Non attivare “single session” / logout su tutti i device al nuovo login, se vuoi restare loggato su più browser.

Il **refresh token** in GoTrue, senza time-box, resta valido finché non viene ruotato/revocato (logout, reset password, revoke). Allinealo ai cookie: **400 giorni** se la dashboard chiede una durata esplicita.

## Test rapidi

1. Login → chiudi tab/browser → riapri: già dentro, niente schermata Accedi.
2. Stesso dopo qualche ora. Dopo 7 giorni senza uso: sblocco Face ID/password, non email+password.
3. **Esci** dal Profilo → al prossimo accesso serve email+password.
4. Altro telefono/browser: login completo (corretto).
