# Problem Statement 36 — JaanMaang

A unified platform connecting **Citizens, Students, Industry, Faculty, Mentors, NGOs, and Universities** to identify problems, collaborate on solutions, and create real-world impact.

## 🏗️ Structure

```text
Problem Statement 36/
├── apps/
│   ├── web/              # Unified Next.js web platform
│   └── citizen-app/      # Citizen Flutter mobile app
├── packages/             # Shared models, API, auth, UI & utilities
├── backend/              # Independent backend service
└── docs/                 # Project documentation
👥 Web Roles
Student
Industry
Faculty
Mentor
NGO
University
All roles use one unified web application and common authentication, with role-based dashboards and features.
📱 Citizen App
apps/citizen-app is the only mobile application.
There is no separate Student mobile app.
🚀 Run Web
cd apps/web
npm install
npm run dev
📱 Run Citizen App
cd apps/citizen-app
flutter pub get
flutter run
📌 Architecture
One Web Platform + One Citizen App + Shared Packages + Independent Backend
