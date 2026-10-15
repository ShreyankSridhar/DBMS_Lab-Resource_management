-- ==============================================================================
-- UNIVERSITY LAB RESOURCES ALLOCATION SYSTEM
-- Database: university_lab_db
-- Relational DBMS: MySQL 8.0+
-- Script: seed.sql (Comprehensive Academic Realistic Dataset)
-- All default seed user accounts use password: Password@123
-- ==============================================================================

USE university_lab_db;

-- Ensure idempotent seeding without destructive truncates

-- ------------------------------------------------------------------------------
-- 1. Insert Users (Admin, Lab Managers, Faculty, Students)
-- Hash for 'Password@123': $2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO users (id, name, email, password_hash, role, department) VALUES
(1, 'Dr. Alan Turing', 'admin@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'ADMIN', 'Computer Science & Engineering'),
(2, 'Prof. Grace Hopper', 'manager@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'LAB_MANAGER', 'Electrical & Robotics'),
(3, 'Prof. Richard Feynman', 'faculty@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'FACULTY', 'Quantum & Nanotechnology'),
(4, 'Shreyank S', 'student@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'STUDENT', 'Computer Science & Engineering'),
(5, 'Ada Lovelace', 'ada@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'STUDENT', 'Computer Science & Engineering'),
(6, 'Claude Shannon', 'shannon@university.edu', '$2b$10$GpN8628ZpLztbYEUzHx7/OqY2uniw3gSswU4rkSHjM7es7Qs6ywwK', 'STUDENT', 'Information Science');

-- ------------------------------------------------------------------------------
-- 2. Insert Labs
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO labs (id, name, building, location, capacity, description, status) VALUES
(1, 'Advanced Computing & AI Lab', 'Turing Academic Block', 'Room 301, 3rd Floor', 45, 'High-performance computing workstations equipped with NVIDIA RTX GPUs and deep learning toolchains.', 'AVAILABLE'),
(2, 'Robotics & Autonomous Systems Lab', 'Innovation Hub', 'Room 102, Ground Floor', 30, 'Industrial robot arms, autonomous mobile rovers, lidar sensors, and computer vision testbeds.', 'AVAILABLE'),
(3, 'Embedded Systems & IoT Lab', 'Franklin Science Wing', 'Room 204, 2nd Floor', 35, 'Oscilloscopes, FPGA development boards, logic analyzers, and sensor prototyping breadboards.', 'AVAILABLE'),
(4, 'High Performance Computing Cluster', 'Central Computing Facility', 'Data Center Wing B', 15, 'Multi-node cluster with dedicated GPU compute blades and 100GbE interconnect for intensive parallel simulations.', 'AVAILABLE'),
(5, 'Quantum & Nanotech Fabrication Suite', 'Curie Nanotechnology Complex', 'Cleanroom Suite 405', 20, 'Precision optical tables, scanning probe equipment, cryogenic stations, and laser diagnostic arrays.', 'AVAILABLE'),
(6, 'Legacy Electronics Test Bench', 'Old Engineering Hall', 'Basement Lab 04', 25, 'Analog electronics calibration facility currently undergoing scheduled university infrastructure retrofit.', 'MAINTENANCE');

-- ------------------------------------------------------------------------------
-- 3. Insert Resource Categories
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO resource_categories (id, name, description) VALUES
(1, 'GPU Workstations', 'High-end desktop workstations equipped with tensor compute accelerators.'),
(2, 'Robotics & Actuators', 'Robotic manipulators, hexapod rovers, and servo actuator toolkits.'),
(3, 'Test & Measurement', 'Digital storage oscilloscopes, function generators, and spectrum analyzers.'),
(4, 'Embedded Dev Kits', 'Microcontroller development boards, FPGA platforms, and SoC modules.'),
(5, 'Sensors & Imaging', 'Thermal cameras, LIDAR scanners, and high-speed CMOS capture sensors.');

-- ------------------------------------------------------------------------------
-- 4. Insert Resources
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO resources (id, lab_id, category_id, name, description, total_quantity, status) VALUES
(1, 1, 1, 'NVIDIA RTX 4090 Workstation', 'Intel i9-14900K, 64GB DDR5, RTX 4090 24GB VRAM, Ubuntu 24.04 LTS.', 24, 'AVAILABLE'),
(2, 1, 1, 'Dual NVIDIA RTX A6000 Rig', 'AMD Threadripper PRO, 128GB ECC RAM, Dual RTX A6000 48GB VRAM.', 6, 'AVAILABLE'),
(3, 2, 2, 'Universal Robots UR3e Collaborative Arm', '6-axis precision robotic arm with force-torque sensing and ROS2 drivers.', 4, 'AVAILABLE'),
(4, 2, 5, 'Velodyne Puck LiDAR Sensor Unit', '360-degree 16-channel 3D lidar scanner for mobile mapping and SLAM.', 8, 'AVAILABLE'),
(5, 3, 3, 'Tektronix 4-Channel 1GHz Digital Oscilloscope', 'MSO44 series oscilloscope with logic analyzer and spectrum analyzer.', 12, 'AVAILABLE'),
(6, 3, 4, 'Xilinx Zynq UltraScale+ FPGA Board', 'ZCU104 evaluation kit for edge AI acceleration and heterogeneous computing.', 16, 'AVAILABLE'),
(7, 3, 4, 'Raspberry Pi 5 AI Development Bundle', 'RPi 5 8GB with Hailo-8L M.2 AI acceleration kit and camera module 3.', 30, 'AVAILABLE'),
(8, 4, 1, 'NVIDIA A100 80GB SXM4 Compute Node', 'Dual AMD EPYC 7763, 512GB RAM, 4x NVIDIA A100 80GB SXM4 nodes.', 4, 'AVAILABLE'),
(9, 5, 5, 'FLIR Scientific Grade Thermal Imager', 'High-resolution calibrated infrared camera with optical microscopy lens.', 4, 'AVAILABLE');

-- ------------------------------------------------------------------------------
-- 5. Insert Bookings (Past, Ongoing, and Future)
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO bookings (id, user_id, lab_id, purpose, start_time, end_time, status) VALUES
(1, 4, 1, 'Deep Learning Transformer Model Fine-Tuning Lab Assignment', '2026-10-14 09:00:00', '2026-10-14 13:00:00', 'APPROVED'),
(2, 5, 2, 'Autonomous Navigation SLAM Algorithm Testing on Rover Platform', '2026-10-14 14:00:00', '2026-10-14 17:00:00', 'APPROVED'),
(3, 4, 1, 'Computer Vision Real-Time Object Detection Benchmark', '2026-10-16 10:00:00', '2026-10-16 14:00:00', 'APPROVED'),
(4, 6, 3, 'FPGA Hardware Acceleration of AES Encryption Pipeline', '2026-10-16 14:30:00', '2026-10-16 18:00:00', 'PENDING'),
(5, 5, 4, 'Distributed High Performance Molecular Dynamics Simulation', '2026-10-17 09:00:00', '2026-10-17 15:00:00', 'PENDING'),
(6, 4, 2, 'Hexapod Walking Robot Gait Optimization Experiments', '2026-10-18 11:00:00', '2026-10-18 13:00:00', 'PENDING'),
(7, 6, 1, 'Competitive Programming Workshop Practice Session', '2026-10-12 10:00:00', '2026-10-12 12:00:00', 'CANCELLED'),
(8, 5, 5, 'High Energy Laser Interferometer Calibration (Overlapping conflict)', '2026-10-13 14:00:00', '2026-10-13 16:00:00', 'REJECTED');

-- ------------------------------------------------------------------------------
-- 6. Insert Booking Items
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO booking_items (booking_id, resource_id, quantity_requested) VALUES
(1, 1, 4),  -- Booking #1 requests 4 RTX 4090 Workstations
(2, 3, 1),  -- Booking #2 requests 1 Collaborative Arm
(2, 4, 2),  -- Booking #2 requests 2 LiDAR Units
(3, 1, 6),  -- Booking #3 requests 6 RTX 4090 Workstations
(4, 5, 2),  -- Booking #4 requests 2 Oscilloscopes
(4, 6, 4),  -- Booking #4 requests 4 FPGA Boards
(5, 8, 2),  -- Booking #5 requests 2 NVIDIA A100 Nodes
(6, 3, 1);  -- Booking #6 requests 1 Collaborative Arm

-- ------------------------------------------------------------------------------
-- 7. Insert Approvals
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO approvals (booking_id, admin_id, decision, comments, decided_at) VALUES
(1, 1, 'APPROVED', 'Approved for Senior Capstone AI Project. Adhere to GPU power limits.', '2026-10-13 16:30:00'),
(2, 2, 'APPROVED', 'Approved. Please coordinate with technician on rover battery safety.', '2026-10-13 17:00:00'),
(3, 1, 'APPROVED', 'Approved for benchmark evaluation run.', '2026-10-15 08:30:00'),
(8, 1, 'REJECTED', 'Requested schedule conflicts with cleanroom air filter inspection.', '2026-10-12 15:00:00');

-- ------------------------------------------------------------------------------
-- 8. Insert Maintenance Windows
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO maintenance (id, resource_id, lab_id, start_time, end_time, description, status, created_by) VALUES
(1, NULL, 6, '2026-10-10 08:00:00', '2026-10-25 18:00:00', 'Full facility electrical rewiring and ESD grounding certification.', 'IN_PROGRESS', 2),
(2, 8, 4, '2026-10-19 08:00:00', '2026-10-19 14:00:00', 'InfiniBand network fabric firmware update and thermal paste reapplication on A100 nodes.', 'SCHEDULED', 1),
(3, 5, 3, '2026-10-20 09:00:00', '2026-10-20 13:00:00', 'Annual NIST traceable calibration of digital oscilloscopes.', 'SCHEDULED', 2);

-- ------------------------------------------------------------------------------
-- 9. Insert Notifications
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO notifications (user_id, message, type, read_at, created_at) VALUES
(4, 'Your booking #1 for Advanced Computing & AI Lab has been APPROVED.', 'BOOKING_APPROVED', '2026-10-13 16:35:00', '2026-10-13 16:30:00'),
(5, 'Your booking #2 for Robotics Lab has been APPROVED.', 'BOOKING_APPROVED', '2026-10-13 17:05:00', '2026-10-13 17:00:00'),
(4, 'Your booking #3 for Advanced Computing & AI Lab has been APPROVED.', 'BOOKING_APPROVED', NULL, '2026-10-15 08:30:00'),
(5, 'Your booking #8 for Quantum Suite was REJECTED: Schedule conflicts with cleanroom inspection.', 'BOOKING_REJECTED', '2026-10-12 15:30:00', '2026-10-12 15:00:00');

-- ------------------------------------------------------------------------------
-- 10. Insert Outbox Events (Bridging committed SQL state to MongoDB)
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO outbox_events (event_type, payload, status, created_at, processed_at) VALUES
('BOOKING_APPROVED', '{"booking_id": 1, "user_id": 4, "lab_id": 1, "decision": "APPROVED", "timestamp": "2026-10-13T16:30:00Z"}', 'PROCESSED', '2026-10-13 16:30:00', '2026-10-13 16:30:02'),
('BOOKING_APPROVED', '{"booking_id": 2, "user_id": 5, "lab_id": 2, "decision": "APPROVED", "timestamp": "2026-10-13T17:00:00Z"}', 'PROCESSED', '2026-10-13 17:00:00', '2026-10-13 17:00:02'),
('BOOKING_APPROVED', '{"booking_id": 3, "user_id": 4, "lab_id": 1, "decision": "APPROVED", "timestamp": "2026-10-15T08:30:00Z"}', 'PROCESSED', '2026-10-15 08:30:00', '2026-10-15 08:30:03'),
('BOOKING_REJECTED', '{"booking_id": 8, "user_id": 5, "lab_id": 5, "decision": "REJECTED", "comments": "Schedule conflicts with cleanroom inspection", "timestamp": "2026-10-12T15:00:00Z"}', 'PROCESSED', '2026-10-12 15:00:00', '2026-10-12 15:00:04');
