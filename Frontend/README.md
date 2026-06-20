# Tadipaar Admin Panel — Vite + React

## Setup
```bash
npm install
npm run dev
```

Open http://localhost:5173

## Login
Select your role (CP/DCP/ACP/PS), enter your name, select jurisdiction, and enter the ADMIN_KEY from your backend .env file.

## Add ADMIN_KEY to backend
In TadipaarBackend/.env:
```
ADMIN_KEY=your_secret_admin_key_here
```

Then uncomment the adminOnly middleware in routes/admin.routes.js.

## Update API URL
Edit src/api/api.js and set BASE_URL to your backend URL.
