# VibeUp — Availability request flow (export for Claude)

Snapshot of the code that handles:

1. **Organizer** sends an availability request for a location (or service)
2. **Manager** accepts or declines
3. **Organizer** confirms → event/booking is created

This folder is a **copy** for sharing. Source of truth remains under `src/` and `docs/` in the main repo.

---

## State machine

```
pending_manager
    ├─(manager accept)──► pending_user_confirm ─(user confirm)─► confirmed → row in `bookings`
    └─(manager decline)─► declined
```

Also: `cancelled` from pending states (requester / admin).

Types: `types/availability-request.ts`

---

## End-to-end path

### A) User sends request

| Step | File | What it does |
|------|------|----------------|
| UI location | `components/location/location-detail-view.tsx` | Builds `AvailabilityEventPayload`, calls `sendAvailabilityRequest` |
| UI summary CTA | `components/location/booking-summary.tsx` | Button states: send / pending_manager / … |
| UI service (parity) | `components/services/service-profile-view.tsx` | Same flow with `requestKind: "service"` |
| Orchestration | `context/availability-request-context.tsx` | `sendAvailabilityRequest` → cloud or local |
| HTTP client | `lib/client.ts` | `POST /api/bookings/requests` |
| API | `api/bookings/requests/route.ts` | Auth + `createAvailabilityRequest` |
| DB | `server/repositories/bookings.ts` | Insert into `availability_requests` status=`pending_manager` |

### B) Manager responds

| Step | File | What it does |
|------|------|----------------|
| UI | `components/screens/business-notifications-screen.tsx` | Accept / Decline buttons |
| Context | `context/availability-request-context.tsx` | `acceptAvailabilityRequest` / `declineAvailabilityRequest` |
| HTTP | `lib/client.ts` | `PATCH /api/bookings/requests/:id` `{ action: "accept" \| "decline" }` |
| API | `api/bookings/requests/id.route.ts` | Maps action → status |
| DB | `server/repositories/bookings.ts` | `updateAvailabilityRequestStatus` (manager-only for accept/decline) |

Action map in API:

- `accept` → `pending_user_confirm`
- `decline` → `declined`
- `confirm` → `confirmed`
- `cancel` → `cancelled`

### C) User confirms after manager accept

| Step | File | What it does |
|------|------|----------------|
| UI modal | `components/availability/confirm-availability-modal.tsx` | User confirms / snoozes |
| Context | `context/availability-request-context.tsx` | `confirmAvailabilityRequest` |
| API | `api/bookings/requests/id.route.ts` | On `confirm`, calls `createBookingFromRequest` |
| DB | `server/repositories/bookings.ts` | Update request + insert `bookings` (+ payments helper as needed) |

Money helpers (deposit 30% + fee 5%): `lib/booking-money.ts`

---

## SQL

- `docs/BOOKINGS_SCHEMA.sql` — tables + RLS for `availability_requests`, `bookings`, `booking_payments`
- `docs/FIX_TABLE_GRANTS.sql` — GRANT to `service_role` / `authenticated` (required or API fails with permission / opaque key errors)

---

## Cloud vs local

In `availability-request-context.tsx`, when `cloudSyncEnabled` is true (Supabase Auth), all mutations go through `/api/bookings/*`. Otherwise requests stay in `localStorage` (`vibeup-availability-requests-v1`) for demo/offline.

---

## Original paths in the repo

```
src/types/availability-request.ts
src/context/availability-request-context.tsx
src/lib/bookings/client.ts
src/lib/booking-money.ts
src/components/location/location-detail-view.tsx
src/components/location/booking-summary.tsx
src/components/services/service-profile-view.tsx
src/components/screens/business-notifications-screen.tsx
src/components/availability/confirm-availability-modal.tsx
src/app/api/bookings/requests/route.ts
src/app/api/bookings/requests/[id]/route.ts   → copied here as id.route.ts
src/server/repositories/bookings.ts
docs/BOOKINGS_SCHEMA.sql
docs/FIX_TABLE_GRANTS.sql
```

---

## How to share

Zip this folder:

```bash
cd /Users/lorenzocappabianca/VibeUp
zip -r availability-request-flow.zip share/availability-request-flow
```

Or attach `share/availability-request-flow/` to Claude. Start with this README, then `context/` + `server/repositories/bookings.ts` + `api/`.
