# Project Tadipaar - Backend API

Node.js + Express + PostgreSQL + Cloudinary

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with your credentials
node server.js
```

## Environment Variables

| Variable               | Where to get it                        |
|------------------------|----------------------------------------|
| DATABASE_URL           | Supabase/Neon/Railway connection str   |
| JWT_SECRET             | Any 32+ char random string             |
| CLOUDINARY_CLOUD_NAME  | cloudinary.com Dashboard               |
| CLOUDINARY_API_KEY     | cloudinary.com Dashboard               |
| CLOUDINARY_API_SECRET  | cloudinary.com Dashboard               |
| PORT                   | Default 5000                           |

## API Endpoints

### Criminal
| Method | Path                 | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | /api/criminal/login  | No   | Login                |
| GET    | /api/criminal/:id    | Yes  | Get profile          |

### Tadipaar
| Method | Path                       | Auth | Description         |
|--------|----------------------------|------|---------------------|
| POST   | /api/tadipaar/checkin      | Yes  | Submit selfie+GPS   |
| GET    | /api/tadipaar/history      | Yes  | Check-in history    |
| GET    | /api/tadipaar/my-areas     | Yes  | Restricted areas    |
| GET    | /api/tadipaar/checkin/today| Yes  | Today status        |

### Admin
| Method | Path                           | Description         |
|--------|--------------------------------|---------------------|
| POST   | /api/admin/criminal/register   | Create account      |
| POST   | /api/admin/areas               | Add restricted area |
| GET    | /api/admin/checkins            | All check-ins       |
| PATCH  | /api/admin/checkin/:id/review  | Approve/reject      |

## Test Login
```
loginId:  EXT001
password: password123
```
