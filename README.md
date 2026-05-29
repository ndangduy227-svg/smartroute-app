# SmartRoute - Delivery Route Optimization

> **Tối ưu hóa tuyến giao hàng** với công nghệ AI, maps, và route optimization. Kết nối với 5+ nền tảng kinh doanh (Lark, POSCake, KiotViet, Nhanh.vn, Google Sheets).

<div align="center">
<img alt="SmartRoute" src="https://smartroute-app.vercel.app" />
</div>

---

## 🚀 Tính năng chính

### 📲 Quản lý đơn hàng
- **Import từ 5 nền tảng**: Lark Base, POSCake, KiotViet, Nhanh.vn, Google Sheets
- **Upload file**: Excel, CSV, TXT (hỗ trợ mapping cột tự động)
- **Lưu trữ Firestore**: Mỗi user có dữ liệu riêng, an toàn với Firebase Auth

### 🗺️ Bản đồ & Tối ưu hóa
- **TrackAsia GL Maps**: Render bản đồ realtime, hiển thị các điểm giao hàng
- **VRP Optimization**: Thuật toán tối ưu tuyến đi, tính toán khoảng cách, thứ tự điểm dừng
- **User API Key**: Mỗi user có thể config key TrackAsia riêng hoặc dùng default server
- **Connection Test**: Kiểm tra live kết nối API key

### 🔧 Cấu hình tài xế
- **Tạo tuyến giao**: Gán driver, tính tổng khoảng cách, đếm điểm dừng
- **Quản lý batch**: Lưu các batch vào Firestore, xem lịch sử
- **Export**: Sync tuyến về Lark Base hoặc Google Sheets

### 🔐 Bảo mật
- **Firebase Auth**: Google Sign-In (OAuth 2.0)
- **JWT Verification**: Backend verify Firebase token (RS256 + Google JWKS)
- **CORS + Rate Limiting**: API được bảo vệ, giới hạn request
- **Firestore Security Rules**: Per-user data access control
- **API Key Isolation**: TrackAsia key được nhập mã hóa, không lưu frontend

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + TypeScript + Vite
- **Tailwind CSS** + gradient components
- **@react-google-maps/api** / TrackAsia GL JS
- **XLSX** (Excel parsing)
- **Firebase SDK** (auth + Firestore)

### Backend
- **Express.js** (Node.js server)
- **Vercel Serverless Functions** (`api/index.js`)
- **firebase-admin** / **jose** (JWT validation)
- **axios** (API calls to third parties)
- **rate-limit** / **cors** middleware

### External APIs
- **Firebase** (Auth + Firestore DB)
- **TrackAsia** (Maps + VRP optimization)
- **Lark/Feishu Bitable** (Import/export orders)
- **POSCake** (POS system orders)
- **KiotViet** (E-commerce orders)
- **Nhanh.vn** (Marketplace orders)

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js 18+
- npm
- Firebase Project (with Auth + Firestore enabled)
- TrackAsia API Key
- Vercel account (for deployment)

### 2. Clone & Install
```bash
git clone <repo-url>
cd smartroute-app
npm install
```

### 3. Environment Variables
Tạo `.env` file tại root:

```env
# Firebase
FIREBASE_PROJECT_ID=gen-lang-client-0071548909
VITE_FIREBASE_API_KEY=AIzaSyDvHVZS22kZaWTkTwXdOCmjazlWpiscv9w
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0071548909.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0071548909
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0071548909.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=472291181180
VITE_FIREBASE_APP_ID=1:472291181180:web:cb6098c3dfca775d04fff9
VITE_FIREBASE_MEASUREMENT_ID=G-DJG6CGBSM8

# TrackAsia
TRACK_ASIA_API_KEY=<your-trackasia-key>
VITE_TRACK_ASIA_API_KEY=<your-trackasia-key>

# Lark (Optional)
LARK_APP_ID=<your-lark-app-id>
LARK_APP_SECRET=<your-lark-app-secret>
LARK_BASE_ID=<your-lark-base-id>
LARK_TABLE_ID=<your-lark-table-id>
LARK_ROUTES_TABLE_ID=<your-lark-routes-table-id>

# POSCake (Optional)
POSCAKE_API_KEY=<your-poscake-key>
POSCAKE_SHOP_ID=<your-shop-id>

# Server
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Run Locally
```bash
# Frontend (Vite)
npm run dev

# Backend (Express - separate terminal)
npm run dev:server
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

---

## 📚 Project Structure

```
.
├── components/
│   ├── ImportView.tsx          # Platform connection UI (5 cards)
│   ├── ApiKeySettings.tsx      # TrackAsia key config modal
│   ├── MapView.tsx             # TrackAsia GL maps render
│   ├── RoutePlan.tsx           # VRP result display
│   └── ...
├── services/
│   ├── FirestoreService.ts     # Firestore CRUD
│   ├── TrackAsiaService.ts     # TrackAsia API calls
│   └── ...
├── utils/
│   ├── api.ts                  # Frontend API client (with auth)
│   ├── firebase.ts             # Firebase init
│   └── ...
├── api/
│   └── index.js                # Vercel serverless backend
├── server.js                    # Local Express server (mirror of api/index.js)
├── kiotvietService.js          # KiotViet integration
├── nhanhService.js             # Nhanh.vn integration
├── App.tsx                     # Root component
├── types.ts                    # TypeScript interfaces
├── vite.config.ts             # Vite config
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🔌 API Endpoints

All endpoints require Firebase auth token in `Authorization: Bearer <token>` header.

### Order Management
- `GET /api/lark/orders` — Fetch từ Lark Base
- `POST /api/lark/routes` — Sync tuyến về Lark Base
- `GET|POST /api/poscake/orders` — Fetch từ POSCake
- `POST /api/kiotviet/orders` — Fetch từ KiotViet
- `POST /api/nhanh/orders` — Fetch từ Nhanh.vn

### Route Optimization
- `POST /api/vrp/optimize` — Tối ưu hóa tuyến (TrackAsia VRP API)
- `GET /api/vrp/geocode` — Geo-code địa chỉ (TrackAsia autocomplete)
- `POST /api/vrp/test-key` — Test API key validity

### Health Check
- `GET /api/health` — Server status

---

## 🔐 Security

### Implemented
✅ **Firebase JWT Verification** — Backend verify token từ Google JWKS  
✅ **CORS Whitelist** — Chỉ allow origin được config  
✅ **Rate Limiting** — Per-endpoint throttling  
✅ **Input Validation** — Regex check IDs, max length constraints  
✅ **API Key Isolation** — TrackAsia key nhập via header, không lưu localStorage  
✅ **Password Field Masking** — KiotViet, Nhanh.vn inputs dùng `type="password"`  

### To-Do (Important!)
⚠️ **Rotate API Keys** — Lark, TrackAsia, POSCake keys đã expose trong git history  
⚠️ **Firebase Security Rules** — Deploy rules: `firebase deploy --only firestore:rules`  
⚠️ **OAuth Redirect URI** — Verify correct URI in Google Cloud Console:  
   `https://gen-lang-client-0071548909.firebaseapp.com/__/auth/handler`  
⚠️ **Firebase Authorized Domains** — Add `smartroute-app.vercel.app`  

---

## 📦 Deployment

### Vercel (Production)

1. **Link Vercel project**:
   ```bash
   vercel link --yes --project smartroute-app
   ```

2. **Set environment variables**:
   ```bash
   vercel env add FIREBASE_PROJECT_ID production
   vercel env add TRACK_ASIA_API_KEY production
   # ... (add all env vars)
   ```

3. **Deploy**:
   ```bash
   npm run build
   vercel --prod --yes
   ```

4. **Verify**:
   - Visit https://smartroute-app.vercel.app
   - Check Vercel dashboard for deploy logs

---

## 📝 Recent Updates

### v1.2.0 — Platform Integration & UI Redesign
- ✨ **KiotViet Integration** — OAuth2 client_credentials flow
- ✨ **Nhanh.vn Integration** — v3.0 REST API with token auth
- ✨ **UI Redesign** — 5 platform cards with SVG icons, responsive grid layout
- ✨ **TrackAsia Key Config** — Per-user API key with connection test
- 🔧 **Backend Refactoring** — Modular service files (kiotvietService.js, nhanhService.js)
- 🐛 **Fixed** — API key exposure, CORS headers, rate limiting

### v1.1.0 — Security Hardening
- 🔐 **Firebase JWT Auth** — Backend token verification
- 🔐 **API Key Isolation** — Moved from frontend to backend with header injection
- 🔐 **CORS + Rate Limiting** — Per-endpoint protection
- 🔧 **Vercel Env Vars** — Proper setup & verification

### v1.0.0 — MVP
- 📲 Order import (Lark, POSCake, Google Sheets)
- 🗺️ TrackAsia maps & VRP optimization
- 🔥 Firebase Auth & Firestore
- 🚀 Vercel deployment

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "feat: describe change"`
3. Push: `git push origin feature/your-feature`
4. Open PR for review

---

## 📄 License

Proprietary — All rights reserved.

---

## 📞 Support

**Issues?** Contact developer or check Vercel/Firebase logs.

- Vercel Dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com
- Backend Logs: `vercel logs`

---

**Last Updated**: 2026-05-29  
**Deployed**: https://smartroute-app.vercel.app
