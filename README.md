# University Lab Resources Allocation System (DBMS Level 3)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)

A comprehensive, production-grade university management system built for **DBMS Level 3 academic curriculum**. It manages laboratory facilities, specialized hardware assets (GPUs, FPGAs, oscilloscopes, robotic arms), student and faculty reservation requests, administrative approvals, and maintenance schedules.

The system combines an **ACID-compliant MySQL relational database** with an **event-driven MongoDB document audit stream** via the Transactional Outbox pattern.

---

## 🏛️ Project Architecture Overview

```
                        +----------------------------+
                        |  Next.js 15+ App Router    |
                        |  React 19, Tailwind CSS    |
                        +--------------+-------------+
                                       |
                 +---------------------+---------------------+
                 | (ACID Relational Core)                    | (Event-Driven Audit)
                 v                                           v
       +-------------------+                       +-------------------+
       |     MySQL 8.0+    |                       |   MongoDB NoSQL   |
       |  Normalized 3NF   |                       |   Audit Events    |
       |  InnoDB Engine    |                       |   Aggregations    |
       |  Triggers & Views |                       |   Outbox Sync     |
       |  Stored Procs     |                       +-------------------+
       +-------------------+
```

---

## 🔑 Key Features

1. **Concurrency-Safe Allocation Engine**:
   - Strictly enforces mathematical overlap condition: `existing_start < requested_end AND existing_end > requested_start`.
   - Prevents race conditions and overbooking using deterministic row-level locking order (`resource_id` ascending).
   - Dynamic real-time inventory calculation:
     $$\text{Available} = \text{Total Quantity} - \text{Overlapping Bookings} - \text{Maintenance Outages}$$

2. **Dual-Database Paradigm**:
   - **MySQL 8.0+**: Primary authoritative data store for bookings, labs, inventory, approvals, and maintenance.
   - **MongoDB**: Event-sourced audit trail (`audit_events` collection) with polymorphic JSON metadata and multi-stage aggregation analytics.
   - **Transactional Outbox Pattern**: Guaranteed zero data loss between MySQL and MongoDB.

3. **Advanced Relational SQL Features**:
   - **Views**: `view_lab_utilization`, `view_resource_availability`, `view_pending_bookings`, `view_booking_summaries`.
   - **Stored Procedures & Functions**: `sp_check_lab_availability`, `sp_calculate_resource_available_qty`, `sp_process_booking_approval`, `fn_get_lab_total_hours`.
   - **Integrity Triggers**: Interval validation, negative inventory prevention, and automatic status transition auditing.
   - **B-Tree Composite Indexing**: Specifically targeted at high-frequency time interval filters and foreign keys.

4. **Institutional Security & RBAC**:
   - Password hashing with **Bcrypt/Argon2** (cost factor 10).
   - Tamper-proof server-side session cookies with **Jose JWT**.
   - Input validation using **Zod** on every API endpoint.
   - Server-side tenant isolation preventing Cross-Student data leakage (BOLA/IDOR protection).

---

## 👥 Demo Personas & Credentials

All default seed accounts use password: **`Password@123`**

| Role | Name | Email | Password |
|---|---|---|---|
| **Administrator** | Dr. Alan Turing | `admin@university.edu` | `Password@123` |
| **Lab Manager** | Prof. Grace Hopper | `manager@university.edu` | `Password@123` |
| **Faculty Member** | Prof. Richard Feynman | `faculty@university.edu` | `Password@123` |
| **Student** | Shreyank S | `student@university.edu` | `Password@123` |
| **Student** | Ada Lovelace | `ada@university.edu` | `Password@123` |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20+ or v24+
- **MySQL Server**: 8.0+ (running locally on port 3306)
- **MongoDB**: Local `mongod` or MongoDB Atlas URI (Note: If no MongoDB daemon is detected, the application automatically boots an embedded in-memory MongoDB instance for seamless demonstration!).

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your MySQL root password:
```bash
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/university_lab_db"
MONGODB_URI="mongodb://127.0.0.1:27017/university_lab_audit"
JWT_SECRET="super-secret-jwt-token-key-university-lab-resource-allocation-2026-min-32-chars"
```

### 3. Initialize MySQL Database & Run Advanced Scripts
Run the prepared SQL scripts to initialize schema, views, procedures, triggers, and seed data:
```bash
# 1. Create schema and tables
mysql -u root -p < database/scripts/schema.sql

# 2. Create indexes
mysql -u root -p university_lab_db < database/scripts/indexes.sql

# 3. Create views
mysql -u root -p university_lab_db < database/scripts/views.sql

# 4. Create stored procedures and functions
mysql -u root -p university_lab_db < database/scripts/procedures.sql

# 5. Create triggers
mysql -u root -p university_lab_db < database/scripts/triggers.sql

# 6. Seed academic dataset
mysql -u root -p university_lab_db < database/scripts/seed.sql
```

Alternatively, you can generate Prisma Client:
```bash
npx prisma generate
```

### 4. Run Demonstration Queries
To test complex JOINs, GROUP BY/HAVING, Subqueries, Stored Procedures, and Transaction Rollback:
```bash
mysql -u root -p university_lab_db < database/scripts/queries_demo.sql
```

### 5. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 6. Run Automated Tests
```bash
npx vitest run tests/allocation.test.ts
```

---

## 📁 Repository Directory Structure

```
├── database/
│   ├── diagrams/
│   │   └── er-diagram.mmd        # Mermaid ER Diagram
│   └── scripts/
│       ├── schema.sql            # DDL schema definition
│       ├── indexes.sql           # Performance B-Tree indexes
│       ├── views.sql             # SQL views (lab utilization, availability)
│       ├── procedures.sql        # Stored procedures and functions
│       ├── triggers.sql          # Integrity and audit triggers
│       ├── seed.sql              # Academic dataset
│       └── queries_demo.sql      # Advanced DBMS demonstration queries
├── docs/
│   ├── requirements.md           # Problem statement & requirements
│   ├── database-design.md        # Relational design & MongoDB notes
│   ├── api-documentation.md      # RESTful API specifications
│   ├── test-cases.md             # Test matrix and results
│   └── architecture.md           # Technical system architecture
├── prisma/
│   └── schema.prisma             # Prisma ORM relational schema
├── src/
│   ├── app/
│   │   ├── admin/                # Administrator pages (Labs, Inventory, Approvals, Reports, Audit)
│   │   ├── api/                  # Backend Next.js route handlers
│   │   ├── bookings/             # Booking creation and history
│   │   ├── dashboard/            # Student and faculty dashboard
│   │   ├── labs/                 # Laboratory directory and details
│   │   ├── login/                # Authentication page
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── layout/               # Navbar, Sidebar, AppShell
│   │   └── ui/                   # Status badges, stat cards
│   ├── lib/
│   │   ├── allocation/           # Critical concurrency allocation engine
│   │   ├── auth/                 # Password hashing & JWT sessions
│   │   ├── db/                   # Prisma & MySQL connection pool
│   │   ├── mongodb/              # MongoDB client, audit service & outbox worker
│   │   └── validation/           # Zod server-side schemas
└── tests/
    └── allocation.test.ts        # Automated unit and integration test suite
```

---

## 👨‍💻 Academic Project Attribution
- **Student**: Shreyank S
- **SRN**: PES1UG24CS443
- **Course**: Database Management Systems (DBMS Level 3)
- **Institution**: PES University
