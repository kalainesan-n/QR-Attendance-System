# QR-Based Geo-Tagged Attendance Management System

A full-stack web application designed for campus clubs, seminars, and events to conduct fraud-resistant, location-validated attendance using dynamic QR code generation, browser geolocation, Haversine spherical distance calculation, and real-time live updates via WebSockets (Socket.io).

---

## 📌 Project Overview

Traditional attendance methods (roll calls, paper sign-in sheets, static links) are prone to proxy attendance, buddy punching, and record-keeping errors. This system solves that problem through a 2-factor physical presence verification workflow:
1. **Visual Presence**: The attendee must physically scan the event's unique QR code using their device camera.
2. **Geographical Presence**: The attendee's browser GPS coordinates are checked against the event venue coordinates. Only if the attendee is within the configured geofence radius (e.g. 50 meters) is their attendance recorded as `present`.

---

## 🚀 Key Features

### 1. Role-Based Access Control
- **Organizer Role**:
  - Sign up and log in securely.
  - Create, view, update, and delete events (ownership protected).
  - Configure event coordinates (latitude, longitude) and geofence radius (in meters).
  - View and download high-resolution QR codes for each event.
  - Live real-time dashboard updating instantly as attendees check in without manual refresh.
  - Live statistics: Total attempts, verified attendees present, and attendance rate percentage.
  - Export attendance data as RFC 4180-compliant CSV.
- **Attendee Role**:
  - Sign up and log in (with optional college Registration ID).
  - Browse upcoming campus events.
  - Integrated in-browser camera QR code scanner.
  - Automatic geolocation acquisition with clear status feedback (Success, Outside Geofence, Already Checked In).
  - Database-enforced duplicate prevention (one check-in per user per event).

### 2. Geofenced Validation
- Uses the **Haversine formula** to compute great-circle distance between the user's GPS fix and the venue location.
- Compares computed distance against the organizer's specified radius threshold.

### 3. Real-Time Dashboard
- Powered by **Socket.io** event rooms (`event:<eventId>`).
- Check-ins trigger instant broadcasts to connected organizers without polling.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, React Router 6, Axios, HTML5-QRCode, Socket.io-client
- **Backend**: Node.js, Express 5, Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Security & Auth**: JSON Web Tokens (JWT), bcrypt password hashing
- **QR Engine**: `qrcode` (backend generation) & `html5-qrcode` (frontend camera scanner)
- **Deployment**: Render (Backend Web Service) & Vercel (Frontend Static Host)

---

## 📁 Folder Structure

```text
QR-Attendance-System/
├── backend/
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   └── requireOrganizer.js   # Role-checking middleware
│   ├── models/
│   │   ├── Attendance.js         # Attendance schema with unique compound index
│   │   ├── Event.js              # Event schema with geofence settings
│   │   └── User.js               # User schema with bcrypt-hashed passwords
│   ├── routes/
│   │   ├── attendance.js         # Check-in, attendee list, and CSV export routes
│   │   ├── auth.js               # Signup, login, and profile routes
│   │   └── events.js             # Event CRUD & QR code generation routes
│   ├── utils/
│   │   ├── haversine.js          # Pure spherical distance calculation
│   │   └── qr.js                 # QR code to data URL generator
│   ├── db.js                     # Mongoose connection logic
│   ├── server.js                 # Express app + HTTP server + Socket.io gateway
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AttendeeList.jsx  # Table with real-time Socket.io listener
│   │   │   ├── EventForm.jsx     # Reusable create/edit event form
│   │   │   ├── LiveStats.jsx     # Attendance metric cards
│   │   │   ├── QRModal.jsx       # QR viewer and image download modal
│   │   │   └── QRScanner.jsx     # In-browser camera scanner
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global session state & persistence
│   │   ├── pages/
│   │   │   ├── AttendeeDashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── OrganizerDashboard.jsx
│   │   │   └── Signup.jsx
│   │   ├── api.js                # Axios instance with auth interceptor
│   │   ├── App.jsx               # Route definitions & role protection
│   │   ├── index.css             # Clean, responsive styling
│   │   └── main.jsx              # React application entry point
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
└── README.md
```

---

## 🔑 Environment Variables

> **Important**: Never commit actual secrets or credentials to source control. Configure these in your local `.env` files or hosting provider settings.

### Backend (`backend/.env`)
- `PORT`: Port on which the backend server runs (e.g. `5000`)
- `MONGODB_URI`: MongoDB connection string (local or MongoDB Atlas URI)
- `JWT_SECRET`: High-entropy random secret key for signing JWT tokens
- `CLIENT_URL`: URL of the frontend client for CORS and WebSocket origins (e.g. `http://localhost:5173`)
- `LLM_API_KEY`: *(Optional bonus phase)* API key for AI feature
- `LLM_API_URL`: *(Optional bonus phase)* LLM completions endpoint
- `LLM_MODEL`: *(Optional bonus phase)* Model identifier

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Root URL of the running backend API (e.g. `http://localhost:5000`)

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new user (`name`, `email`, `password`, `role`, optional `registrationId`) |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns JWT token and user profile |
| `GET` | `/api/auth/me` | Authenticated | Retrieve profile for currently logged-in user |

### Events (`/api/events`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Authenticated | List events (Organizers see their own; Attendees see all upcoming) |
| `GET` | `/api/events/:id` | Authenticated | Fetch a single event by ID |
| `POST` | `/api/events` | Organizer | Create a new event with location and geofence radius |
| `PUT` | `/api/events/:id` | Event Owner | Update existing event |
| `DELETE` | `/api/events/:id` | Event Owner | Delete event |
| `GET` | `/api/events/:id/qr` | Event Owner | Generate and return base64 Data URL of event QR code |

### Attendance (`/api/attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/attendance/checkin` | Authenticated | Validate location against geofence and record attendance |
| `GET` | `/api/attendance/:eventId` | Event Owner | Retrieve attendee records and live statistics |
| `GET` | `/api/attendance/:eventId/csv` | Event Owner | Download attendance records as a `.csv` file |

### Health Check
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Check server and database status (`{ ok: true, database: "connected" }`) |

---

## 🧠 Core Concepts Explained Simply

### 1. JWT Authentication
**Plain English**: When you log in with your email and password, the server signs a small digital "passport" called a JSON Web Token (JWT) using a secret key only the server knows. The client stores this token and sends it in the HTTP `Authorization` header with every request. The server verifies the signature without needing to query the database each time.

### 2. bcrypt Password Hashing
**Plain English**: Storing raw passwords in a database is dangerous. `bcrypt` takes the plain password, blends it with random characters (called salt), and hashes it thousands of times through a one-way mathematical function. Even if an attacker accesses the database, they cannot reverse the hash back into the password. During login, bcrypt hashes the entered password with the same salt to verify if it matches.

### 3. Mongoose Models & Schemas
**Plain English**: MongoDB is flexible and doesn't enforce strict table shapes by default. Mongoose acts as a blueprint layer (Schema) defining exact field types, default values, validations, and references (like linking an event to its organizer), turning raw documents into structured JavaScript objects.

### 4. Haversine Distance Calculation
**Plain English**: The Earth is a sphere, so straight Euclidean geometry (`distance = sqrt(dx² + dy²)`) produces massive errors on GPS coordinates. The Haversine formula uses trigonometry on a sphere of radius $R \approx 6,371\text{ km}$ to compute the true "great-circle" distance between two coordinate pairs $(\text{lat}_1, \text{lon}_1)$ and $(\text{lat}_2, \text{lon}_2)$ in meters.

$$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
$$d = R \cdot \Delta\sigma$$

### 5. Geofence Comparison
**Plain English**: A geofence is an invisible circle around the venue. The organizer sets a radius (for example, $50\text{ meters}$). When an attendee checks in, the server calculates their distance from the venue using the Haversine formula. If $\text{distance} \le \text{geofenceRadius}$, the attendance is approved as `present`. Otherwise, it is marked as `rejected`.

### 6. QR Generation and Validation
**Plain English**: The organizer's server converts the event's unique MongoDB ID into a 2D matrix barcode (QR code) encoded as a base64 PNG data URL. The attendee's device camera reads the code, extracts the event ID string, and sends it along with the attendee's live GPS coordinates to the server for verification.

### 7. Duplicate Attendance Prevention
**Plain English**: To ensure an attendee cannot scan twice or check in for friends, MongoDB enforces a compound unique index on `{ userId: 1, eventId: 1 }` in the `Attendance` collection. If the database detects a second insert for the same user and event, it throws a duplicate key error (`E11000`), which the API catches and returns as an HTTP `409 Conflict`.

### 8. Socket.io Real-Time Updates
**Plain English**: Instead of the organizer refreshing the page every few seconds (polling), Socket.io opens a persistent, bidirectional WebSocket channel. Organizers join a virtual room for their event (`event:<eventId>`). Whenever an attendee checks in, the server broadcasts an `attendance:new` event exclusively to that room, immediately updating the attendee list and live stats.

---

## 💻 Running Locally

### Prerequisites
- Node.js (v18 or higher)
- A running MongoDB instance (Local MongoDB Community Server or free MongoDB Atlas cluster)

### 1. Clone the repository
```bash
git clone <repository-url>
cd QR-Attendance-System
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `backend/.env` with your values:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/qr-attendance
JWT_SECRET=your_super_secret_random_key_here
CLIENT_URL=http://localhost:5173
```
Start the backend:
```bash
npm run dev
# Server running on port 5000
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
cp .env.example .env
```
Make sure `frontend/.env` contains:
```env
VITE_API_URL=http://localhost:5000
```
Start the frontend development server:
```bash
npm run dev
# Local: http://localhost:5173/
```

### 4. Access the Application
Open `http://localhost:5173` in your browser.
- Create an **Organizer** account to create events, set geofence boundaries, and project the QR code.
- Create an **Attendee** account on your phone or browser to scan the QR code and check in.

---

## 🌐 Deployment Instructions

### Backend (Render)
1. Create a **Web Service** on [Render.com](https://render.com).
2. Connect your Git repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In the Render dashboard, add the Environment Variables:
   - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
   - `JWT_SECRET`: `<Random 32+ character string>`
   - `CLIENT_URL`: `<Your Vercel frontend URL, e.g. https://your-app.vercel.app>`
   - `PORT`: `5000` (or leave default assigned by Render)
5. Ensure your MongoDB Atlas cluster Network Access allows connections from anywhere (`0.0.0.0/0`) so Render instances can connect.

### Frontend (Vercel)
1. Create a new project on [Vercel.com](https://vercel.com).
2. Connect your Git repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In Vercel Project Settings -> Environment Variables, add:
   - `VITE_API_URL`: `<Your deployed Render backend URL, e.g. https://your-backend.onrender.com>`
5. Deploy.

---

## 📸 Screenshots & Demonstrations

| Organizer Dashboard | Attendee Scanner & Geolocation Feedback |
|:---:|:---:|
| *(Screenshot Placeholder: Organizer managing events and viewing live statistics)* | *(Screenshot Placeholder: Camera scanner reading QR and displaying check-in badge)* |

| Event QR View | Live Attendee Roster |
|:---:|:---:|
| *(Screenshot Placeholder: QR code modal with download button)* | *(Screenshot Placeholder: Real-time table with present/rejected tags and CSV export)* |

---

## 📄 License
This project is developed for educational and demonstration purposes.
