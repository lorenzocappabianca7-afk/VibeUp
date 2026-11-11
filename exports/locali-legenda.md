# Legenda dei locali

File dati: `exports/locali.csv`. Separatore `;`, UTF-8 con BOM, così Excel lo apre con le colonne già divise.

L’export non applica i valori di default che l’app usa solo quando mostra una scheda incompleta. Se un dato non è registrato, la cella è vuota. Uno zero è uno zero salvato nei dati.

## Da dove arrivano i locali

| Origine nel CSV | Dove sta | Cosa ho letto |
| --- | --- | --- |
| `database` | tabella `public.listings` (`kind = location` oppure `category = locali`), più `public.listing_media` e `public.profiles` per foto e contatti del gestore | tutte le righe, in qualsiasi stato (`draft`, `pending_review`, `published`, `archived`) |
| `esempio` | lista fissa `PARTNER_LOCATIONS` in `src/lib/catalog/partner-locations.ts`, riesportata come `MOCK_LOCATIONS` da `src/lib/mock/locations.ts` | tutti i locali di quella lista |

Oggi `public.listings` non contiene nessun locale. L’app, in Esplora e in Home, mostra solo i 9 della lista fissa. Non esiste uno stato pubblicato/bozza per quei 9: nel CSV lo stato è `altro` e la colonna `stato_tecnico` dice `lista fissa, sempre visibile`.

## Colonne chieste

| Colonna | Significato | Dove sta il dato |
| --- | --- | --- |
| `id` | Identificativo del locale | lista fissa: campo `id`. Database: `listings.id` |
| `origine` | `database` o `esempio` | assegnata in export |
| `stato` | `pubblicato`, `bozza` o `altro` | `listings.status`. `published` → pubblicato, `draft` → bozza, `pending_review` e `archived` → altro. La lista fissa non ha questo campo |
| `nome` | Nome | lista: `name`. Database: `listings.name` |
| `indirizzo` | Via e numero | lista: `address`. Database: `listings.address`, altrimenti `data.address` |
| `citta_o_zona` | Città e, se è diversa, l’etichetta di zona, unite con ` · ` | `city` e `zoneLabel`. Nel database anche `listings.city` e `provider_zone` |
| `capienza_minima` | Minimo invitati del locale | non esiste un campo. Resta vuota |
| `capienza_massima` | Massimo invitati | `capacity`. Se manca, `technicalDetails.maxGuests`. `0` vuol dire che il numero è salvato a zero |
| `prezzo_base_feriale` | Prezzo della sala in un giorno feriale, IVA inclusa se c’è un’aliquota, con l’unità | calcolato dal listino, vedi sotto. Non è una colonna del database |
| `prezzo_base_weekend` | Lo stesso prezzo con il ricarico del weekend | stesso listino, moltiplicato. Venerdì, sabato e domenica contano come weekend |
| `orari_disponibili` | Fasce o orari di chiusura scritti tra i servizi inclusi. Se c’è un minimo di ore maggiore di zero, è aggiunto in coda | non c’è una tabella orari. Il testo esce da `includedServices` quando contiene un orario (`18:30`, `chiusura`, `fino alle`). Il minimo ore è `technicalDetails.minHours` |
| `pacchetti_drink` | Tariffe drink, non pacchetti con un nome proprio | `drinksPricing.drinkUnitPrice` (a drink) e `drinksPricing.openBarPerInvitee` (a persona). Gli importi sono netti se è indicata l’IVA |
| `pacchetti_extra` | Servizi prenotabili del locale, nome e prezzo | `availableServices`. `included` → incluso. `fixed` → fisso. `per_person` → a persona, con il minimo persone se c’è |
| `caratteristiche` | Fino a 3 tratti usati per ordinare i locali in base al testo libero | `characteristics` |
| `descrizione` | Testo di atmosfera | lista: `description`. Database: `listings.description` |
| `parole_chiave_o_tag` | Tag salvati | solo se nel JSON del database ci sono `tags` o `keywords`. La lista fissa non li ha: l’ordinamento usa descrizione, caratteristiche, servizi inclusi e tipi di festa, non una lista di tag |
| `numero_foto` | Quante foto distinte | `imageUrl` + `gallery`. Nel database anche `cover_image_url` e le righe di `listing_media` |
| `link_prima_foto` | Prima foto | la copertina, altrimenti la prima della galleria. I percorsi della lista fissa sono file in `public/locations/` |
| `email_gestore` | Email del proprietario della scheda | `profiles.email` tramite `listings.owner_id`. La lista fissa non ha un gestore collegato |
| `telefono_gestore` | Telefono del proprietario | `profiles.phone` |

## Altre colonne, in fondo

Servono a non buttare via campi che esistono e che non erano nell’elenco.

| Colonna | Significato | Dove sta |
| --- | --- | --- |
| `stato_tecnico` | Stato originale, più preciso di `stato` | `listings.status` (`in revisione`, `archiviato`) oppure la nota sulla lista fissa |
| `comune` | Comune | `comune` |
| `regione` | Sempre Piemonte nel tipo dei dati | `regione` |
| `area_geografica` | `torino_citta` o `dintorni` | `geoArea` |
| `quartiere` | Quartiere di Torino, se c’è | `district` |
| `zona` | Codice zona dei dintorni, se c’è | `zone` |
| `etichetta_zona` | Zona mostrata sulla card | `zoneLabel` |
| `latitudine`, `longitudine` | Coordinate | `latitude`, `longitude` |
| `modello_prezzo` | `event` (a serata) o `person` (a persona) | `priceModel` |
| `prezzo_listino_netto` | Importo salvato, prima dell’IVA e prima del weekend | `eventPrice`, `personPrice`, `hourlyPrice` o le fasce |
| `unita_listino` | Unità di quel listino | ricavata dal modello |
| `fasce_invitati` | Soglie `invitati:prezzo netto` | `guestPriceTiers` |
| `aliquota_iva` | Frazione, per esempio `0.22` | `vatRate`. Se è vuota, il listino è già il prezzo finale |
| `badge_prezzo` | Frase commerciale sul prezzo | `priceBadge` |
| `caparra_registrata` | Caparra salvata nel record | `deposit`. In preventivo la caparra mostrata è il 30% del costo sala di quella data (`src/lib/booking-money.ts`) |
| `ore_minime` | Durata minima | `technicalDetails.minHours` |
| `superficie_mq` | Superficie | `technicalDetails.surfaceSqm` |
| `posti_auto` | Parcheggi | `technicalDetails.parkingSpots` |
| `accessibilita`, `aria_condizionata`, `area_esterna` | Sì/no, vuoto se il locale non lo ha dichiarato | `technicalDetails` |
| `capienza_tecnica_max` | Stesso concetto della capienza, nel blocco tecnico | `technicalDetails.maxGuests` |
| `servizi_inclusi` | Elenco incluso nel prezzo | `includedServices` |
| `tipi_festa` | Tipi di evento accettati | `partyTypes` |
| `badge_distanza` | Etichetta distanza, se c’è | `distanceBadge` |
| `galleria` | Tutti i percorsi foto, separati da ` \| ` | `gallery` |
| `owner_id`, `nome_gestore` | Account collegato | `listings.owner_id`, `profiles.display_name` |
| `creato_il`, `aggiornato_il` | Date della riga | `listings.created_at`, `listings.updated_at` |
| `categoria`, `kind` | Nel catalogo | `listings.category`, `listings.kind`. Per la lista fissa sono `locali` e `location` |
| `extra_...` | Chiave presente nel JSON `listings.data` e non già mappata sopra | `listings.data` |

Quando una scheda del database è incompleta, l’app in visualizzazione riempie dei buchi (`src/server/repositories/catalog.ts`): città `Torino` se manca, prezzo orario `100` se manca, capienza `50`, superficie `80`, minimo `4` ore. Quei numeri non sono in questo CSV.

## Come si calcola il prezzo

Il listino non ha due prezzi salvati, feriale e weekend. C’è un solo importo. Il weekend è una regola del codice.

1. Si parte dal netto.
   - A serata: `eventPrice`.
   - A serata per fascia di invitati: la prima fascia di `guestPriceTiers` che copre il gruppo. Se il gruppo è più grande dell’ultima fascia, si usa l’ultima.
   - A persona: `personPrice` moltiplicato per gli invitati.
   - Se non c’è un prezzo a serata né a persona, si usa `hourlyPrice` moltiplicato per le ore.
2. Se c’è `vatRate`, si aggiunge l’IVA: `netto × (1 + aliquota)`, arrotondata al centesimo (`src/lib/vat.ts`, `getLocationListBaseCost` in `src/lib/location-publish-form.ts`).
3. Venerdì, sabato e domenica: quel totale si moltiplica per `1,2` e si arrotonda all’euro (`WEEKEND_PRICE_MULTIPLIER` in `src/lib/location-date-price.ts`). Senza una data, il moltiplicatore resta `1`.
4. I drink, se richiesti, si sommano a parte (`src/lib/drinks-quote.ts`): drink `prezzo × drink a persona × invitati`, oppure open bar `prezzo × invitati`, più l’IVA dei drink. In demo le card non aggiungono i drink.
5. Gli extra del catalogo generale (DJ, torta, ecc. scelti nel preventivo, non i servizi del locale) si sommano solo nel preventivo, non nel prezzo base della card.

La card di Esplora e della Home (`src/lib/location-preview-price.ts`) usa questa stessa formula su una finestra fissa `18:00–23:00`. Senza criteri, gli invitati sono `10`. Poi la card arrotonda il risultato alle centinaia (`src/components/explore/location-card.tsx`). Il preventivo nella scheda del locale (`calculateBookingQuote` in `src/lib/location.ts`) mostra invece l’importo esatto. In demo, solo quel preventivo viene allargato di 150 € sopra e sotto (`src/lib/demo/price.ts`).

### Esempio: La Vittorina

Listino salvato: `1.200` € a serata, netto, IVA `22%`. Non dipende dagli invitati.

- Feriale, IVA inclusa: `1.200 × 1,22 = 1.464` €.
- Weekend: `arrotonda(1.464 × 1,2) = 1.757` €.
- Card senza una data scelta: `1.464` arrotondato alle centinaia, quindi `1.500` €.
- Card con un venerdì, per esempio il 20 novembre 2026: `1.757` arrotondato alle centinaia, quindi `1.800` €.
- Nella scheda del locale il preventivo feriale resta `1.464` €. In demo quella cifra diventa la fascia `1.314–1.614` €.

I drink di La Vittorina (6 € netti a drink e 16 € netti di open bar a persona, IVA 10%) non entrano in questi numeri finché non si scelgono le bevande. Sulla card, sotto il prezzo, c’è la riga «prezzo indicativo». Nella scheda e nel preventivo: «Prezzi indicativi: il prezzo finale lo conferma il locale.»

## Cose mancanti o strane

- Il database non ha locali: zero righe in `listings`, quindi zero bozze e zero schede pubblicate dal gestore. I 9 locali visibili sono tutti di esempio.
- Nessun locale ha la capienza minima.
- Capienza massima `0` (non indicata: il filtro invitati non li esclude e li mette dopo quelli con capienza adatta): La Vittorina, Castello della Rovere, The Beach, Spazio Docks, Castello di Montaldo. Capienza indicata: Villa Sassi 220, Palazzo Ceriana 180, Spazio Nuvola 9 80, Cheers Bistrot Superga 30.
- Le etichette zona a Torino sono «Torino · zona». Fuori Torino resta solo il comune: Moncalieri, Vinovo, Montaldo Torinese.
- Coordinate `0, 0` su tutti e 9: la mappa non ha un punto reale.
- Superficie, posti auto e ore minime sono `0` su tutti e 9.
- Nessuna email e nessun telefono del gestore: la lista fissa non li prevede e non c’è un `owner_id`.
- Nessuna parola chiave salvata.
- Orari veri, con un’ora, ci sono solo per alcuni locali (per esempio chiusura all’01:30, oppure `18:30–02:00`). Gli altri non hanno una fascia.
- Drink assenti su: Villa Sassi, The Beach, Spazio Nuvola 9, Spazio Docks, Palazzo Ceriana, Cheers Bistrot Superga. Castello di Montaldo mette le bevande illimitate tra gli extra inclusi, non in `drinksPricing`.
- La Vittorina e Castello della Rovere condividono lo stesso blocco prezzo (`QUOTE_TERMS` nel file): stessa sala da `1.200` € netti, stessi drink, stessa caparra `439,20` €, stessi extra (cena, cocktail, DJ, luci, SIAE). Sono due locali diversi con un listino copiato.
- Open bar di La Vittorina e Castello della Rovere: `16` € netti a persona. Il drink singolo resta `6` € netti.
- The Beach, Cheers e Castello di Montaldo sono a persona. Senza invitati scelti la card mostra il prezzo a persona (The Beach: `22 € a persona`). Con gli invitati indicati mostra il totale e sotto «per N invitati».
- Le foto ci sono (da 3 a 5 per locale) e sono file locali, non link esterni. Nessun locale è senza foto.
- Non ho trovato doppioni di nome. L’unico doppione è il listino condiviso tra La Vittorina e Castello della Rovere.
