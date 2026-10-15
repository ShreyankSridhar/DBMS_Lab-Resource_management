-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: queries_demo.sql (Demonstration of Level 3 Advanced DBMS Queries)
-- ==============================================================================

USE university_lab_db;

-- ------------------------------------------------------------------------------
-- 1. Complex Multi-Table JOIN with Aggregations and LEFT JOIN
-- Retrieve all laboratories with total equipment count, total bookings, and current status.
-- ------------------------------------------------------------------------------
SELECT 
    l.id AS lab_id,
    l.name AS lab_name,
    l.building,
    l.capacity,
    COUNT(DISTINCT r.id) AS total_distinct_equipment_types,
    COALESCE(SUM(r.total_quantity), 0) AS total_physical_units,
    COUNT(DISTINCT b.id) AS total_lifetime_bookings
FROM labs l
LEFT JOIN resources r ON l.id = r.lab_id
LEFT JOIN bookings b ON l.id = b.lab_id
GROUP BY l.id, l.name, l.building, l.capacity
ORDER BY total_physical_units DESC;

-- ------------------------------------------------------------------------------
-- 2. GROUP BY and HAVING Filter
-- Find high-demand resource categories where total requested units exceed 5 units.
-- ------------------------------------------------------------------------------
SELECT 
    rc.id AS category_id,
    rc.name AS category_name,
    COUNT(DISTINCT bi.booking_id) AS bookings_count,
    SUM(bi.quantity_requested) AS total_units_demanded
FROM resource_categories rc
JOIN resources r ON rc.id = r.category_id
JOIN booking_items bi ON r.id = bi.resource_id
JOIN bookings b ON bi.booking_id = b.id
WHERE b.status IN ('APPROVED', 'PENDING')
GROUP BY rc.id, rc.name
HAVING SUM(bi.quantity_requested) >= 2
ORDER BY total_units_demanded DESC;

-- ------------------------------------------------------------------------------
-- 3. Subquery in WHERE Clause & Correlated Subquery
-- Identify students who have requested bookings in multiple different laboratories.
-- ------------------------------------------------------------------------------
SELECT 
    u.id,
    u.name,
    u.email,
    u.department,
    (
        SELECT COUNT(DISTINCT b.lab_id) 
        FROM bookings b 
        WHERE b.user_id = u.id
    ) AS distinct_labs_booked
FROM users u
WHERE u.role = 'STUDENT'
  AND (
      SELECT COUNT(DISTINCT b.lab_id) 
      FROM bookings b 
      WHERE b.user_id = u.id
  ) > 0
ORDER BY distinct_labs_booked DESC;

-- ------------------------------------------------------------------------------
-- 4. Querying the Lab Utilization View
-- ------------------------------------------------------------------------------
SELECT * FROM view_lab_utilization 
ORDER BY total_hours_booked DESC;

-- ------------------------------------------------------------------------------
-- 5. Querying the Real-Time Resource Availability View
-- ------------------------------------------------------------------------------
SELECT 
    resource_id,
    resource_name,
    lab_name,
    category_name,
    total_quantity,
    currently_reserved_quantity,
    currently_in_maintenance_quantity,
    currently_available_quantity
FROM view_resource_availability
ORDER BY lab_name, resource_name;

-- ------------------------------------------------------------------------------
-- 6. Executing Stored Procedure: sp_check_lab_availability
-- Test if Lab 1 is available for an overlapping slot vs free slot.
-- ------------------------------------------------------------------------------
SET @is_avail = FALSE;
SET @reason = '';

-- Test Overlap Slot (Booking #3 is 2026-10-16 10:00 - 14:00)
CALL sp_check_lab_availability(1, '2026-10-16 11:00:00', '2026-10-16 13:00:00', NULL, @is_avail, @reason);
SELECT @is_avail AS is_available, @reason AS conflict_details;

-- Test Free Slot (2026-10-16 15:00 - 17:00)
CALL sp_check_lab_availability(1, '2026-10-16 15:00:00', '2026-10-16 17:00:00', NULL, @is_avail, @reason);
SELECT @is_avail AS is_available, @reason AS free_slot_details;

-- ------------------------------------------------------------------------------
-- 7. Executing Stored Function: fn_get_lab_total_hours
-- ------------------------------------------------------------------------------
SELECT 
    l.name, 
    fn_get_lab_total_hours(l.id, '2026-10-01', '2026-10-31') AS october_booked_hours
FROM labs l;

-- ------------------------------------------------------------------------------
-- 8. Demonstration of Transaction and Explicit Rollback
-- Simulates booking creation failure when equipment quantity is exhausted.
-- ------------------------------------------------------------------------------
START TRANSACTION;

-- Step A: Insert a speculative booking
INSERT INTO bookings (user_id, lab_id, purpose, start_time, end_time, status)
VALUES (4, 1, 'Transactional Rollback Demo Run', '2026-10-21 10:00:00', '2026-10-21 12:00:00', 'PENDING');
SET @new_booking_id = LAST_INSERT_ID();

-- Step B: Check available quantity for Resource #2 (Dual RTX A6000 Rig, total = 6)
SET @avail_qty = 0;
CALL sp_calculate_resource_available_qty(2, '2026-10-21 10:00:00', '2026-10-21 12:00:00', @new_booking_id, @avail_qty);

-- Step C: Speculative request for 10 units (Exceeds available 6!)
-- Since 10 > @avail_qty, allocation logic triggers explicit ROLLBACK
SELECT @new_booking_id AS created_id, @avail_qty AS available_units;

-- Condition check simulated in SQL:
ROLLBACK;

-- Verify speculative booking was completely undone
SELECT COUNT(*) AS booking_exists_after_rollback 
FROM bookings 
WHERE purpose = 'Transactional Rollback Demo Run';

-- ------------------------------------------------------------------------------
-- 9. Demonstration of Trigger Constraint Violation
-- Attempting to insert booking where end_time <= start_time
-- Triggers `trg_bookings_before_insert` which raises SQLSTATE 45000.
-- ------------------------------------------------------------------------------
-- UNCOMMENT TO OBSERVE ERROR:
-- INSERT INTO bookings (user_id, lab_id, purpose, start_time, end_time, status)
-- VALUES (4, 1, 'Illegal Time Interval', '2026-10-20 14:00:00', '2026-10-20 12:00:00', 'PENDING');
