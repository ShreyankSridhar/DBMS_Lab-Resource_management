-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: views.sql (Database Views for Reporting and Availability)
-- ==============================================================================

USE university_lab_db;

-- ------------------------------------------------------------------------------
-- View 1: view_lab_utilization
-- Aggregates approved booking volume, cumulative reservation hours, and maintenance
-- to measure laboratory asset utilization across university facilities.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_lab_utilization;
CREATE VIEW view_lab_utilization AS
SELECT 
    l.id AS lab_id,
    l.name AS lab_name,
    l.building,
    l.location,
    l.capacity,
    l.status AS lab_status,
    COUNT(DISTINCT b.id) AS total_approved_bookings,
    COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) / 60.0), 0) AS total_hours_booked,
    COUNT(DISTINCT m.id) AS active_maintenance_count,
    ROUND(
        COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) / 60.0), 0) / 
        -- Benchmark: 12 operating hours/day * 30 days = 360 available lab-hours/month
        360.0 * 100, 2
    ) AS estimated_monthly_utilization_pct
FROM labs l
LEFT JOIN bookings b 
    ON l.id = b.lab_id 
    AND b.status = 'APPROVED'
LEFT JOIN maintenance m 
    ON l.id = m.lab_id 
    AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
GROUP BY l.id, l.name, l.building, l.location, l.capacity, l.status;

-- ------------------------------------------------------------------------------
-- View 2: view_resource_availability
-- Real-time snapshot of equipment inventory vs. current ongoing reservations 
-- and active maintenance windows.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_resource_availability;
CREATE VIEW view_resource_availability AS
SELECT 
    r.id AS resource_id,
    r.name AS resource_name,
    r.status AS resource_status,
    r.total_quantity,
    l.id AS lab_id,
    l.name AS lab_name,
    rc.id AS category_id,
    rc.name AS category_name,
    -- Currently occupied in an ongoing APPROVED or PENDING booking right now
    COALESCE((
        SELECT SUM(bi.quantity_requested)
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE bi.resource_id = r.id
          AND b.status IN ('APPROVED', 'PENDING')
          AND NOW() BETWEEN b.start_time AND b.end_time
    ), 0) AS currently_reserved_quantity,
    -- In active maintenance right now
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM maintenance m 
            WHERE m.resource_id = r.id 
              AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
              AND NOW() BETWEEN m.start_time AND m.end_time
        ) THEN r.total_quantity 
        ELSE 0 
    END AS currently_in_maintenance_quantity,
    -- Real-time current available quantity
    GREATEST(0, r.total_quantity - 
        COALESCE((
            SELECT SUM(bi.quantity_requested)
            FROM booking_items bi
            JOIN bookings b ON bi.booking_id = b.id
            WHERE bi.resource_id = r.id
              AND b.status IN ('APPROVED', 'PENDING')
              AND NOW() BETWEEN b.start_time AND b.end_time
        ), 0) - 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM maintenance m 
                WHERE m.resource_id = r.id 
                  AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
                  AND NOW() BETWEEN m.start_time AND m.end_time
            ) THEN r.total_quantity 
            ELSE 0 
        END
    ) AS currently_available_quantity
FROM resources r
JOIN labs l ON r.lab_id = l.id
JOIN resource_categories rc ON r.category_id = rc.id;

-- ------------------------------------------------------------------------------
-- View 3: view_pending_bookings
-- Operational dashboard view providing lab administrators with instant details
-- on pending student & faculty reservation requests awaiting action.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_pending_bookings;
CREATE VIEW view_pending_bookings AS
SELECT 
    b.id AS booking_id,
    b.purpose,
    b.start_time,
    b.end_time,
    ROUND(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) / 60.0, 1) AS duration_hours,
    b.created_at AS requested_at,
    u.id AS student_id,
    u.name AS student_name,
    u.email AS student_email,
    u.role AS user_role,
    u.department,
    l.id AS lab_id,
    l.name AS lab_name,
    l.building,
    l.location,
    COALESCE(COUNT(bi.id), 0) AS total_items_requested,
    COALESCE(SUM(bi.quantity_requested), 0) AS total_units_requested
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN labs l ON b.lab_id = l.id
LEFT JOIN booking_items bi ON b.id = bi.booking_id
WHERE b.status = 'PENDING'
GROUP BY b.id, b.purpose, b.start_time, b.end_time, b.created_at, 
         u.id, u.name, u.email, u.role, u.department, 
         l.id, l.name, l.building, l.location;

-- ------------------------------------------------------------------------------
-- View 4: view_booking_summaries
-- Comprehensive historic view combining user, laboratory, decision records, 
-- and item summaries for auditing and reports.
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS view_booking_summaries;
CREATE VIEW view_booking_summaries AS
SELECT 
    b.id AS booking_id,
    b.status,
    b.purpose,
    b.start_time,
    b.end_time,
    TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) AS duration_minutes,
    b.created_at,
    u.name AS user_name,
    u.email AS user_email,
    u.department AS user_department,
    l.name AS lab_name,
    l.building AS lab_building,
    a.decision AS approval_decision,
    a.comments AS admin_comments,
    adm.name AS approved_by_name,
    a.decided_at,
    GROUP_CONCAT(CONCAT(r.name, ' (x', bi.quantity_requested, ')') SEPARATOR ', ') AS reserved_equipment
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN labs l ON b.lab_id = l.id
LEFT JOIN approvals a ON b.id = a.booking_id
LEFT JOIN users adm ON a.admin_id = adm.id
LEFT JOIN booking_items bi ON b.id = bi.booking_id
LEFT JOIN resources r ON bi.resource_id = r.id
GROUP BY b.id, b.status, b.purpose, b.start_time, b.end_time, b.created_at,
         u.name, u.email, u.department, l.name, l.building,
         a.decision, a.comments, adm.name, a.decided_at;
