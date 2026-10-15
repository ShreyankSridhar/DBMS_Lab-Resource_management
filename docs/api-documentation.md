# RESTful Backend API Specification

**System**: University Lab Resources Allocation System  
**Framework**: Next.js App Router (Route Handlers)  
**Security**: Bearer Cookie JWT Authentication, Server-Side Zod Validation, Role-Based Access Control  

---

## 1. Authentication Endpoints

### 1.1 POST `/api/auth/login`
- **Description**: Authenticates user credentials, sets an `httpOnly` secure session cookie, and records a MongoDB audit event.
- **Request Body**:
  ```json
  {
    "email": "student@university.edu",
    "password": "Password@123"
  }
  ```
- **Responses**:
  - `200 OK`: Returns authenticated user profile and sets session cookie.
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Invalid credentials.

### 1.2 GET `/api/auth/me`
- **Description**: Returns the active session user identity from the verified server-side JWT cookie.
- **Responses**:
  - `200 OK`: `{ "authenticated": true, "user": { "id": 4, "name": "...", "role": "STUDENT" } }`
  - `401 Unauthorized`: Missing or expired session cookie.

### 1.3 POST `/api/auth/logout`
- **Description**: Invalidates the server-side cookie and logs the user out.

---

## 2. Laboratory Endpoints

### 2.1 GET `/api/labs`
- **Query Parameters**:
  - `status`: Filter by `AVAILABLE`, `MAINTENANCE`, `INACTIVE`
  - `search`: Keyword search matching name, building, or location
- **Response**: Array of laboratories with room capacity and resource counts.

### 2.2 POST `/api/labs` (Admin / Lab Manager Only)
- **Request Body**:
  ```json
  {
    "name": "Robotics & Drone Flight Cage",
    "building": "Aerospace Hangar",
    "location": "Ground Bay 1",
    "capacity": 25,
    "description": "Enclosed netted cage for multi-rotor testing and motion capture.",
    "status": "AVAILABLE"
  }
  ```
- **Response**: `201 Created` with new lab record and MongoDB audit event.

### 2.3 GET `/api/labs/[id]`
- **Response**: Detailed laboratory information, assigned resources catalog, and upcoming active bookings.

### 2.4 PATCH `/api/labs/[id]` (Admin / Lab Manager Only)
- **Request Body**: Partial update fields (e.g., `{ "status": "MAINTENANCE" }`).

---

## 3. Resource & Equipment Endpoints

### 3.1 GET `/api/resources`
- **Query Parameters**:
  - `labId`: Filter by parent laboratory ID
  - `categoryId`: Filter by equipment category ID
- **Response**: List of hardware resources with derived real-time availability (`availableNow`).

### 3.2 POST `/api/resources` (Admin / Lab Manager Only)
- **Request Body**:
  ```json
  {
    "name": "NVIDIA Jetson AGX Orin 64GB Dev Kit",
    "labId": 2,
    "categoryId": 4,
    "totalQuantity": 8,
    "description": "High-tier embedded robotic AI compute module.",
    "status": "AVAILABLE"
  }
  ```

### 3.3 PATCH `/api/resources/[id]` (Admin / Lab Manager Only)
- **Description**: Adjusts inventory count (`totalQuantity`) or updates operational status.

---

## 4. Bookings & Critical Allocation Endpoints

### 4.1 POST `/api/bookings/check-availability`
- **Description**: Pre-flight verification checking for schedule overlaps, maintenance windows, and equipment shortages before submission.
- **Request Body**:
  ```json
  {
    "labId": 1,
    "startTime": "2026-10-20T10:00:00Z",
    "endTime": "2026-10-20T14:00:00Z",
    "items": [{ "resourceId": 1, "quantityRequested": 4 }]
  }
  ```
- **Response**: `{ "isAvailable": true }` or `{ "isAvailable": false, "conflictType": "LAB_OVERLAP", "conflictReason": "..." }`.

### 4.2 POST `/api/bookings`
- **Description**: Transactional booking creation with strict locking and rollback.
- **Request Body**:
  ```json
  {
    "labId": 1,
    "purpose": "Capstone deep learning project training session",
    "startTime": "2026-10-22T09:00:00Z",
    "endTime": "2026-10-22T13:00:00Z",
    "items": [
      { "resourceId": 1, "quantityRequested": 4 }
    ]
  }
  ```
- **Responses**:
  - `201 Created`: Returns booking record and emits outbox event.
  - `409 Conflict`: Overlapping booking, lab maintenance, or equipment shortage detected.

### 4.3 GET `/api/bookings`
- **Description**: Lists reservations. Automatically filters to `userId = session.userId` for students; admins can inspect all bookings.

### 4.4 POST `/api/bookings/[id]/cancel`
- **Description**: Cancels reservation and releases all equipment units back to available inventory. Non-admins can only cancel their own bookings.

---

## 5. Administrative Decision Endpoints

### 5.1 GET `/api/admin/bookings/pending`
- **Description**: Returns all booking requests with status `PENDING` awaiting review.

### 5.2 POST `/api/admin/bookings/[id]/approve`
- **Request Body**: `{ "comments": "Approved for Capstone project." }`
- **Response**: `200 OK` with atomic update, approval log, in-app notification, and outbox event.

### 5.3 POST `/api/admin/bookings/[id]/reject`
- **Request Body**: `{ "comments": "Conflict with scheduled cleanroom inspection." }`

---

## 6. Maintenance & Analytics Endpoints

### 6.1 GET & POST `/api/maintenance`
- **Description**: Lists and schedules facility or equipment maintenance outages.

### 6.2 GET `/api/reports/lab-utilization`
- **Description**: Queries `view_lab_utilization` to provide booking counts, cumulative hours, and percentage benchmarks.

### 6.3 GET `/api/reports/resource-usage`
- **Description**: Aggregates equipment category demand ratios and calculates peak reservation hours.

### 6.4 GET `/api/audit/events` (Admin Only)
- **Description**: Polls outbox sync and queries MongoDB `audit_events` collection with pagination and executes multi-stage aggregation pipelines.
