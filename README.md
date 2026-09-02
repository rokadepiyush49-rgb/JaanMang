# JaanMaang — Problem Statement 36

A unified platform connecting **Citizens, Students, Industry, Faculty, Mentors, NGOs, and Universities** to identify problems, collaborate on solutions, and create real-world impact.

---

##  Project Structure

```text
Problem Statement 36/
├── apps/
│   ├── web/              # Unified Next.js web platform
│   └── citizen-app/      # Citizen Flutter mobile app
├── packages/             # Shared models, API, auth, UI & utilities
├── backend/              # Independent backend service
└── docs/                 # Project documentation
```

---

##  Platform Roles & Access

### Web Platform (`apps/web`)
Sabhi major stakeholders ke liye ek unified web application hai jisme role-based dashboards aur single auth system hai:
* Student
* Industry
* Faculty
* Mentor
* NGO
* University

### Citizen App (`apps/citizen-app`)
* Yeh is ecosystem ka **akela** mobile application hai.
* Students ya dusre roles ke liye koi alag se mobile app nahi hai (ve web use karenge).

---

##  Architecture

**One Web Platform + One Citizen App + Shared Packages + Independent Backend**

* **Frontend Web:** Next.js application jisme role-based access control (RBAC) configured hai.
* **Mobile Client:** Flutter cross-platform app ground-level issue reporting ke liye.
* **Shared Packages:** Common API contracts, TypeScript models, validation schemas, aur reusable UI components.
* **Backend:** Independent modular backend API service database operations aur business logic ke liye.

---

##  Setup & Run Guide

### Prerequisites
* **Node.js**: v18.x ya latest LTS
* **Flutter SDK**: v3.x stable channel
* **Git**: Installed and configured

---

### 1. Web Application (`apps/web`)

```bash
# Go to web folder
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

Server live ho jayega: `http://localhost:3000`

---

### 2. Citizen Mobile App (`apps/citizen-app`)

Make sure aapka Android/iOS emulator start ho ya physical device USB debugging par connected ho:

```bash
# Go to citizen-app folder
cd apps/citizen-app

# Get Flutter dependencies
flutter pub get

# Launch app on connected device
flutter run
```

---

### 3. Backend Service (`backend`)

```bash
# Go to backend folder
cd backend

# Install dependencies
npm install

# Run backend server
npm run dev
```

---

##  Packages Overview

* `packages/models`: Universal data models aur Zod/validation schemas.
* `packages/api`: Unified API clients aur network utilities.
* `packages/ui`: Shared design system components.
* `packages/auth`: Common authentication helpers aur session management.

---

##  License

Distributed under the MIT License. See `LICENSE` for more details.
