# Problem Statement 36 — JaanMaang

> A unified platform connecting Citizens, Students, Industry, Faculty, Mentors,
> NGOs, and Universities to identify problems, collaborate on solutions,
> and create real-world impact.

## 🏗️ Architecture

```text
JaanMaang/
├── apps/
│   ├── web/            # Unified Next.js web platform
│   └── citizen-app/    # Flutter citizen mobile app
├── packages/           # Shared models, API, auth & utilities
├── backend/            # Independent backend service
└── docs/               # Project documentation

👥 Web Roles
Student · Industry · Faculty · Mentor · NGO · University
All roles use one unified web application, common authentication,
and role-based dashboards.
📱 Citizen App
The Citizen App is the only mobile application.
There is no separate Student mobile app.
🚀 Run Web
cd apps/web
npm install
npm run dev
📱 Run Citizen App
cd apps/citizen-app
flutter pub get
flutter run
📌 Architecture Summary
One Web Platform + One Citizen App + Shared Packages + Independent Backend

Ye version **GitHub pe kaafi cleaner** lagega — less scrolling, proper headings, aur code blocks sirf jahan actually needed hain.
