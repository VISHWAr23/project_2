# Marketing Team Management System — System Design

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Folder Structure](#2-folder-structure)
3. [MongoDB Collections](#3-mongodb-collections)
4. [Entity Relationships](#4-entity-relationships)
5. [API Module Structure](#5-api-module-structure)
6. [Authentication Architecture](#6-authentication-architecture)
7. [Authorization / RBAC Design](#7-authorization--rbac-design)
8. [Order State Workflow](#8-order-state-workflow)
9. [Incentive Calculation Workflow](#9-incentive-calculation-workflow)
10. [Expense Approval Workflow](#10-expense-approval-workflow)
11. [Frontend Route Structure](#11-frontend-route-structure)
12. [Backend Module Structure](#12-backend-module-structure)
13. [Development Phases](#13-development-phases)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                      │
│  Next.js App Router (SSR + CSR)                                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ Auth Pages │  │ Admin      │  │ Employee │  │ Shared         │   │
│  │ Login      │  │ Dashboard  │  │ Dashboard│  │ Components     │   │
│  │ Register   │  │ Management │  │ My Work  │  │ (shadcn/ui)    │   │
│  └────────────┘  └────────────┘  └──────────┘  └────────────────┘   │
│                         │                                            │
│         TanStack Query (API State) + React Hook Form + Zod          │
└─────────────────────────┼────────────────────────────────────────────┘
                          │  HTTPS / REST
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (NestJS)                            │
│                                                                      │
│  ┌──────────┐  ┌──────────────────────────────────────────────────┐  │
│  │ Auth     │  │ Guards                                          │  │
│  │ Module   │  │ ┌──────────┐ ┌──────────────┐ ┌──────────────┐ │  │
│  │ JWT      │  │ │ JwtGuard │ │ RolesGuard   │ │ Ownership    │ │  │
│  │ Strategy │  │ │          │ │ @Roles()     │ │ Guard        │ │  │
│  └──────────┘  │ └──────────┘ └──────────────┘ └──────────────┘ │  │
│                └──────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐   │
│  │ Users  │ │Customers │ │ Orders │ │Expenses  │ │ Incentives  │   │
│  │ Module │ │ Module   │ │ Module │ │ Module   │ │ Module      │   │
│  └────────┘ └──────────┘ └────────┘ └──────────┘ └─────────────┘   │
│  ┌────────┐ ┌──────────┐ ┌────────────────┐                        │
│  │ Visits │ │Dashboard │ │ Notifications  │                        │
│  │ Module │ │ Module   │ │ Module         │                        │
│  └────────┘ └──────────┘ └────────────────┘                        │
└─────────────────────────┼────────────────────────────────────────────┘
                          │  Mongoose ODM
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                                   │
│                                                                      │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐   │
│  │ users  │ │customers │ │ orders │ │ expenses │ │ incentives  │   │
│  └────────┘ └──────────┘ └────────┘ └──────────┘ └─────────────┘   │
│  ┌────────┐ ┌──────────────────┐                                    │
│  │ visits │ │ notifications    │                                    │
│  └────────┘ └──────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API style | REST | Simple CRUD-heavy domain; REST maps cleanly |
| Auth tokens | Access + Refresh JWT pair | Stateless auth with secure rotation |
| State management | TanStack Query | Server-state centric; auto cache invalidation |
| Form handling | React Hook Form + Zod | Shared validation schemas (frontend ↔ backend) |
| DB ODM | Mongoose | Mature, schema-validated, excellent TS support |
| Monorepo tool | npm workspaces | Lightweight; no extra tooling needed |

---

## 2. Folder Structure

```
lathikka-2/
├── package.json                   # Root workspace config
├── SYSTEM_DESIGN.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env                       # MONGO_URI, JWT_SECRET, etc.
│   ├── .env.example
│   │
│   └── src/
│       ├── main.ts                # Bootstrap, CORS, validation pipe
│       ├── app.module.ts          # Root module
│       │
│       ├── config/
│       │   ├── config.module.ts
│       │   ├── database.config.ts # Mongoose connection config
│       │   └── jwt.config.ts
│       │
│       ├── common/
│       │   ├── decorators/
│       │   │   ├── roles.decorator.ts
│       │   │   └── current-user.decorator.ts
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   ├── roles.guard.ts
│       │   │   └── ownership.guard.ts
│       │   ├── interceptors/
│       │   │   └── transform.interceptor.ts
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts
│       │   ├── pipes/
│       │   │   └── mongo-id-validation.pipe.ts
│       │   ├── dto/
│       │   │   └── pagination.dto.ts
│       │   └── constants/
│       │       ├── roles.constant.ts
│       │       └── order-status.constant.ts
│       │
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── strategies/
│       │   │   │   ├── jwt.strategy.ts
│       │   │   │   └── jwt-refresh.strategy.ts
│       │   │   └── dto/
│       │   │       ├── login.dto.ts
│       │   │       ├── register.dto.ts
│       │   │       └── token-response.dto.ts
│       │   │
│       │   ├── users/
│       │   │   ├── users.module.ts
│       │   │   ├── users.controller.ts
│       │   │   ├── users.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── user.schema.ts
│       │   │   └── dto/
│       │   │       ├── create-user.dto.ts
│       │   │       └── update-user.dto.ts
│       │   │
│       │   ├── customers/
│       │   │   ├── customers.module.ts
│       │   │   ├── customers.controller.ts
│       │   │   ├── customers.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── customer.schema.ts
│       │   │   └── dto/
│       │   │       ├── create-customer.dto.ts
│       │   │       └── update-customer.dto.ts
│       │   │
│       │   ├── visits/
│       │   │   ├── visits.module.ts
│       │   │   ├── visits.controller.ts
│       │   │   ├── visits.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── visit.schema.ts
│       │   │   └── dto/
│       │   │       ├── create-visit.dto.ts
│       │   │       └── update-visit.dto.ts
│       │   │
│       │   ├── orders/
│       │   │   ├── orders.module.ts
│       │   │   ├── orders.controller.ts
│       │   │   ├── orders.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── order.schema.ts
│       │   │   └── dto/
│       │   │       ├── create-order.dto.ts
│       │   │       ├── update-order.dto.ts
│       │   │       └── update-order-status.dto.ts
│       │   │
│       │   ├── expenses/
│       │   │   ├── expenses.module.ts
│       │   │   ├── expenses.controller.ts
│       │   │   ├── expenses.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── expense.schema.ts
│       │   │   └── dto/
│       │   │       ├── create-expense.dto.ts
│       │   │       ├── update-expense.dto.ts
│       │   │       └── update-expense-status.dto.ts
│       │   │
│       │   ├── incentives/
│       │   │   ├── incentives.module.ts
│       │   │   ├── incentives.controller.ts
│       │   │   ├── incentives.service.ts
│       │   │   ├── schemas/
│       │   │   │   └── incentive.schema.ts
│       │   │   └── dto/
│       │   │       └── calculate-incentive.dto.ts
│       │   │
│       │   ├── dashboard/
│       │   │   ├── dashboard.module.ts
│       │   │   ├── dashboard.controller.ts
│       │   │   └── dashboard.service.ts
│       │   │
│       │   └── notifications/
│       │       ├── notifications.module.ts
│       │       ├── notifications.controller.ts
│       │       ├── notifications.service.ts
│       │       ├── schemas/
│       │       │   └── notification.schema.ts
│       │       └── dto/
│       │           └── create-notification.dto.ts
│       │
│       └── shared/
│           └── utils/
│               ├── pagination.util.ts
│               └── date.util.ts
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── .env.local                 # NEXT_PUBLIC_API_URL
    ├── components.json            # shadcn/ui config
    │
    └── src/
        ├── app/
        │   ├── layout.tsx         # Root layout (providers)
        │   ├── page.tsx           # Landing → redirect
        │   │
        │   ├── (auth)/
        │   │   ├── login/
        │   │   │   └── page.tsx
        │   │   └── layout.tsx     # Centered auth layout
        │   │
        │   └── (dashboard)/
        │       ├── layout.tsx     # Sidebar + topbar shell
        │       │
        │       ├── admin/
        │       │   ├── page.tsx                  # Admin dashboard
        │       │   ├── employees/
        │       │   │   ├── page.tsx              # List employees
        │       │   │   ├── new/page.tsx          # Create employee
        │       │   │   └── [id]/page.tsx         # Employee detail
        │       │   ├── customers/
        │       │   │   ├── page.tsx
        │       │   │   ├── new/page.tsx
        │       │   │   └── [id]/page.tsx
        │       │   ├── orders/
        │       │   │   ├── page.tsx              # All orders
        │       │   │   └── [id]/page.tsx         # Order detail + approval
        │       │   ├── expenses/
        │       │   │   ├── page.tsx              # All expenses
        │       │   │   └── [id]/page.tsx         # Expense detail + approval
        │       │   ├── incentives/
        │       │   │   └── page.tsx              # Incentive overview
        │       │   └── reports/
        │       │       └── page.tsx
        │       │
        │       └── employee/
        │           ├── page.tsx                  # Employee dashboard
        │           ├── customers/
        │           │   ├── page.tsx              # My customers
        │           │   ├── new/page.tsx
        │           │   └── [id]/
        │           │       ├── page.tsx          # Customer detail
        │           │       └── visits/
        │           │           └── new/page.tsx  # Log a visit
        │           ├── orders/
        │           │   ├── page.tsx              # My orders
        │           │   ├── new/page.tsx
        │           │   └── [id]/page.tsx
        │           ├── expenses/
        │           │   ├── page.tsx              # My expenses
        │           │   ├── new/page.tsx
        │           │   └── [id]/page.tsx
        │           └── incentives/
        │               └── page.tsx              # My incentives
        │
        ├── components/
        │   ├── ui/                # shadcn/ui components (auto-generated)
        │   ├── layout/
        │   │   ├── sidebar.tsx
        │   │   ├── topbar.tsx
        │   │   └── mobile-nav.tsx
        │   ├── forms/
        │   │   ├── login-form.tsx
        │   │   ├── customer-form.tsx
        │   │   ├── order-form.tsx
        │   │   ├── expense-form.tsx
        │   │   └── visit-form.tsx
        │   ├── tables/
        │   │   ├── data-table.tsx     # Generic reusable table
        │   │   ├── customers-columns.tsx
        │   │   ├── orders-columns.tsx
        │   │   └── expenses-columns.tsx
        │   ├── dashboard/
        │   │   ├── stat-card.tsx
        │   │   ├── recent-orders.tsx
        │   │   ├── revenue-chart.tsx
        │   │   └── activity-feed.tsx
        │   └── shared/
        │       ├── status-badge.tsx
        │       ├── approval-actions.tsx
        │       ├── confirm-dialog.tsx
        │       └── empty-state.tsx
        │
        ├── lib/
        │   ├── api-client.ts       # Axios instance with interceptors
        │   ├── auth.ts             # Token storage, refresh logic
        │   ├── utils.ts            # cn() helper, formatters
        │   └── validations/
        │       ├── auth.schema.ts
        │       ├── customer.schema.ts
        │       ├── order.schema.ts
        │       └── expense.schema.ts
        │
        ├── hooks/
        │   ├── use-auth.ts
        │   ├── use-customers.ts
        │   ├── use-orders.ts
        │   ├── use-expenses.ts
        │   └── use-notifications.ts
        │
        ├── providers/
        │   ├── query-provider.tsx   # TanStack Query
        │   └── auth-provider.tsx    # Auth context
        │
        ├── types/
        │   ├── auth.types.ts
        │   ├── user.types.ts
        │   ├── customer.types.ts
        │   ├── order.types.ts
        │   ├── expense.types.ts
        │   ├── incentive.types.ts
        │   ├── visit.types.ts
        │   └── notification.types.ts
        │
        └── constants/
            ├── nav-items.ts
            └── status-options.ts
```

---

## 3. MongoDB Collections

### 3.1 `users`
```
{
  _id:          ObjectId,
  name:         String (required),
  email:        String (required, unique, indexed),
  phone:        String (required),
  password:     String (required, hashed),
  role:         String (enum: "ADMIN" | "EMPLOYEE"),
  isActive:     Boolean (default: true),
  refreshToken: String (nullable, hashed),
  createdBy:    ObjectId (ref: users, nullable — null for initial admin),
  createdAt:    Date,
  updatedAt:    Date
}

Indexes: { email: 1 } unique, { role: 1 }, { isActive: 1 }
```

### 3.2 `customers`
```
{
  _id:          ObjectId,
  name:         String (required),
  email:        String,
  phone:        String (required),
  company:      String,
  address: {
    street:     String,
    city:       String (required),
    state:      String (required),
    pincode:    String
  },
  assignedTo:   ObjectId (ref: users, required — the marketing employee),
  notes:        String,
  isActive:     Boolean (default: true),
  createdAt:    Date,
  updatedAt:    Date
}

Indexes: { assignedTo: 1 }, { phone: 1 }, { "address.city": 1 }
```

### 3.3 `visits`
```
{
  _id:          ObjectId,
  customer:     ObjectId (ref: customers, required),
  visitedBy:    ObjectId (ref: users, required),
  visitDate:    Date (required),
  purpose:      String (enum: "FOLLOW_UP" | "NEW_PITCH" | "DEMO" |
                              "COMPLAINT" | "COLLECTION" | "OTHER"),
  notes:        String,
  outcome:      String (enum: "POSITIVE" | "NEUTRAL" | "NEGATIVE"),
  nextFollowUp: Date (nullable),
  createdAt:    Date,
  updatedAt:    Date
}

Indexes: { customer: 1, visitDate: -1 }, { visitedBy: 1, visitDate: -1 }
```

### 3.4 `orders`
```
{
  _id:            ObjectId,
  orderNumber:    String (auto-generated, unique — e.g. "ORD-20260926-001"),
  customer:       ObjectId (ref: customers, required),
  createdBy:      ObjectId (ref: users, required — the employee),
  items: [{
    description:  String (required),
    quantity:     Number (required, min: 1),
    unitPrice:    Number (required, min: 0),
    total:        Number (computed: quantity × unitPrice)
  }],
  totalAmount:    Number (computed: sum of item totals),
  status:         String (enum: "DRAFT" | "PENDING_APPROVAL" |
                                "APPROVED" | "REJECTED" |
                                "DELIVERED" | "CANCELLED"),
  approvedBy:     ObjectId (ref: users, nullable),
  approvedAt:     Date (nullable),
  rejectionReason:String (nullable),
  notes:          String,
  createdAt:      Date,
  updatedAt:      Date
}

Indexes: { orderNumber: 1 } unique, { customer: 1 },
         { createdBy: 1, status: 1 }, { status: 1, createdAt: -1 }
```

### 3.5 `expenses`
```
{
  _id:            ObjectId,
  expenseNumber:  String (auto-generated, unique — e.g. "EXP-20260926-001"),
  submittedBy:    ObjectId (ref: users, required),
  category:       String (enum: "TRAVEL" | "FOOD" | "ACCOMMODATION" |
                                "COMMUNICATION" | "MARKETING_MATERIAL" |
                                "CLIENT_ENTERTAINMENT" | "OTHER"),
  description:    String (required),
  amount:         Number (required, min: 0),
  receiptUrl:     String (nullable — file path or URL),
  expenseDate:    Date (required),
  status:         String (enum: "DRAFT" | "PENDING_APPROVAL" |
                                "APPROVED" | "REJECTED"),
  approvedBy:     ObjectId (ref: users, nullable),
  approvedAt:     Date (nullable),
  rejectionReason:String (nullable),
  createdAt:      Date,
  updatedAt:      Date
}

Indexes: { submittedBy: 1, status: 1 }, { status: 1, createdAt: -1 },
         { expenseDate: -1 }
```

### 3.6 `incentives`
```
{
  _id:             ObjectId,
  employee:        ObjectId (ref: users, required),
  period: {
    month:         Number (1-12),
    year:          Number
  },
  metrics: {
    totalOrders:       Number,
    approvedOrders:    Number,
    totalRevenue:      Number,
    totalVisits:       Number,
    newCustomers:      Number
  },
  incentiveAmount:   Number (computed),
  calculationBreakdown: [{
    rule:            String (e.g. "5% of revenue above ₹50,000"),
    amount:          Number
  }],
  status:            String (enum: "CALCULATED" | "APPROVED" | "PAID"),
  approvedBy:        ObjectId (ref: users, nullable),
  paidAt:            Date (nullable),
  createdAt:         Date,
  updatedAt:         Date
}

Indexes: { employee: 1, "period.year": 1, "period.month": 1 } unique,
         { status: 1 }
```

### 3.7 `notifications`
```
{
  _id:          ObjectId,
  recipient:    ObjectId (ref: users, required),
  type:         String (enum: "ORDER_SUBMITTED" | "ORDER_APPROVED" |
                              "ORDER_REJECTED" | "EXPENSE_SUBMITTED" |
                              "EXPENSE_APPROVED" | "EXPENSE_REJECTED" |
                              "INCENTIVE_CALCULATED" | "VISIT_REMINDER" |
                              "GENERAL"),
  title:        String (required),
  message:      String (required),
  referenceId:  ObjectId (nullable — the related order/expense/etc.),
  referenceType:String (nullable — "Order" | "Expense" | "Incentive"),
  isRead:       Boolean (default: false),
  createdAt:    Date
}

Indexes: { recipient: 1, isRead: 1, createdAt: -1 }
```

---

## 4. Entity Relationships

```
                    ┌──────────┐
           ┌───────│  users   │───────┐
           │       └──────────┘       │
           │        role: ADMIN       │  role: EMPLOYEE
           │        or EMPLOYEE       │
           │                          │
     ┌─────▼──────┐           ┌──────▼─────────┐
     │ approves   │           │ creates /      │
     │ orders     │           │ is assigned    │
     │ expenses   │           │                │
     │ incentives │           │                │
     └────────────┘    ┌──────▼──────┐         │
                       │  customers  │◄────────┘ (assignedTo)
                       └──────┬──────┘
                              │
                  ┌───────────┼───────────┐
                  │           │           │
           ┌──────▼──┐ ┌─────▼───┐ ┌─────▼─────┐
           │ visits  │ │ orders  │ │           │
           │         │ │         │ │           │
           └─────────┘ └─────────┘ │           │
                                    │           │
                              ┌─────▼─────┐    │
                              │ expenses  │    │
                              │(employee) │    │
                              └───────────┘    │
                                               │
                              ┌────────────────▼┐
                              │  incentives     │
                              │  (derived from  │
                              │   orders +      │
                              │   visits)       │
                              └─────────────────┘
```

### Relationship Summary

| From | To | Type | FK Field | Description |
|---|---|---|---|---|
| `customers` | `users` | Many → One | `assignedTo` | Employee responsible for customer |
| `visits` | `customers` | Many → One | `customer` | Visit is for a customer |
| `visits` | `users` | Many → One | `visitedBy` | Employee who visited |
| `orders` | `customers` | Many → One | `customer` | Order placed for customer |
| `orders` | `users` | Many → One | `createdBy` | Employee who created order |
| `orders` | `users` | Many → One | `approvedBy` | Admin who approved/rejected |
| `expenses` | `users` | Many → One | `submittedBy` | Employee who submitted |
| `expenses` | `users` | Many → One | `approvedBy` | Admin who approved/rejected |
| `incentives` | `users` | Many → One | `employee` | Employee earning incentive |
| `incentives` | `users` | Many → One | `approvedBy` | Admin who approved |
| `notifications` | `users` | Many → One | `recipient` | User who receives it |

---

## 5. API Module Structure

### Auth Module
```
POST   /api/auth/login              # Login → access + refresh tokens
POST   /api/auth/register           # Admin creates employee account
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/logout             # Invalidate refresh token
GET    /api/auth/me                 # Get current user profile
PATCH  /api/auth/change-password    # Change own password
```

### Users Module
```
GET    /api/users                   # List all users          [ADMIN]
GET    /api/users/:id               # Get user by ID          [ADMIN]
PATCH  /api/users/:id               # Update user             [ADMIN]
PATCH  /api/users/:id/toggle-active # Activate/deactivate     [ADMIN]
```

### Customers Module
```
GET    /api/customers               # List customers (filtered by role)
POST   /api/customers               # Create customer         [EMPLOYEE]
GET    /api/customers/:id           # Get customer detail
PATCH  /api/customers/:id           # Update customer
DELETE /api/customers/:id           # Soft delete             [ADMIN]
GET    /api/customers/:id/visits    # Get visits for customer
GET    /api/customers/:id/orders    # Get orders for customer
```

### Visits Module
```
GET    /api/visits                   # List visits (filtered by role)
POST   /api/visits                   # Log a visit            [EMPLOYEE]
GET    /api/visits/:id               # Get visit detail
PATCH  /api/visits/:id               # Update visit           [EMPLOYEE, own]
DELETE /api/visits/:id               # Delete visit           [ADMIN]
```

### Orders Module
```
GET    /api/orders                   # List orders (filtered by role)
POST   /api/orders                   # Create order           [EMPLOYEE]
GET    /api/orders/:id               # Get order detail
PATCH  /api/orders/:id               # Update order (draft)   [EMPLOYEE, own]
POST   /api/orders/:id/submit       # Submit for approval     [EMPLOYEE, own]
PATCH  /api/orders/:id/approve      # Approve order           [ADMIN]
PATCH  /api/orders/:id/reject       # Reject order            [ADMIN]
PATCH  /api/orders/:id/deliver      # Mark delivered          [ADMIN]
PATCH  /api/orders/:id/cancel       # Cancel order            [ADMIN]
```

### Expenses Module
```
GET    /api/expenses                 # List expenses (filtered by role)
POST   /api/expenses                 # Create expense         [EMPLOYEE]
GET    /api/expenses/:id             # Get expense detail
PATCH  /api/expenses/:id             # Update expense (draft) [EMPLOYEE, own]
POST   /api/expenses/:id/submit     # Submit for approval     [EMPLOYEE, own]
PATCH  /api/expenses/:id/approve    # Approve expense         [ADMIN]
PATCH  /api/expenses/:id/reject     # Reject expense          [ADMIN]
```

### Incentives Module
```
GET    /api/incentives               # List incentives (filtered by role)
GET    /api/incentives/:id           # Get incentive detail
POST   /api/incentives/calculate    # Calculate for period    [ADMIN]
PATCH  /api/incentives/:id/approve  # Approve payment         [ADMIN]
PATCH  /api/incentives/:id/pay      # Mark as paid            [ADMIN]
```

### Dashboard Module
```
GET    /api/dashboard/admin          # Admin KPIs & summaries  [ADMIN]
GET    /api/dashboard/employee       # Employee KPIs           [EMPLOYEE]
```

### Notifications Module
```
GET    /api/notifications            # List my notifications
PATCH  /api/notifications/:id/read  # Mark as read
PATCH  /api/notifications/read-all  # Mark all as read
GET    /api/notifications/unread-count # Unread count
```

### Reports Module (part of Dashboard)
```
GET    /api/reports/orders           # Order reports            [ADMIN]
GET    /api/reports/expenses         # Expense reports          [ADMIN]
GET    /api/reports/employees        # Employee performance     [ADMIN]
GET    /api/reports/revenue          # Revenue reports          [ADMIN]
```

---

## 6. Authentication Architecture

```
┌─────────┐       POST /auth/login         ┌────────────┐
│ Client  │ ──────────────────────────────► │ AuthService│
│         │  { email, password }            │            │
│         │ ◄────────────────────────────── │ validate   │
│         │  { accessToken, refreshToken }  │ credentials│
└────┬────┘                                 └────────────┘
     │
     │  Every subsequent request:
     │  Authorization: Bearer <accessToken>
     │
     ▼
┌─────────┐   accessToken expired?          ┌────────────┐
│ Client  │ ──────────────────────────────► │ AuthService│
│         │  POST /auth/refresh             │            │
│         │  { refreshToken }               │ verify &   │
│         │ ◄────────────────────────────── │ rotate     │
│         │  { accessToken, refreshToken }  │ refresh    │
└─────────┘  (new pair)                     └────────────┘
```

### Token Specifications

| Property | Access Token | Refresh Token |
|---|---|---|
| Lifetime | 15 minutes | 7 days |
| Payload | `{ sub, email, role }` | `{ sub }` |
| Storage (client) | Memory (JS variable) | `httpOnly` cookie or secure storage |
| Storage (server) | Stateless | Hashed in `users.refreshToken` |
| Rotation | Every refresh | Every refresh (invalidates old) |

### Token Flow

1. **Login**: Validate credentials → issue access + refresh tokens → store hashed refresh in DB.
2. **Authenticated request**: `JwtAuthGuard` validates access token from `Authorization` header.
3. **Token refresh**: Verify refresh token matches DB hash → issue new pair → update DB hash.
4. **Logout**: Clear `refreshToken` in DB → client discards tokens.

### Frontend Token Management (api-client.ts)

```
Request interceptor:
  → Attach accessToken from memory to Authorization header

Response interceptor:
  → On 401: attempt /auth/refresh
    → Success: retry original request with new token
    → Failure: redirect to /login
```

---

## 7. Authorization / RBAC Design

### Roles

| Role | Code | Description |
|---|---|---|
| Admin | `ADMIN` | Full system access. Manages employees, approves orders/expenses, views reports. |
| Employee | `EMPLOYEE` | Manages own customers, visits, orders, expenses. Views own incentives. |

### Permission Matrix

| Resource | Action | ADMIN | EMPLOYEE |
|---|---|---|---|
| **Users** | Create (register) | ✅ | ❌ |
| | List all | ✅ | ❌ |
| | View any | ✅ | ❌ |
| | Update any | ✅ | ❌ |
| | Toggle active | ✅ | ❌ |
| **Profile** | View own | ✅ | ✅ |
| | Change password | ✅ | ✅ |
| **Customers** | Create | ✅ | ✅ |
| | List all | ✅ | ❌ |
| | List own (assigned) | — | ✅ |
| | View any | ✅ | ❌ |
| | View own | — | ✅ |
| | Update any | ✅ | ❌ |
| | Update own | — | ✅ |
| **Visits** | Create | ❌ | ✅ (own customers) |
| | List all | ✅ | ❌ |
| | List own | — | ✅ |
| | View any | ✅ | ❌ |
| | View own | — | ✅ |
| **Orders** | Create | ❌ | ✅ |
| | List all | ✅ | ❌ |
| | List own | — | ✅ |
| | Submit for approval | ❌ | ✅ (own, draft only) |
| | Approve / Reject | ✅ | ❌ |
| | Mark delivered | ✅ | ❌ |
| | Cancel | ✅ | ❌ |
| **Expenses** | Create | ❌ | ✅ |
| | List all | ✅ | ❌ |
| | List own | — | ✅ |
| | Submit for approval | ❌ | ✅ (own, draft only) |
| | Approve / Reject | ✅ | ❌ |
| **Incentives** | View all | ✅ | ❌ |
| | View own | — | ✅ |
| | Calculate | ✅ | ❌ |
| | Approve / Pay | ✅ | ❌ |
| **Dashboard** | Admin dashboard | ✅ | ❌ |
| | Employee dashboard | ❌ | ✅ |
| **Reports** | All reports | ✅ | ❌ |
| **Notifications** | Own notifications | ✅ | ✅ |

### Implementation: Guard Stack

```
Request
  │
  ▼
┌──────────────┐    Token invalid?
│ JwtAuthGuard │ ──────────────────► 401 Unauthorized
│ (Global)     │
└──────┬───────┘
       │ Token valid → attach user to request
       ▼
┌──────────────┐    Role not in @Roles()?
│ RolesGuard   │ ──────────────────► 403 Forbidden
│ (Per route)  │
└──────┬───────┘
       │ Role matches
       ▼
┌──────────────┐    resource.createdBy !== req.user?
│ Ownership    │ ──────────────────► 403 Forbidden
│ Guard        │    (for EMPLOYEE on own-resource routes)
│ (Per route)  │
└──────┬───────┘
       │ All passed
       ▼
   Controller
```

### Decorators
- `@Public()` — bypass all guards (login, register endpoints)
- `@Roles(Role.ADMIN)` — restrict to admin
- `@Roles(Role.EMPLOYEE)` — restrict to employee
- `@Roles(Role.ADMIN, Role.EMPLOYEE)` — both roles
- `@CurrentUser()` — extract user from request

### Data Scoping (Service Layer)
- **ADMIN** queries: no filter → sees all records
- **EMPLOYEE** queries: auto-filter by `createdBy` / `assignedTo` / `submittedBy` = current user

---

## 8. Order State Workflow

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │
              Employee submits
              POST /orders/:id/submit
                         │
                         ▼
                ┌─────────────────┐
                │PENDING_APPROVAL │
                └────────┬────────┘
                         │
             ┌───────────┼───────────┐
             │           │           │
      Admin approves   Admin       Employee/Admin
      PATCH /approve   rejects     cancels
             │         PATCH       PATCH /cancel
             │         /reject     (from PENDING
             ▼           │          or APPROVED)
        ┌────────┐  ┌────▼────┐       │
        │APPROVED│  │REJECTED │       │
        └───┬────┘  └─────────┘       │
            │                         │
     Admin marks                      │
     delivered                        ▼
     PATCH /deliver             ┌───────────┐
            │                   │ CANCELLED │
            ▼                   └───────────┘
      ┌───────────┐
      │ DELIVERED │
      └───────────┘
```

### State Transition Rules

| Current State | Action | Next State | Who | Conditions |
|---|---|---|---|---|
| — | Create | `DRAFT` | EMPLOYEE | — |
| `DRAFT` | Edit | `DRAFT` | EMPLOYEE (own) | Can modify items, amounts |
| `DRAFT` | Submit | `PENDING_APPROVAL` | EMPLOYEE (own) | Must have ≥1 item |
| `PENDING_APPROVAL` | Approve | `APPROVED` | ADMIN | Sets `approvedBy`, `approvedAt` |
| `PENDING_APPROVAL` | Reject | `REJECTED` | ADMIN | Requires `rejectionReason` |
| `PENDING_APPROVAL` | Cancel | `CANCELLED` | ADMIN | — |
| `APPROVED` | Deliver | `DELIVERED` | ADMIN | — |
| `APPROVED` | Cancel | `CANCELLED` | ADMIN | — |
| `REJECTED` | — | (terminal) | — | Employee can create new order |
| `DELIVERED` | — | (terminal) | — | — |
| `CANCELLED` | — | (terminal) | — | — |

### Notifications Triggered

| Transition | Notify |
|---|---|
| → `PENDING_APPROVAL` | All ADMINs: "New order awaiting approval" |
| → `APPROVED` | Order creator (EMPLOYEE): "Your order was approved" |
| → `REJECTED` | Order creator (EMPLOYEE): "Your order was rejected" |
| → `DELIVERED` | Order creator (EMPLOYEE): "Order marked as delivered" |

---

## 9. Incentive Calculation Workflow

```
┌────────────────────────────────────────────────────────────┐
│                   ADMIN triggers calculation                │
│              POST /api/incentives/calculate                 │
│              { month: 9, year: 2026 }                       │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │  For each active EMPLOYEE:  │
          └──────────────┬──────────────┘
                         │
         ┌───────────────┼───────────────────┐
         ▼               ▼                   ▼
   ┌───────────┐  ┌────────────┐     ┌─────────────┐
   │ Count     │  │ Sum total  │     │ Count       │
   │ DELIVERED │  │ revenue of │     │ visits in   │
   │ orders in │  │ delivered  │     │ the period  │
   │ period    │  │ orders     │     │             │
   └─────┬─────┘  └──────┬─────┘     └──────┬──────┘
         │               │                  │
         └───────────────┼──────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │    Apply Incentive Rules     │
          │                              │
          │ Rule 1: Base commission      │
          │   → 2% of total revenue      │
          │                              │
          │ Rule 2: Volume bonus         │
          │   → ≥10 delivered orders:    │
          │     +₹1,000                  │
          │                              │
          │ Rule 3: Visit activity       │
          │   → ≥20 visits: +₹500       │
          │                              │
          │ Rule 4: Revenue tier bonus   │
          │   → Revenue > ₹1,00,000:    │
          │     additional 1%            │
          │   → Revenue > ₹2,50,000:    │
          │     additional 2%            │
          │                              │
          │ (Rules are configurable;     │
          │  these are initial defaults) │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Create/Update incentive     │
          │  record with breakdown       │
          │  Status: CALCULATED          │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Notify EMPLOYEE:            │
          │  "Incentive calculated for   │
          │   September 2026: ₹X,XXX"   │
          └──────────────────────────────┘
```

### Incentive Lifecycle

```
  CALCULATED ──► APPROVED ──► PAID
      │              │
      │              └─── Admin approves (confirms amounts)
      └──────────── Admin can recalculate (overwrites)
```

### Key Design Decisions

1. **Incentives are derived data** — computed from orders, visits, and revenue. They are not manually entered.
2. **Only DELIVERED orders count** — pending/approved-but-undelivered orders do not contribute to incentives.
3. **Period granularity is monthly** — one incentive record per employee per month.
4. **Rules are code-defined initially** — a future phase could move them to a DB-configurable rules table.
5. **Recalculation replaces** — running calculate for an existing period overwrites the record (if status is still `CALCULATED`).

---

## 10. Expense Approval Workflow

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │
              Employee submits
              POST /expenses/:id/submit
                         │
                         ▼
                ┌─────────────────┐
                │PENDING_APPROVAL │
                └────────┬────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
      Admin approves          Admin rejects
      PATCH /approve          PATCH /reject
             │                       │
             ▼                       ▼
        ┌────────┐            ┌──────────┐
        │APPROVED│            │ REJECTED │
        └────────┘            └──────────┘
        (terminal)            (terminal — employee
                               can submit new expense)
```

### State Transition Rules

| Current State | Action | Next State | Who | Conditions |
|---|---|---|---|---|
| — | Create | `DRAFT` | EMPLOYEE | — |
| `DRAFT` | Edit | `DRAFT` | EMPLOYEE (own) | Can modify all fields |
| `DRAFT` | Submit | `PENDING_APPROVAL` | EMPLOYEE (own) | Required: amount > 0, category, date |
| `PENDING_APPROVAL` | Approve | `APPROVED` | ADMIN | Sets `approvedBy`, `approvedAt` |
| `PENDING_APPROVAL` | Reject | `REJECTED` | ADMIN | Requires `rejectionReason` |
| `APPROVED` | — | (terminal) | — | — |
| `REJECTED` | — | (terminal) | — | Employee creates new expense |

### Notifications Triggered

| Transition | Notify |
|---|---|
| → `PENDING_APPROVAL` | All ADMINs: "New expense awaiting approval" |
| → `APPROVED` | Submitter (EMPLOYEE): "Your expense was approved" |
| → `REJECTED` | Submitter (EMPLOYEE): "Your expense was rejected" |

### Expense Categories
- `TRAVEL` — fuel, tickets, toll
- `FOOD` — meals during work
- `ACCOMMODATION` — hotel stays
- `COMMUNICATION` — phone, internet
- `MARKETING_MATERIAL` — brochures, samples
- `CLIENT_ENTERTAINMENT` — gifts, dinners
- `OTHER` — anything else (requires description)

---

## 11. Frontend Route Structure

### Public Routes (no auth required)
| Path | Page | Description |
|---|---|---|
| `/login` | Login | Email + password login |

### Admin Routes (role: ADMIN)
| Path | Page | Description |
|---|---|---|
| `/admin` | Dashboard | KPIs: revenue, orders, employees, expenses |
| `/admin/employees` | Employee List | Table with search, filter, pagination |
| `/admin/employees/new` | Create Employee | Registration form |
| `/admin/employees/[id]` | Employee Detail | Profile, performance, assigned customers |
| `/admin/customers` | All Customers | All customers across employees |
| `/admin/customers/new` | Create Customer | Assign to employee |
| `/admin/customers/[id]` | Customer Detail | Info, visits, orders |
| `/admin/orders` | All Orders | Filter by status, employee, date |
| `/admin/orders/[id]` | Order Detail | Items, approval actions |
| `/admin/expenses` | All Expenses | Filter by status, employee, category |
| `/admin/expenses/[id]` | Expense Detail | Details, approval actions |
| `/admin/incentives` | Incentives | Calculate, view, approve, mark paid |
| `/admin/reports` | Reports | Order, revenue, expense, employee reports |

### Employee Routes (role: EMPLOYEE)
| Path | Page | Description |
|---|---|---|
| `/employee` | Dashboard | My KPIs: orders, visits, incentives |
| `/employee/customers` | My Customers | Assigned customers |
| `/employee/customers/new` | New Customer | Create customer |
| `/employee/customers/[id]` | Customer Detail | Info, visit history, orders |
| `/employee/customers/[id]/visits/new` | Log Visit | Visit form |
| `/employee/orders` | My Orders | My orders with status |
| `/employee/orders/new` | New Order | Select customer, add items |
| `/employee/orders/[id]` | Order Detail | View status, items |
| `/employee/expenses` | My Expenses | My expenses with status |
| `/employee/expenses/new` | New Expense | Expense form |
| `/employee/expenses/[id]` | Expense Detail | View status |
| `/employee/incentives` | My Incentives | Monthly incentive history |

### Route Protection
- Unauthenticated → redirect to `/login`
- ADMIN accessing `/employee/*` → redirect to `/admin`
- EMPLOYEE accessing `/admin/*` → redirect to `/employee`
- `/` → redirect based on role

---

## 12. Backend Module Structure

```
AppModule
├── ConfigModule (Global)
│   └── Loads .env, validates required vars
│
├── DatabaseModule (Global)
│   └── MongooseModule.forRootAsync() → MongoDB Atlas connection
│
├── AuthModule
│   ├── JwtModule (access token signing)
│   ├── PassportModule
│   ├── JwtStrategy
│   ├── JwtRefreshStrategy
│   ├── AuthController
│   ├── AuthService
│   └── Depends on: UsersModule
│
├── UsersModule
│   ├── UserSchema (Mongoose)
│   ├── UsersController
│   ├── UsersService
│   └── Exports: UsersService
│
├── CustomersModule
│   ├── CustomerSchema (Mongoose)
│   ├── CustomersController
│   ├── CustomersService
│   └── Depends on: UsersModule
│
├── VisitsModule
│   ├── VisitSchema (Mongoose)
│   ├── VisitsController
│   ├── VisitsService
│   └── Depends on: CustomersModule
│
├── OrdersModule
│   ├── OrderSchema (Mongoose)
│   ├── OrdersController
│   ├── OrdersService
│   └── Depends on: CustomersModule, NotificationsModule
│
├── ExpensesModule
│   ├── ExpenseSchema (Mongoose)
│   ├── ExpensesController
│   ├── ExpensesService
│   └── Depends on: NotificationsModule
│
├── IncentivesModule
│   ├── IncentiveSchema (Mongoose)
│   ├── IncentivesController
│   ├── IncentivesService
│   └── Depends on: OrdersModule, VisitsModule, NotificationsModule
│
├── DashboardModule
│   ├── DashboardController
│   ├── DashboardService
│   └── Depends on: OrdersModule, CustomersModule, ExpensesModule,
│                     VisitsModule, IncentivesModule
│
└── NotificationsModule
    ├── NotificationSchema (Mongoose)
    ├── NotificationsController
    ├── NotificationsService
    └── Exports: NotificationsService
```

### Module Dependency Graph

```
                    ┌───────────┐
                    │  AppModule│
                    └─────┬─────┘
                          │
        ┌────────┬────────┼────────┬──────────┐
        ▼        ▼        ▼        ▼          ▼
    ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ ┌──────────┐
    │Config│ │  DB  │ │ Auth │ │ Users │ │Notif.    │
    └──────┘ └──────┘ └──┬───┘ └───┬───┘ └────┬─────┘
                         │         │           │
                     uses│    ◄────┘      ◄────┤
                         │                     │
              ┌──────────┼──────────┐          │
              ▼          ▼          ▼          │
        ┌──────────┐ ┌──────┐ ┌────────┐      │
        │Customers │ │Visits│ │Orders  │──────┘
        └────┬─────┘ └──┬───┘ └────┬───┘
             │          │          │
             └──────────┼──────────┘
                        │
                ┌───────┼───────┐
                ▼       ▼       ▼
          ┌──────────┐ ┌──────────┐
          │Incentives│ │Dashboard │
          └──────────┘ └──────────┘
          │Expenses  │
          └──────────┘
```

### Global Providers (registered in AppModule)

| Provider | Purpose |
|---|---|
| `JwtAuthGuard` (APP_GUARD) | Protect all routes by default |
| `RolesGuard` (APP_GUARD) | Check `@Roles()` decorator |
| `TransformInterceptor` | Wrap responses: `{ success, data, message }` |
| `HttpExceptionFilter` | Standardize error responses |
| `ValidationPipe` | Auto-validate DTOs with class-validator |

---

## 13. Development Phases

### Phase 1: Foundation (Week 1)
> Goal: Monorepo setup, auth, basic CRUD

**Backend**
- [ ] Initialize NestJS project in `backend/`
- [ ] Configure MongoDB Atlas connection
- [ ] Set up ConfigModule with environment validation
- [ ] Implement User schema and UsersModule
- [ ] Implement AuthModule (login, register, JWT, refresh)
- [ ] Set up global guards (JwtAuthGuard, RolesGuard)
- [ ] Set up global pipes, filters, interceptors
- [ ] Seed script: create initial ADMIN user

**Frontend**
- [ ] Initialize Next.js project in `frontend/`
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Set up project structure (providers, lib, types)
- [ ] Implement AuthProvider and auth context
- [ ] Build API client with Axios interceptors
- [ ] Build Login page
- [ ] Build Dashboard layout (sidebar, topbar)
- [ ] Implement route protection (middleware)

**Deliverable**: Admin can log in, register employees, see empty dashboard shell.

---

### Phase 2: Core Entities (Week 2)
> Goal: Customer and visit management

**Backend**
- [ ] Implement CustomerSchema and CustomersModule (full CRUD)
- [ ] Implement VisitSchema and VisitsModule (full CRUD)
- [ ] Data scoping: employees see only assigned customers
- [ ] Implement pagination utility
- [ ] Add search/filter query support

**Frontend**
- [ ] Build reusable DataTable component
- [ ] Build Customer list, create, detail pages (admin + employee)
- [ ] Build Customer form with React Hook Form + Zod
- [ ] Build Visit log form
- [ ] Build Visit history on customer detail page

**Deliverable**: Full customer + visit management for both roles.

---

### Phase 3: Orders & Approvals (Week 3)
> Goal: Order lifecycle with approval workflow

**Backend**
- [ ] Implement OrderSchema and OrdersModule
- [ ] Order number auto-generation
- [ ] State machine for order transitions (with validation)
- [ ] Implement NotificationsModule
- [ ] Trigger notifications on status changes

**Frontend**
- [ ] Build Order list page (filterable by status)
- [ ] Build Order creation form (select customer, add items)
- [ ] Build Order detail page with status timeline
- [ ] Build Approval UI for admin (approve/reject with reason)
- [ ] Build notification dropdown in topbar
- [ ] Build StatusBadge component

**Deliverable**: Complete order → approval → delivery workflow.

---

### Phase 4: Expenses & Incentives (Week 4)
> Goal: Expense management and incentive calculation

**Backend**
- [ ] Implement ExpenseSchema and ExpensesModule
- [ ] Expense approval workflow (similar to orders)
- [ ] Implement IncentiveSchema and IncentivesModule
- [ ] Incentive calculation logic (aggregate orders + visits)

**Frontend**
- [ ] Build Expense list, create, detail pages
- [ ] Build Expense form (category, amount, receipt)
- [ ] Build Expense approval UI for admin
- [ ] Build Incentive overview page (admin)
- [ ] Build My Incentives page (employee)
- [ ] Build incentive calculation trigger UI

**Deliverable**: Full expense + incentive management.

---

### Phase 5: Dashboards & Reports (Week 5)
> Goal: Analytics, KPIs, and reports

**Backend**
- [ ] Implement DashboardModule (aggregation queries)
- [ ] Admin KPIs: total revenue, order count, expense total, active employees
- [ ] Employee KPIs: my orders, my visits, my incentives
- [ ] Report endpoints with date range filters

**Frontend**
- [ ] Build Admin dashboard with stat cards and charts
- [ ] Build Employee dashboard with personal KPIs
- [ ] Build Reports page (orders, revenue, expenses, employees)
- [ ] Build charts using a lightweight chart library

**Deliverable**: Data-driven dashboards for both roles.

---

### Phase 6: Polish & Production (Week 6)
> Goal: Production readiness

- [ ] Error handling audit (all edge cases)
- [ ] Loading states and skeleton screens everywhere
- [ ] Empty states for all list pages
- [ ] Responsive design audit (mobile-friendly)
- [ ] Form validation messages UX pass
- [ ] Toast notifications for all actions
- [ ] Rate limiting on auth endpoints
- [ ] Request logging
- [ ] Environment-based configuration (dev/staging/prod)
- [ ] Build & deploy scripts
- [ ] README with setup instructions

**Deliverable**: Production-ready application.

---

## Appendix: Standard API Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Customer created successfully"
}
```

### Success (paginated)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ],
  "statusCode": 400
}
```

---

## Appendix: Environment Variables

### Backend (.env)
```
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/lathikka?retryWrites=true&w=majority

# JWT
JWT_ACCESS_SECRET=<random-64-char>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=<random-64-char>
JWT_REFRESH_EXPIRATION=7d

# Admin Seed
ADMIN_EMAIL=admin@lathikka.com
ADMIN_PASSWORD=<initial-password>
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
