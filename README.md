# Lathikka Marketing Management System (MMS)

Enterprise-grade Field Force & Marketing Operations Management Platform built with **NestJS** and **Next.js**.

[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-241%20Passed-emerald.svg)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v12-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-v16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-green.svg)](https://www.mongodb.com/)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Security](#architecture--security)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Environment Configuration](#environment-configuration)
7. [Database Seeding](#database-seeding)
8. [Testing & Quality Assurance](#testing--quality-assurance)
9. [Build & Production Run](#build--production-run)
10. [Deployment Guide](#deployment-guide)
    - [Backend on Render / Railway](#backend-deployment-render--railway)
    - [Frontend on Vercel](#frontend-deployment-vercel)
    - [Database on MongoDB Atlas](#database-setup-mongodb-atlas)
11. [Complete API Reference](#complete-api-reference)
12. [Production Readiness Checklist](#production-readiness-checklist)

---

## 🚀 System Overview

The **Lathikka Marketing Management System** is a robust multi-role field sales, customer relationship, and operational expense automation system designed for sales teams, marketing reps, and corporate administrators.

### Core Modules
- **Authentication & RBAC**: Dual-tier role-based access control (`ADMIN` and `EMPLOYEE`), stateless JWT access (15m) + refresh tokens (7d), active-account validation, and rate-limiting.
- **Employee Management**: Full employee lifecycle, automatic unique employee code generation (`EMP-YYYY-XXXX`), soft deletion, and contact management.
- **Customer CRM**: Retailer and distributor management with GPS coordinates, territory tagging, and assigned representative tracking.
- **Field Visits & Geo-Tracking**: Check-in / check-out timestamps, GPS Haversine distance verification, purpose recording, and visit outcome tracking.
- **Order Processing**: Multi-item sales orders with automated server-side pricing recalculation, discount validation, and approval state machines (`PENDING` → `APPROVED` / `REJECTED` → `COMPLETED` / `CANCELLED`).
- **Automated Incentive Engine**: Rule-based incentive computation upon order approvals, unique compound indexing (`orderId`) for idempotency, and historical rule snapshotting.
- **Expense & Claim Management**: Multi-category claims (`TRAVEL`, `FOOD`, `LODGING`, `OTHER`), receipt upload tracking, and mandatory administrative rejection reasoning.
- **Executive & Field Dashboards**: Real-time KPI summaries, revenue metrics formatted in Indian Rupees (`₹`), performance leaderboards, and recent activity logs.
- **Reporting & Business Intelligence**: Date-range filtered sales, performance, and visit reports with native CSV exports.
- **In-App Notifications**: Real-time event notifications with unread badge synchronization and mark-as-read workflows.
- **Health & Readiness Probes**: Live database readiness check (`GET /api/health`) returning HTTP 200/503 for deployment uptime monitoring.

---

## 🛠 Tech Stack

### Backend
- **Framework**: [NestJS 12](https://nestjs.com/) (Express platform)
- **Language**: TypeScript 5.7 (Strict mode, ES Modules)
- **Database ORM**: [Mongoose 9](https://mongoosejs.com/) with MongoDB 6+
- **Security & Auth**: Passport JWT, bcrypt (10 rounds), `@nestjs/throttler` rate limiting
- **Validation**: `class-validator`, `class-transformer` with strict whitelist transformation
- **Testing**: [Vitest](https://vitest.dev/) (22 test suites, 241 tests, 100% pass rate)
- **Linter**: Oxlint & ESLint

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: React 19, [Tailwind CSS v4](https://tailwindcss.com/)
- **Data Fetching & Cache**: [TanStack React Query v5](https://tanstack.com/query)
- **HTTP Client**: Axios with global interceptors and token refresh
- **Icons**: [Lucide React](https://lucide.dev/)
- **Type Safety**: Full TypeScript end-to-end typing

---

## 🔒 Architecture & Security

```
                                  ┌──────────────────────────┐
                                  │   Next.js 16 Frontend    │
                                  │  (React 19, Tailwind v4) │
                                  └────────────┬─────────────┘
                                               │
                                       HTTPS / JWT Bearer
                                               │
                                  ┌────────────▼─────────────┐
                                  │    NestJS 12 Backend     │
                                  │ ┌──────────────────────┐ │
                                  │ │ Throttler Guard (10) │ │
                                  │ └──────────┬───────────┘ │
                                  │ ┌──────────▼───────────┐ │
                                  │ │ JwtAuthGuard (Global)│ │
                                  │ └──────────┬───────────┘ │
                                  │ ┌──────────▼───────────┐ │
                                  │ │ RolesGuard (RBAC)    │ │
                                  │ └──────────┬───────────┘ │
                                  │ ┌──────────▼───────────┐ │
                                  │ │ ValidationPipe       │ │
                                  │ └──────────┬───────────┘ │
                                  └────────────┼─────────────┘
                                               │
                                   Mongoose 9 / Connection
                                               │
                                  ┌────────────▼─────────────┐
                                  │     MongoDB Database     │
                                  │ (Strict Indexes & RBAC)  │
                                  └──────────────────────────┘
```

### Security Measures Implemented
1. **Authoritative Scoping**: Backend enforces ownership at the query level (`{ employee: req.user._id }`). Field employees cannot access other employees' records even if ID parameters are manipulated.
2. **Credential Sanitization**: `passwordHash` is excluded from user schemas by default (`select: false`) and stripped via DTO transformation before responses leave the backend.
3. **Strict Parameter Validation**: All MongoDB object IDs are validated via `ParseMongoIdPipe` preventing NoSQL injection.
4. **Rate Limiting**: Global throttling of 10 requests per minute with custom burst allocations on sensitive authentication routes.
5. **CORS Control**: Explicit whitelist origin binding (`CORS_ORIGIN`).

---

## 📦 Prerequisites

Ensure the following tools are installed locally:
- **Node.js**: `v18.18.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance (Port 27017) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

---

## 💻 Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd lathikka-2
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
```
*Edit `backend/.env` with your MongoDB connection string and JWT secrets.*

### 3. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
```
*Ensure `NEXT_PUBLIC_API_URL=http://localhost:5000/api` in `frontend/.env.local`.*

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `MONGODB_URI` | MongoDB Connection URI | `mongodb://localhost:27017/lathikka` |
| `JWT_ACCESS_SECRET` | Secret key for access tokens (min 32 chars) | `your-access-secret-min-32-chars-key` |
| `JWT_ACCESS_EXPIRATION` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens (min 32 chars) | `your-refresh-secret-min-32-chars-key` |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifespan | `7d` |
| `CORS_ORIGIN` | Allowed Frontend Origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base Backend REST API URL | `http://localhost:5000/api` |

---

## 🗄 Database Seeding

The database seeder populates initial test users, customers, visits, incentive rules, orders, expenses, and notifications.

```bash
cd backend
npm run seed
```

### Default Seeded Accounts
| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@lathikka.com` | `Admin@123456` | Full System Access, All Approvals & Reports |
| **Field Employee** | `emp1@lathikka.com` | `Employee@123456` | Own Customers, Visits, Orders, Expenses, Incentives |
| **Field Employee** | `emp2@lathikka.com` | `Employee@123456` | Own Customers, Visits, Orders, Expenses, Incentives |

---

## 🧪 Testing & Quality Assurance

### Run Backend Unit Tests (Vitest)
```bash
cd backend
npm test
```
*Runs all 22 test suites covering all controller, service, health, calculation, and security logic (241 passing unit tests).*

### Run Backend Coverage Report
```bash
cd backend
npm run test:cov
```

### Run Type Checking
```bash
# Backend TypeScript Check
cd backend && npx tsc --noEmit

# Frontend TypeScript Check
cd frontend && npx tsc --noEmit
```

### Run Linters
```bash
# Backend Linter (Oxlint)
cd backend && npm run lint

# Frontend Linter (ESLint)
cd frontend && npm run lint
```

---

## 🏗 Build & Production Run

### Build Backend
```bash
cd backend
npm run build
# Start production server
npm run start:prod
```

### Build Frontend
```bash
cd frontend
npm run build
# Start production Next.js server
npm start
```

---

## 🚢 Deployment Guide

### Database Setup (MongoDB Atlas)
1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an **M0 (Free Tier)** or dedicated cluster.
2. Under **Database Access**, create a user with `Read and Write to any database` privilege.
3. Under **Network Access**, whitelist your server IPs or allow `0.0.0.0/0` (with strong password).
4. Copy the connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.mongodb.net/lathikka?retryWrites=true&w=majority`) and set it as `MONGODB_URI`.

### Backend Deployment (Render / Railway)
1. **Repository**: Connect your GitHub repository.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm run start:prod`
5. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<your-atlas-uri>`
   - `JWT_ACCESS_SECRET=<generated-secret>`
   - `JWT_ACCESS_EXPIRATION=15m`
   - `JWT_REFRESH_SECRET=<generated-secret>`
   - `JWT_REFRESH_EXPIRATION=7d`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
6. **Health Check Endpoint**: Set path to `/api/health`.

### Frontend Deployment (Vercel)
1. **Repository**: Import your GitHub repository to [Vercel](https://vercel.com).
2. **Root Directory**: `frontend`
3. **Framework Preset**: `Next.js`
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com/api`

---

## 📖 Complete API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### 1. Health & Diagnostics
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Live database and backend status check |

### 2. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns access and refresh tokens |
| `POST` | `/api/auth/refresh` | Public | Refresh expired access token |
| `POST` | `/api/auth/logout` | Private | Invalidate session |
| `GET` | `/api/auth/me` | Private | Retrieve current user profile and role |

### 3. Employee Management (`/api/employees`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/employees` | Admin | List employees with search, pagination, and status filters |
| `POST` | `/api/employees` | Admin | Create employee with auto-generated code |
| `GET` | `/api/employees/:id` | Admin / Self | Get employee profile details |
| `PATCH` | `/api/employees/:id` | Admin | Update employee profile or status |
| `DELETE` | `/api/employees/:id` | Admin | Soft-delete / deactivate employee |

### 4. Customers CRM (`/api/customers`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | Private | List assigned/all customers with search |
| `POST` | `/api/customers` | Private | Create customer with phone and GPS validation |
| `GET` | `/api/customers/:id` | Private | Retrieve customer details |
| `PATCH` | `/api/customers/:id` | Private | Update customer information |
| `DELETE` | `/api/customers/:id` | Admin | Remove customer |

### 5. Visits & Geo-Tracking (`/api/visits`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/visits` | Private | List visits (filtered by user/admin) |
| `POST` | `/api/visits` | Employee | Log check-in with GPS coordinates |
| `GET` | `/api/visits/:id` | Private | Get single visit details |
| `PATCH` | `/api/visits/:id` | Employee | Log check-out, duration, and notes |

### 6. Orders & Item Calculations (`/api/orders`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Private | List orders with pagination & status filters |
| `POST` | `/api/orders` | Private | Submit sales order with auto-calculated totals |
| `GET` | `/api/orders/:id` | Private | Get order details with item breakdown |
| `PATCH` | `/api/orders/:id/status` | Admin | Approve or reject order (triggers incentives) |
| `PATCH` | `/api/orders/:id` | Private | Update order details (while pending) |

### 7. Incentive Rules & Records (`/api/incentives`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/incentives` | Private | List earned incentives (filtered by user/admin) |
| `GET` | `/api/incentives/rules` | Private | List active incentive calculation rules |
| `POST` | `/api/incentives/rules` | Admin | Create new incentive rule |
| `PATCH` | `/api/incentives/rules/:id`| Admin | Update incentive rule |
| `GET` | `/api/incentives/:id` | Private | Retrieve single incentive record |

### 8. Expense Management (`/api/expenses`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/expenses` | Private | List expense claims with filters |
| `POST` | `/api/expenses` | Employee | Submit expense claim with receipt |
| `GET` | `/api/expenses/:id` | Private | Get expense claim details |
| `PATCH` | `/api/expenses/:id/status`| Admin | Approve or reject expense claim |
| `DELETE` | `/api/expenses/:id` | Private | Cancel pending expense claim |

### 9. Dashboards & Analytics (`/api/dashboard`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/admin` | Admin | Global KPI metrics, revenue charts, leaderboards |
| `GET` | `/api/dashboard/employee`| Employee | Field worker KPIs, daily visit stats, earnings |

### 10. Reports & Exports (`/api/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/sales` | Admin | Sales performance reports with CSV export |
| `GET` | `/api/reports/visits` | Admin | Field visit analytics with CSV export |
| `GET` | `/api/reports/expenses` | Admin | Expense breakdown reports with CSV export |

### 11. In-App Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Private | Paginated notification activity feed |
| `GET` | `/api/notifications/unread-count` | Private | Count of unread notifications |
| `PATCH` | `/api/notifications/:id/read` | Private | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Private | Mark all notifications as read |

---

## ✅ Production Readiness Checklist

- [x] **Backend Health Check**: `GET /api/health` probes live database status via `@InjectConnection()` (200 OK / 503 Error).
- [x] **Comprehensive Test Suite**: 22 test suites with 241 passing unit tests in Vitest.
- [x] **TypeScript Strictness**: Zero TypeScript compilation errors in backend and frontend.
- [x] **Zero Lint Errors**: Clean code quality verified via linters.
- [x] **Production Builds**: Backend builds to `dist/`, Frontend compiles 14 static and dynamic routes.
- [x] **Dual-Role RBAC**: Strict separation of Admin vs Field Employee privileges.
- [x] **NoSQL Injection Prevention**: Object IDs validated via `ParseMongoIdPipe` and whitelist validation pipes.
- [x] **Financial Accuracy**: Deterministic 2-decimal rounded calculations and consistent Indian Rupee (`₹`) formatting.
- [x] **Idempotency Guarantees**: MongoDB compound unique index on `{ orderId: 1 }` prevents duplicate incentive generation.
- [x] **Environment Templates**: Documented `.env.example` templates in both `backend` and `frontend`.
- [x] **Security Headers & CORS**: Explicit origin whitelisting and credential containment.
