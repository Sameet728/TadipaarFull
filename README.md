# Project Tadipaar

Government-grade monitoring system for tracking externees (Tadipaar subjects) using Facial Recognition and GPS Geofencing. Developed for the Maharashtra Police force.

## Project Structure
- **/Backend**: Node.js, Express, PostgreSQL API Server. Implements strict rate-limiting, PM2 clustering, transactions, Zod request validation, and Cloudinary integrations.
- **/Frontend**: React.js Dashboard for Police Commissioners, DCPs, ACPs, and Station Officers to monitor real-time check-ins and violations.
- **/App**: React Native mobile application used by the externees to perform their daily mandatory check-ins with offline resiliency and background location tracking.

## Technical Stack
- **Database**: PostgreSQL (Relational constraints, Cascade deletes, Indexes)
- **Backend**: Node.js + Express (JWT Auth, Helmet, PM2, Zod)
- **Frontend**: React + Vite (TailwindCSS)
- **Mobile**: React Native + Expo (AWS Rekognition / Face Verification)

## Documentation Guides
- **[API Documentation](API_DOCS.md)**
- **[Database Schema](DATABASE_SCHEMA.md)**
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**
- **[Backup & Recovery Guide](RECOVERY_GUIDE.md)**

## Production Stability Features
- Payload Protections (Max 5MB JSON)
- Graceful Shutdowns and Pool Drainage
- Multi-table SQL Transactions (Rollback on failure)
- UI and Mobile Double-Submission Prevention
- Memory Leak Prevention via AbortControllers
- Daily Database Backups

*Project optimized for single-server 99.9% uptime with 500-1000 concurrent users.*
