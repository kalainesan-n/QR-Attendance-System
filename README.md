# QR-Based Geo-Tagged Attendance Management System

A full-stack web app that verifies attendance using QR codes and GPS geofencing, instead of a plain sign-in sheet or a roll call. Built for the NSCC technical club recruitment task (Task 2). I put together the backend, database, frontend, and deployment over about three days of pretty heads-down work.

## Why this exists

Roll calls and paper sign-in sheets don't actually prove someone was at the venue — it's trivial to sign in for a friend who isn't there. This project adds a second layer of verification on top of the QR code: it checks that the attendee's device is physically within a set radius of the event location before marking them present. If the QR is valid but the GPS distance is too far, the check-in gets rejected.

**Flow, at a high level:**

1. Organizer creates an event with a venue location and a geofence radius (in meters).
2. The app generates a QR code tied to that event's ID.
3. Attendee scans the QR with the app's built-in scanner.
4. The browser grabs the attendee's GPS coordinates.
5. The backend calculates the distance between attendee and venue (Haversine formula) and compares it to the radius.
6. Within radius → marked Present. Outside → rejected, and the attendee sees why.

## Features

**Organizers** can sign up, log in, create/edit/delete their own events, set venue coordinates and geofence radius, generate the event QR, and watch attendance come in live as people check in. They can also export the attendance list as a CSV afterward.

**Attendees** can sign up, log in, optionally add their registration ID, browse upcoming events, scan the QR with their camera, and get immediate feedback — present, outside the geofence, or already checked in.

A few things worth calling out on the implementation side:

- **Auth** — JWT-based sessions, passwords hashed with bcrypt (cost factor 10), never stored or returned in plain text.
- **Ownership checks** — an organizer can't edit or delete another organizer's event; this is enforced on the backend, not just hidden in the UI.
- **Geofencing** — the actual distance check happens server-side using the Haversine formula (great-circle distance between two lat/lng points), so it can't be spoofed by messing with the frontend.
- **No duplicate check-ins** — the Attendance collection has a compound unique index on `userId + eventId`, so the database itself rejects a second check-in attempt for the same event.
- **Live updates** — Socket.io pushes new check-ins to the organizer's dashboard in real time (rooms scoped per event, `event:<eventId>`), so there's no need to refresh the page to see who just checked in.

## Tech stack

**Frontend:** React + Vite, Axios, React Router, `html5-qrcode` for scanning, `socket.io-client`, browser Geolocation API.

**Backend:** Node.js + Express, JWT (`jsonwebtoken`), bcrypt, Socket.io, `qrcode` for QR generation, dotenv for config.

**Database:** MongoDB Atlas with Mongoose as the ODM — handles the User, Event, and Attendance schemas, validation, and relationships.

**Deployment:** Frontend on Vercel, backend on Render, database on MongoDB Atlas.

## System architecture

```
Browser (phone/laptop)
        │
        ▼
React + Vite frontend  ──(Vercel)
        │  HTTPS / REST
        ▼
Node.js + Express backend  ──(Render)
   - JWT auth
   - Event & attendance routes
   - QR generation
   - Geofencing logic
   - Socket.io
        │  Mongoose
        ▼
MongoDB Atlas
```

## Project structure

```
QR-Attendance-System/
├── backend/
│   ├── middleware/
│   │   ├── auth.js
│   │   └── requireOrganizer.js
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── Event.js
│   │   └── User.js
│   ├── routes/
│   │   ├── attendance.js
│   │   ├── auth.js
│   │   └── events.js
│   ├── utils/
│   │   ├── haversine.js
│   │   └── qr.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AttendeeList.jsx
│   │   │   ├── EventForm.jsx
│   │   │   ├── LiveStats.jsx
│   │   │   ├── QRModal.jsx
│   │   │   └── QRScanner.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── AttendeeDashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── OrganizerDashboard.jsx
│   │   │   └── Signup.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

## API endpoints

**Auth**
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a user |
| POST | `/api/auth/login` | Public | Log in, get JWT |
| GET | `/api/auth/me` | Authenticated | Get current user |

**Events**
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/events` | Authenticated | List events |
| GET | `/api/events/:id` | Authenticated | Get event details |
| POST | `/api/events` | Organizer | Create event |
| PUT | `/api/events/:id` | Event owner | Update event |
| DELETE | `/api/events/:id` | Event owner | Delete event |
| GET | `/api/events/:id/qr` | Event owner | Generate QR |

**Attendance**
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/attendance/checkin` | Authenticated | Validate location & check in |
| GET | `/api/attendance/:eventId` | Event owner | View attendance |
| GET | `/api/attendance/:eventId/csv` | Event owner | Export attendance as CSV |

**Health**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Confirms backend + DB connection are up |

## Running it locally

You'll need Node.js 18+, npm, Git, and either a local MongoDB instance or a MongoDB Atlas connection string.

```bash
git clone https://github.com/kalainesan-n/QR-Attendance-System.git
cd QR-Attendance-System
```

**Backend:**
```bash
cd backend
npm install
# add MONGODB_URI, JWT_SECRET, CLIENT_URL to a .env file
node server.js
# runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:5173
```

## Deployment

**Backend (Render):** root directory `backend`, build command `npm install`, start command `node server.js`. Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`. Render assigns the port automatically.

**Frontend (Vercel):** framework Vite, root directory `frontend`, build command `npm run build`, output directory `dist`. Environment variable: `VITE_API_URL` pointing at the deployed Render backend.

HTTPS matters here specifically because camera and geolocation permissions in the browser generally require a secure context — this won't work reliably over plain HTTP.

**Never commit `.env` files, your MongoDB URI, or your JWT secret to GitHub.**

## What I tested

Auth (signup/login for both roles, protected routes, password hashing), event CRUD and ownership protection, QR generation and scanning, GPS-based check-in both inside and outside the geofence, duplicate check-in rejection, CSV export, and Socket.io updates reaching the organizer dashboard live. Also did a production build and ran through the deployed version end-to-end on my phone rather than just testing on localhost.

## Known limitations

GPS accuracy varies by device and gets worse indoors. Both camera and location permissions have to be granted by the attendee, and the app needs an active internet connection — there's no offline mode. Socket.io reconnection is fairly basic. And to be honest about the core assumption: GPS-based geofencing raises the bar against proxy attendance a lot, but it isn't a perfect anti-spoofing guarantee — a sufficiently motivated person with a fake-GPS tool could still get around it. That felt like a reasonable tradeoff for the scope of this project.

## What I'd add next

Admin-level analytics, better handling of flaky network conditions, map-based venue selection when creating an event instead of typing coordinates by hand, and probably some basic anti-spoofing checks (e.g. flagging GPS accuracy that's suspiciously low).

## Links

- **GitHub:** https://github.com/kalainesan-n/QR-Attendance-System
- **Live app:** https://qr-attendance-system-zeta-two.vercel.app/login
- **Backend health check:** https://qr-attendance-system-oalb.onrender.com
