# Chat interna + WhatsApp

Stack previsto: Next.js API Routes + Supabase/Postgres + Meta WhatsApp Cloud API.

## Variabili ambiente

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_TEMPLATE_NAME=vibeup_new_chat
WHATSAPP_TEMPLATE_LANGUAGE=it
```

## Flusso

1. La web app chiama `POST /api/chat/messages` con `conversationId`, `senderParticipantId` e `body`.
2. Il backend verifica che il mittente appartenga alla conversazione.
3. Se e' il primo contatto WhatsApp della conversazione, invia un template Meta approvato; altrimenti invia testo libero.
4. Solo dopo invio WhatsApp riuscito, il backend salva il messaggio in `chat_messages`.
5. Meta richiama `POST /api/webhooks/whatsapp` quando il fornitore risponde.
6. Il webhook verifica `x-hub-signature-256` usando `WHATSAPP_APP_SECRET`.
7. Il webhook associa la risposta alla conversazione tramite `context.id` del messaggio WhatsApp o tramite numero del provider.
8. La UI puo' ascoltare `chat_messages` in realtime con Supabase Realtime filtrando per `conversation_id`.

## Template WhatsApp

Il template `vibeup_new_chat` deve avere tre variabili body:

1. Nome utente.
2. Nome fornitore/servizio.
3. Anteprima del messaggio.

Esempio:

```text
Ciao {{1}}, hai ricevuto una nuova richiesta VibeUp per {{2}}: "{{3}}".
Rispondi a questo messaggio per continuare la chat con l'utente.
```
