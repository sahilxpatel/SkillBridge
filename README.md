# SkillBridge Attendance System

This repository contains the end-to-end prototype for the SkillBridge attendance management system. It supports role-based access for Students, Trainers, Institutions, Programme Managers, and Monitoring Officers.

## 1. Live URLs & Deployment Status

- **Frontend (Vercel):** https://skill-bridge-gilt-three.vercel.app/
- **Backend (Render):** https://skillbridge-backend-sv4f.onrender.com


## 2. Test Accounts

You can log in to the system using the following test accounts. The password for all accounts is `SkillBr1dge#Dev2026!`.

- **Student:** `student@skillbridge-app.dev`
- **Trainer:** `trainer@skillbridge-app.dev`
- **Institution:** `institution@skillbridge-app.dev`
- **Programme Manager:** `manager@skillbridge-app.dev`
- **Monitoring Officer:** `officer@skillbridge-app.dev`

## 3. Setup Instructions (Running Locally)

Since the live DB connection may be flaky, running this locally is recommended.

**Prerequisites:** You need a Clerk account (for API keys) and a local PostgreSQL instance.

### Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5001
   DATABASE_URL="postgresql://user:pass@localhost:5432/skillbridge"
   CLERK_SECRET_KEY="sk_test_..."
   FRONTEND_URL="http://localhost:3000"
   ```
4. `npx prisma migrate dev --name init`
5. `npx prisma generate`
6. `npm run dev`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5001"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   ```
4. `npm run dev`

## 4. Schema Decisions

The core data model was designed with Prisma. Key decisions:
- **Clerk Auth Syncing**: I decided against using Clerk Webhooks for syncing users to the DB because webhook delivery can be delayed. Instead, `authMiddleware.ts` automatically `upserts` the user into the `User` table on their first authenticated API call. This guarantees the DB always has the user row ready for foreign key relations immediately after sign-up.
- **Many-to-Many Relations**: `BatchTrainer` and `BatchStudent` are explicit join tables. I used explicit tables rather than implicit Prisma joins so I could track additional metadata in the future (e.g., `joinedAt`).
- **Composite Keys**: `Attendance` uses a unique multi-column index `@@unique([sessionId, studentId])` to mathematically prevent duplicate attendance records for the same student in the same session.

## 5. Stack Choices

- **Frontend**: Next.js (App Router) + Tailwind CSS. *Why?* App Router's server components paired with Clerk makes role-gating securely at the edge (`middleware.ts`) trivial.
- **Backend**: Express + TypeScript. *Why?* Next.js API routes are great, but the prompt requested a distinctly separated deployable backend. Express is lightweight and mature.
- **Database Architecture**: PostgreSQL + Prisma ORM. *Why?* Prisma guarantees absolute type safety from the DB schema up to the Express controllers, preventing nasty runtime null errors. Neon provides excellent serverless scaling.
- **Auth**: Clerk. *Why?* Their `publicMetadata` feature perfectly fits the requirement of role-mismatches.

## 6. What is Fully Working vs Skipped

- **Fully Working**: 
  - Complete End-to-End role-gated routing in the frontend.
  - Express API meticulously blocks or permits endpoints based on decoded Clerk JWT `metadata.role`.
  - Trainer batch invite link generation, and Student automatic onboarding via the token logic.
  - Institution Dashboards fetching their correct child relationships.
- **Partially Done / Skipped**:
  - The UI is extremely functional. I skipped adding a UI library (like `shadcn`), opting strictly for pure functional Tailwind classes to stay within the 2-3 day limit.
  - Creating trainers as an institution relies on API calls; the UI has a view-only list to save time.

## 7. One Thing I'd Do Differently With More Time

If I had more time, I would **decouple the `User` DB sync from the request path** and commit to building a proper asynchronous reliable webhook queue (like SQS or Inngest). Doing upserts on every initial request is clever for a 2-day hackathon, but causes an unnecessary database hit on API cold starts for existing users.

---

## 8. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│              Next.js 14 (App Router) — Port 3000                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  /student    │  │  /trainer    │  │  /institution         │  │
│  │  /join/:tok  │  │  /sessions   │  │  /programme-manager   │  │ 
│  │  /choose-role│  │  /batches    │  │  /monitoring-officer  │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│          │                  │                    │              │
│          └──────────────────┼────────────────────┘              │
│                             ▼                                   │
│              middleware.ts (Clerk Edge Auth Guard)              │
│         Reads publicMetadata.role → redirects or allows         │
└─────────────────────────────────────┬───────────────────────────┘
                                      │  HTTP (fetch / REST)
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                EXPRESS BACKEND — Port 5001                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    app.ts (Entry Point)                  │   │
│  │   CORS · JSON body-parser · Route mounting               │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│             ┌───────────▼───────────┐                           │
│             │  authMiddleware.ts    │                           │
│             │  • Verifies Clerk JWT │                           │
│             │  • Upserts User row   │                           │
│             │  • Attaches req.user  │                           │
│             └───────────┬───────────┘                           │
│                         │                                       │
│     ┌───────────────────┼────────────────────┐                  │
│     ▼                   ▼                    ▼                  │
│  /batches            /sessions          /attendance             │
│  /institution        /summaries                                 │
│     │                   │                    │                  │
│     └───────────────────┼────────────────────┘                  │
│                         ▼                                       │
│              roleGuard middleware (per route)                   │
│         Checks req.user.role → 403 if unauthorized              │
└─────────────────────────────────────┬───────────────────────────┘
                                      │  Prisma Client
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               PostgreSQL (Neon / Local)                         │
│                                                                 │
│   User · Batch · BatchTrainer · BatchStudent                    │
│   Session · Attendance · BatchInvite                            │
└─────────────────────────────────────────────────────────────────┘
                                      │
                              (Auth Provider)
                                      │
┌─────────────────────────────────────▼───────────────────────────┐
│                         CLERK                                   │
│   • Issues JWTs with publicMetadata.role embedded               │
│   • Manages sign-up / sign-in / session tokens                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Role-segmented dashboard pages, SSR, Clerk UI |
| **Edge Auth Guard** | `middleware.ts` + Clerk | JWT validation at the Edge; route-level redirects based on `publicMetadata.role` |
| **API Server** | Express + TypeScript | REST endpoints, business logic, DB mutations |
| **Auth Middleware** | `authMiddleware.ts` | Verifies Clerk JWT on every API request; upserts `User` row |
| **Role Guard** | `roleGuard.ts` | Per-route middleware that enforces which roles may call each endpoint |
| **ORM** | Prisma | Type-safe DB queries; schema migrations |
| **Database** | PostgreSQL (Neon / Local) | Persistent storage for all entities |
| **Auth Provider** | Clerk | Token issuance, `publicMetadata.role` storage |

### Database Schema (Entity Relationship)

```
 User
  ├── id (cuid PK)
  ├── clerkUserId (unique)
  ├── name
  ├── role  (student | trainer | institution | programme_manager | monitoring_officer)
  └── institutionId?
        │
        ├──◄─ BatchTrainer (batchId + trainerId composite PK)
        │         └──► Batch
        │                 ├── id, name, institutionId
        │                 ├──◄─ BatchStudent (batchId + studentId composite PK)
        │                 │         └──► User (student)
        │                 ├──◄─ Session
        │                 │         ├── id, title, date, startTime, endTime
        │                 │         └──◄─ Attendance
        │                 │                  ├── id, status (present|absent|late)
        │                 │                  └── @@unique([sessionId, studentId])
        │                 └──◄─ BatchInvite
        │                           ├── token (unique)
        │                           └── expiresAt
        └──◄─ Attendance (student's records)
```

### Folder Structure

```
skillbridge-attendance/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # DB models & enums
│   │   └── seed.ts                # Seed script for test accounts
│   └── src/
│       ├── app.ts                 # Express app setup, route mounting
│       ├── index.ts               # Server entry point
│       ├── middleware/
│       │   ├── authMiddleware.ts  # JWT verification + User upsert
│       │   └── roleGuard.ts       # Role-based access enforcement
│       ├── routes/
│       │   ├── attendance.ts      # POST /attendance (Trainer only)
│       │   ├── batches.ts         # CRUD batches + invite token logic
│       │   ├── institution.ts     # Institution-scoped queries
│       │   ├── sessions.ts        # Session CRUD
│       │   └── summaries.ts       # Aggregated reports for PM / MO
│       ├── lib/
│       │   └── prisma.ts          # Singleton Prisma client
│       └── types/
│           └── express.d.ts       # Augments Request with req.user
└── frontend/
    ├── middleware.ts               # Clerk Edge guard + role redirects
    ├── app/
    │   ├── page.tsx                # Root redirect based on role
    │   ├── choose-role/            # Role selection after first sign-up
    │   ├── join/[token]/           # Student batch onboarding via invite
    │   ├── student/                # Student dashboard
    │   ├── trainer/                # Trainer dashboard (batches, sessions)
    │   ├── institution/            # Institution dashboard
    │   ├── programme-manager/      # PM reports & oversight
    │   └── monitoring-officer/     # MO cross-institution view
    ├── components/                 # Shared UI components
    ├── hooks/                      # Custom React hooks (data fetching)
    └── lib/
        └── api.ts                  # Typed fetch wrapper with auth headers
```

---

## 9. Request Workflow

### A. Role-Gated Request Lifecycle

Every authenticated request follows this exact path:

```
1. USER ACTION (e.g. Trainer clicks "Mark Attendance")
         │
         ▼
2. Next.js Frontend (frontend/app/trainer/...)
   • Reads Clerk session token via useAuth()
   • Calls lib/api.ts fetch wrapper
         │
         │  Authorization: Bearer <clerk-jwt>
         ▼
3. Express Backend — authMiddleware.ts
   • Calls Clerk SDK to verify JWT signature
   • Extracts clerkUserId + publicMetadata.role
   • UPSERTS User row in DB (insert if new, skip if existing)
   • Attaches req.user = { id, clerkUserId, role, ... }
         │
         ▼
4. roleGuard middleware (per route)
   • Compares req.user.role against the allowed roles list
   • ✗ Role mismatch → 403 Forbidden (JSON error response)
   • ✓ Role match   → next()
         │
         ▼
5. Route Handler (e.g. routes/attendance.ts)
   • Executes Prisma query
   • Validates business rules (e.g. @@unique constraint)
   • Returns JSON response
         │
         ▼
6. Frontend updates UI state
```

### B. Student Onboarding via Invite Token

```
 Institution creates Batch
         │
         ▼
 Trainer calls POST /batches/:id/invite
   → Generates UUID token, stores in BatchInvite with 7-day expiry
   → Returns shareable link: /join/<token>
         │
         ▼
 Student opens /join/<token>
   → Frontend calls GET /batches/join/<token> (validates token & expiry)
   → Student signs in / signs up via Clerk
   → Frontend calls POST /batches/join/<token>
         │
         ▼
 Backend authMiddleware runs
   → Student row upserted into User table
   → BatchStudent join record created (batchId + studentId)
   → Student is now enrolled in the batch
         │
         ▼
 Student redirected to /student dashboard
   → Can now see their enrolled batch & attendance records
```

### C. Attendance Marking Workflow

```
 Trainer opens their Session detail page
         │
         ▼
 Frontend fetches GET /sessions/:id
   → Returns session info + list of enrolled students
         │
         ▼
 Trainer marks each student as present / absent / late
         │
         ▼
 Frontend calls POST /attendance
   Body: { sessionId, studentId, status }
         │
         ▼
 roleGuard: allows [trainer] only
         │
         ▼
 Prisma upserts Attendance record
   → @@unique([sessionId, studentId]) prevents duplicates
   → status can be updated if Trainer re-marks
         │
         ▼
 Student dashboard reflects updated attendance
Programme Manager / Monitoring Officer can view via GET /summaries
```

### D. Role-to-Endpoint Permission Matrix

| Endpoint | Student | Trainer | Institution | Prog. Manager | Monitoring Officer |
|---|:---:|:---:|:---:|:---:|:---:|
| `GET /batches` (own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /batches` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `POST /batches/:id/invite` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `POST /batches/join/:token` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /sessions` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `GET /sessions/:id` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /attendance` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `GET /attendance/:sessionId` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /institution/trainers` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `GET /summaries/batch/:id` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /summaries/overview` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 10. Design Decisions

### 1. Clerk for Authentication (not JWT from scratch)
Clerk was chosen over a custom JWT implementation because it provides enterprise-grade session management, device verification, and multi-factor auth out of the box. This let the project focus on business logic (RBAC, attendance) rather than reinventing secure auth. Clerk's `publicMetadata.role` field is used to propagate roles — set server-side only, so users cannot self-assign roles.

### 2. Role Stored in Clerk `publicMetadata` (not only the DB)
The source of truth for a user's role is Clerk's `publicMetadata.role`. The Postgres `User` table stores a copy for efficient DB-side joins, but the auth middleware always reads from the verified Clerk JWT claim. This prevents role escalation via direct DB manipulation.

### 3. Just-In-Time User Upsert in Auth Middleware
Instead of a separate registration endpoint, every authenticated API request triggers an `upsert` of the user into Postgres. If the user exists, it's a no-op. If not, it's created with their Clerk ID, name, and role. This eliminates the "user exists in Clerk but not in DB" race condition common in two-step registration flows.

### 4. `@@unique([sessionId, studentId])` Deduplication at DB Level
Attendance deduplication is enforced at the Prisma schema level, not only in application logic. Even if two concurrent requests slip through the API, the database rejects the duplicate. The API catches the Prisma `P2002` error and returns a clean `409 Conflict` response.

### 5. Role-Gated Middleware (not per-route checks)
All role enforcement is centralised in `roleMiddleware.ts` which accepts an array of allowed roles. Routes declare their allowed roles at registration time (`requireRoles(['trainer', 'institution'])`), keeping individual route handlers clean and free of auth logic. This mirrors the Guard pattern from NestJS but implemented in raw Express.

### 6. Invitation Token System for Student Enrolment
Students cannot self-enrol in batches. A trainer generates a time-limited token (stored in `BatchInvite`), shares the link, and the student's `join` API call validates the token before adding them to `BatchStudent`. This prevents arbitrary batch access and mirrors real-world controlled-access course enrolment.

### 7. Neon + PgBouncer for Serverless-Safe Connections
The `DATABASE_URL` includes `pgbouncer=true&connect_timeout=30`. Neon uses a serverless Postgres architecture that sleeps idle connections. PgBouncer pooling prevents "too many connections" errors when a cold Render instance opens multiple Prisma connections simultaneously on startup.

### 8. Prisma as ORM (not raw SQL or Knex)
Prisma was chosen for its type-safe query builder, automatic migration tracking, and the generated client which catches schema-breaking queries at compile time. The `@@unique` and `@relation` constraints in `schema.prisma` serve as living documentation of the data model.

### 9. Monorepo with Separate Frontend & Backend Services
The project uses a monorepo with `frontend/` and `backend/` directories rather than a Next.js API-routes-only approach. This gives a clear separation of concerns, allows independent deployment pipelines (Vercel for frontend, Render for backend), and makes it straightforward to add a mobile client later that hits the same REST API.

### 10. Role-Specific Sidebars (not one generic view with hidden elements)
Each role gets a purpose-built dashboard rather than one generic view with conditionally hidden buttons. The sidebar dynamically renders navigation items based on the authenticated user's role sourced from Clerk `publicMetadata`. This reduces cognitive load — a Student never sees a "Create Session" button that they cannot use.
