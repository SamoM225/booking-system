# Booking

Online booking for a small salon: clients book a service with a specialist, the team manages appointments, working hours and time off in an admin with a calendar.

- **Backend**: Express 5, Prisma 7 (PostgreSQL), sessions in Redis, Zod validation, Nodemailer
- **Frontend**: Nuxt 4, Nuxt UI 4, Tailwind CSS 4, Pinia

## Features

- **Public booking** – pick a category, service, specialist and a free time slot. Slots respect working hours, existing bookings, business closures and the specialist's unavailability.
- **Admin** – overview, bookings, services and categories, team, weekly working hours and business closures.
- **Calendar** (`/admin/calendar`) – day, week and month views.
  - Drag a booking or an unavailability to another time, day or (admins) specialist; drag the edges of an unavailability to resize it.
  - Press and drag on empty space to select a range and add a booking or an unavailability; in the month view drag over several days to block them all day.
  - Conflicts are refused before the drop when the calendar can see them, otherwise the server rejects the change and the block slides back.
  - Works with mouse, touch (long-press to drag) and keyboard (`Alt` + arrows on a focused block).
- **Roles** – an *admin* sees and manages everyone. A *worker* (specialist) only signs in to the calendar and sees and changes only their own bookings and unavailability. The backend enforces this on every request.
- **Team invitations** – an admin invites a person by e-mail. The one-time link is valid for 7 days; the person chooses a password and is signed in. Pending invitations can be resent or revoked.

## Getting started

Requirements: Node.js 22+, Docker.

```bash
# PostgreSQL (5434), Redis (6379) and Mailpit (SMTP 1025, inbox http://localhost:8025)
npm run services:up

cd backend
npm install
cp .env.example .env   # or create it, see below
npm run db:deploy      # apply migrations
npm run db:seed        # demo services and team
npm run admin:make -- you@example.com   # after registering on /register

cd ../frontend
npm install

cd ..
npm run dev            # backend and frontend on free ports (printed in the console)
```

`backend/.env`:

```dotenv
DATABASE_URL="postgresql://app:app@localhost:5434/booking_cv"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="change-me"
PORT=3020
# Optional
APP_URL="http://localhost:3000"     # used for links in e-mails, set by `npm run dev`
SMTP_HOST="127.0.0.1"               # Mailpit by default
SMTP_PORT=1025
MAIL_FROM="Booking <no-reply@booking.local>"
```

## E-mail

In development every e-mail goes to [Mailpit](https://mailpit.axllent.org/), nothing leaves your machine. Open http://localhost:8025 to read them.

```bash
cd backend
npm run mail:check -- you@example.com   # sends a test e-mail and checks Mailpit received it
```

For a real SMTP server set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`.

## Tests

```bash
cd backend
npm test
```

Integration tests run the API against a separate `booking_cv_test` database (created and migrated automatically, see `backend/.env.test`). E-mails are kept in memory, so no SMTP server is needed.

## Project structure

```
backend/
  prisma/                 schema and migrations
  src/modules/
    administration/       admin API, one folder per resource
    calendar/             calendar API for admins and workers
    invitations/          invite flow (public part)
    booking/scheduling.ts rules for free slots and bookable times
    public/               public booking API
  src/lib/mailer.ts       SMTP / in-memory mail transport
frontend/app/
  pages/admin/            admin pages, calendar.vue
  components/calendar/    time grid, month grid, editors
  composables/            API access, calendar data, pointer gestures
scripts/dev.mjs           starts backend and frontend together
```
