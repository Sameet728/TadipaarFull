# Project Tadipaar API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header.
`Authorization: Bearer <token>`

## 1. Criminal Endpoints (`/api/criminal`)

### `POST /login`
Authenticate a registered criminal.
**Body:** `loginId`, `password`
**Returns:** Token and Profile data.

### `POST /register` (Protected, Admin)
Register a new criminal into the system. Supports multipart/form-data for photo uploads.
**Body:** `name`, `loginId`, `password`, `policeStationId`, `photo` (File), etc.
**Returns:** Created criminal ID and details.

### `GET /:id` (Protected)
Retrieve the criminal profile. Only the logged-in criminal can fetch their own profile.
**Returns:** Full profile data.

## 2. Tadipaar Check-In Endpoints (`/api/tadipaar`)

### `POST /checkin` (Protected)
Record a daily check-in with facial verification.
**Body (FormData):** `selfie` (File), `latitude`, `longitude`, `accuracy`
**Returns:** `faceCheckStatus`, `compliant` (Boolean).

### `GET /history` (Protected)
Get check-in history for the logged-in criminal.
**Returns:** Array of past check-ins.

### `GET /my-areas` (Protected)
Get assigned restricted areas for the logged-in criminal.
**Returns:** Array of polygons or circles.

## 3. Admin Endpoints (`/api/admin`)

### `POST /auth/login`
Authenticate an admin/officer.
**Body:** `username`, `password`
**Returns:** Token and Admin role.

### `GET /dashboard` (Protected, Admin)
Get system overview and statistics.
**Returns:** `totalCriminals`, `checkInsToday`, `missedCheckIns`, `violationsToday`.

### `GET /criminals` (Protected, Admin)
List all criminals with compliance summaries. Supports pagination and filtering by zone/ps.
**Returns:** Array of criminals and compliance counts.

### `POST /areas` (Protected, Admin)
Assign a restricted area to a criminal.

## Health
- `GET /health`: Basic healthcheck and DB connectivity.
- `GET /metrics`: RAM, CPU, Uptime, and connection stats.
