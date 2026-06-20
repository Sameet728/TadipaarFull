# 🚔 Project Tadipaar — Expo Go App

Maharashtra Police Externment Monitoring App

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set your backend IP
Open `src/api/api.js` and change `BASE_URL` to your server's IP:
```js
const BASE_URL = 'http://192.168.YOUR.IP:5000/api';
```
> Use your computer's LAN IP (run `ipconfig` on Windows / `ifconfig` on Mac/Linux).
> Your phone and computer must be on the same WiFi network.

### 3. Start Expo
```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## Required Backend Endpoints

| Method | Path                    | Description                       |
|--------|-------------------------|-----------------------------------|
| POST   | /criminal/login         | Login → returns `{ token, criminal }` |
| GET    | /criminal/:id           | Get criminal profile              |
| POST   | /tadipaar/checkin       | Submit selfie + GPS (multipart)   |
| GET    | /tadipaar/history       | Check-in history list             |
| GET    | /tadipaar/my-areas      | Restricted areas + order info     |

---

## Notes

- **Google Maps API key** — for production Android builds, add your key
  in `app.json` → `android.config.googleMaps.apiKey`.
  In Expo Go development mode, maps work without a key.
- **Permissions** — Camera + Location prompts appear automatically on first use.
- **GPS accuracy** — Check-in rejects if GPS accuracy > 150 m. 
  Ask user to go outdoors / near a window.

---

## Stack
- Expo SDK 51 / React Native 0.74
- React Navigation 6 (Stack + Bottom Tabs)
- expo-image-picker, expo-location
- react-native-maps
- axios, AsyncStorage
