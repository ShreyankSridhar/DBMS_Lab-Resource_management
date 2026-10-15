# Functional and Non-Functional Requirements Specification

**Project**: University Lab Resources Allocation System  
**Level**: DBMS Level 3 Academic Project  
**Author / Lead**: Shreyank S (PES1UG24CS443)  
**Institution**: Department of Computer Science & Engineering  

---

## 1. Problem Statement

University academic laboratories house critical physical and computational assets—such as high-performance GPU workstations, robotics manipulators, field-programmable gate arrays (FPGAs), logic analyzers, and cryogenic research apparatuses. Traditional lab reservation mechanisms rely either on manual paper logs or naive spreadsheet management. These legacy approaches suffer from critical flaws:
- **Double Bookings & Scheduling Collisions**: Conflicting reservations scheduled for the same room simultaneously.
- **Equipment Hoarding & Shortages**: No correlation between lab seat reservations and physical equipment inventory, causing stock-outs.
- **Concurrency Race Conditions**: Multiple users reserving the final available unit of an expensive workstation at the same millisecond.
- **Lack of Auditing**: Administrative actions (approvals, rejections, overrides) are unrecorded, leading to unaccountable equipment allocation.
- **Maintenance Blindspots**: Scheduled repairs and sensor calibrations fail to automatically block student bookings.

The **University Lab Resources Allocation System** solves these challenges by combining a normalized, ACID-compliant MySQL relational core with a distributed, event-driven MongoDB audit stream.

---

## 2. Functional Requirements

### 2.1 User Management & Security
- **FR-01**: Secure registration and login for Students, Faculty, Lab Managers, and Administrators.
- **FR-02**: Passwords must be hashed using salt-hashed Bcrypt/Argon2. Plain-text passwords must never be stored.
- **FR-03**: Tamper-proof server-side session authentication with `httpOnly`, `SameSite=Lax` cookies containing cryptographically signed JWT tokens.
- **FR-04**: Role-Based Access Control (RBAC) enforced on every backend API endpoint.

### 2.2 Facility & Laboratory Management
- **FR-05**: Maintain laboratory records including room name, building, physical location, seat capacity, status (`AVAILABLE`, `MAINTENANCE`, `INACTIVE`), and description.
- **FR-06**: Administrators can create, update, and toggle laboratory operational statuses.
- **FR-07**: Public/student directory allows searching and filtering facilities by building, status, and keywords.

### 2.3 Resource & Equipment Inventory
- **FR-08**: Hierarchical taxonomy of equipment categorized into distinct classifications (e.g., GPU Workstations, Test & Measurement, Robotics).
- **FR-09**: Maintain total inventory quantities per resource.
- **FR-10**: Real-time derived availability calculation:
  $$\text{Available}(t_1, t_2) = \text{Total Quantity} - \sum \text{Approved/Pending Demands}(t_1, t_2) - \sum \text{Maintenance Outages}(t_1, t_2)$$

### 2.4 Reservation & Critical Allocation Logic
- **FR-11**: Strict interval validation: $\text{End Time} > \text{Start Time}$.
- **FR-12**: Non-overlapping lab booking guarantee: No two blocking bookings (`APPROVED` or `PENDING`) can overlap on the same facility:
  $$\text{Overlap} \iff (\text{Existing Start} < \text{Requested End}) \land (\text{Existing End} > \text{Requested Start})$$
- **FR-13**: Equipment overbooking prevention: Requested units must not exceed remaining available units for that interval.
- **FR-14**: Atomic reservation transaction: All equipment allocations and the lab reservation succeed together or rollback completely.
- **FR-15**: Cancellation mechanism releases reserved units back to available pool immediately.

### 2.5 Administrative Approvals & Governance
- **FR-16**: Pending reservations queue for administrators.
- **FR-17**: Admins can approve or reject with mandatory or optional justification comments.
- **FR-18**: In-app notifications automatically generated and sent to applicants upon state changes.

### 2.6 Maintenance Scheduling
- **FR-19**: Schedule maintenance windows targeting either an entire room or specific equipment.
- **FR-20**: Active maintenance windows immediately block overlapping booking requests.

### 2.7 Dual-Database Audit Trail (MongoDB)
- **FR-21**: Every critical state change (`BOOKING_REQUESTED`, `BOOKING_APPROVED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `RESOURCE_UPDATED`, `SECURITY_ALERT`) is written via a Transactional Outbox pattern into a flexible MongoDB `audit_events` document collection.
- **FR-22**: Multi-stage MongoDB aggregation pipelines summarize activity trends by event type, entity, and date.

---

## 3. Non-Functional Requirements

- **NFR-01 (ACID Consistency)**: Relational booking and inventory operations run within MySQL InnoDB transactions using appropriate isolation levels and row-level locks.
- **NFR-02 (Performance & Scalability)**: Indexes placed on composite foreign keys and temporal ranges (`lab_id, start_time, end_time, status`) ensure sub-50ms conflict detection under high concurrency.
- **NFR-03 (Security & Sanitization)**: Server-side validation using Zod schemas on all API boundaries to prevent injection, type coercion bugs, and parameter tampering.
- **NFR-04 (High Availability & Decoupling)**: Transactional Outbox pattern ensures that temporary MongoDB downtime never rolls back committed MySQL bookings; events are retried automatically.
- **NFR-05 (Responsive Modern UI)**: Clean academic UI built with Tailwind CSS, Lucide icons, responsive sidebar, stat cards, and status badges.
