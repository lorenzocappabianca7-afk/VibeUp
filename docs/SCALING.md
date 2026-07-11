# Scaling VibeUp

Questa app e' pronta per una prima validazione con molti utenti concorrenti sul frontend, ma per produzione reale serve evitare stato applicativo volatile.

## Gia' presente

- Build Next.js production con compressione attiva.
- Header di sicurezza base.
- Cache immutable sugli asset statici generati da Next e sulle immagini pubbliche.
- Cache headers sulle API di lettura location.
- Rate limit per endpoint AI e preventivo.
- Rate limit per chat, calendario, OAuth Google e webhook WhatsApp.
- Limiti su upload, numero file e dimensione payload.
- Limite alla crescita delle bucket di rate limit in memoria per evitare consumo RAM durante picchi.
- Limite di messaggi elaborati per singolo webhook WhatsApp.
- UI ottimizzata evitando animazioni e render inutili sulle liste.

## Da collegare prima del go-live

- Database esterno per location, servizi, pubblicazioni e profili admin.
- Object storage per foto/listini caricati, invece di tenere file in memoria.
- Rate limit distribuito su Redis/Upstash o provider equivalente.
- Queue per analisi AI pesanti, cosi' upload e parsing non bloccano richieste web.
- Queue per webhook WhatsApp e creazione eventi calendario, cosi' i provider esterni non rallentano le richieste utente.
- CDN davanti a Next.js per servire asset statici e cache delle API pubbliche di lettura.
- Monitoraggio di error rate, p95/p99 latency, richieste 429 e saturazione database.
- Autenticazione reale: l'email admin e la password attuali sono solo una protezione applicativa per prototipo.

## Regola architetturale

Non usare `globalThis`, `useState` o memoria del processo per dati che devono sopravvivere a refresh, deploy, cold start o piu' istanze server.
