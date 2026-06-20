# Deployment Guide

## 1. System Requirements
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- PM2 (Global install: `npm install -g pm2`)

## 2. Infrastructure Setup (Single Server)
1. Provision an Ubuntu VM (e.g., AWS EC2, DigitalOcean Droplet).
2. Install Node.js, NGINX, and PostgreSQL.

## 3. Database Initialization
1. Create a PostgreSQL database and user.
2. Run `schema.sql` to initialize tables.
3. Run `prod_indexes.js` and `prod_constraints.js` to build constraints.

## 4. Environment Variables
Copy `Backend/.env.example` to `Backend/.env` and update the values.
Ensure `DATABASE_URL` and `JWT_SECRET` are securely populated.

## 5. Starting the Backend
1. Navigate to the `Backend` directory.
2. Run `npm install --production`
3. Start via PM2: `pm2 start ecosystem.config.js --env production`
4. PM2 will automatically cluster the application based on available CPU cores and restart it if it crashes.

## 6. Frontend Deployment
1. Navigate to the `Frontend` directory.
2. Run `npm install`
3. Update `.env` with the Production API URL.
4. Run `npm run build`
5. Serve the `dist` folder using NGINX.

## 7. Mobile App Deployment
1. Build the APK via Expo: `eas build -p android --profile production`
2. Distribute via Google Play or Direct APK Download.
