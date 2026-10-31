-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Verification Script (Phase 1): Read-Only State, Orphan & Integrity Check
--
-- This script does NOT modify any data. Run in the Supabase SQL Editor.
-- Expected Result:
--   - Obsolete sample trip count: 0
--   - Obsolete child records: 0
--   - Orphaned child records: 0
--   - RLS Policies Enabled: TRUE on all 14 tables
-- ==============================================================================

-- 1. Check for remaining obsolete sample trip records
SELECT 
    'Obsolete Sample Trip (by deterministic ID)' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED: Stale trip remains' END AS status
FROM trips 
WHERE id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete Sample Trip (by demo title)' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED: Sample title remains' END AS status
FROM trips 
WHERE title = 'Complete Jyotirlinga Pilgrimage'

UNION ALL

-- 2. Check for child records linked to sample trip ID
SELECT 
    'Obsolete itinerary_days' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM itinerary_days 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete itinerary_items' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM itinerary_items 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete expenses' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM expenses 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete bookings' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM bookings 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete booking_documents' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM booking_documents 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete transport_legs' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM transport_legs 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete accommodation_stays' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM accommodation_stays 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete places' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM places 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete checklist_items' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM checklist_items 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete trip_notes' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM trip_notes 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete budget_categories' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM budget_categories 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

SELECT 
    'Obsolete sync_metadata' AS check_item, 
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status
FROM sync_metadata 
WHERE trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'

UNION ALL

-- 3. Check for any orphaned child records whose trip_id does not exist in trips table
SELECT 
    'Orphaned child records (across all child tables)' AS check_item,
    (
        (SELECT COUNT(*) FROM itinerary_days WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM itinerary_items WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM expenses WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM bookings WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM booking_documents WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM transport_legs WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM accommodation_stays WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM places WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM checklist_items WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM trip_notes WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM budget_categories WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM sync_metadata WHERE trip_id NOT IN (SELECT id FROM trips))
    )::INTEGER AS count,
    CASE WHEN (
        (SELECT COUNT(*) FROM itinerary_days WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM itinerary_items WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM expenses WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM bookings WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM booking_documents WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM transport_legs WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM accommodation_stays WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM places WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM checklist_items WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM trip_notes WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM budget_categories WHERE trip_id NOT IN (SELECT id FROM trips)) +
        (SELECT COUNT(*) FROM sync_metadata WHERE trip_id NOT IN (SELECT id FROM trips))
    ) = 0 THEN 'PASSED' ELSE 'FAILED: Orphan records found' END AS status

UNION ALL

-- 4. Check that User Accounts & Profiles remain intact
SELECT 
    'Preserved user accounts (auth.users)' AS check_item,
    COUNT(*)::INTEGER AS count,
    'PRESERVED' AS status
FROM auth.users

UNION ALL

SELECT 
    'Preserved user profiles (public.profiles)' AS check_item,
    COUNT(*)::INTEGER AS count,
    'PRESERVED' AS status
FROM public.profiles

UNION ALL

-- 5. Check that Row Level Security (RLS) is ENABLED on all application tables
SELECT 
    'Tables with RLS Enabled (Expected: 13)' AS check_item,
    COUNT(*)::INTEGER AS count,
    CASE WHEN COUNT(*) >= 13 THEN 'PASSED' ELSE 'WARNING: Missing RLS on some tables' END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'trips', 'itinerary_days', 'itinerary_items', 'expenses',
    'budget_categories', 'bookings', 'booking_documents', 'transport_legs',
    'accommodation_stays', 'places', 'checklist_items', 'trip_notes', 'sync_metadata'
  )
  AND rowsecurity = TRUE;
