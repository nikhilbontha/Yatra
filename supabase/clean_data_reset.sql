-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Clean Data Reset Script (Phase 1)
--
-- SAFETY RULES:
-- 1. Does NOT drop tables, schemas, migrations, functions, triggers or policies.
-- 2. Does NOT delete auth.users or public.profiles accounts.
-- 3. Does NOT delete the Supabase project or storage buckets.
-- 4. Only targets the obsolete sample trip records (e7a1b32d-9831-4fa2-8b43-96b61df30191)
--    or trips created from sample seed data titled 'Complete Jyotirlinga Pilgrimage'.
-- ==============================================================================

DO $$
DECLARE
    v_deterministic_trip_id UUID := 'e7a1b32d-9831-4fa2-8b43-96b61df30191';
    v_rec RECORD;
    v_deleted_count INTEGER;
    v_trip_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Starting Yatra Phase 1 Clean Data Reset...';
    RAISE NOTICE '=======================================================';

    -- Find target obsolete sample trips: matching deterministic ID or demo seed title
    FOR v_rec IN 
        SELECT id, title, user_id FROM trips 
        WHERE id = v_deterministic_trip_id OR title = 'Complete Jyotirlinga Pilgrimage'
    LOOP
        v_trip_count := v_trip_count + 1;
        RAISE NOTICE 'Processing obsolete sample trip: ID % ("%")', v_rec.id, v_rec.title;

        -- 1. Delete Booking Documents (Child of bookings & trips)
        DELETE FROM booking_documents WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % booking_documents', v_deleted_count;

        -- 2. Delete Expenses (Child of itinerary_days & trips)
        DELETE FROM expenses WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % expenses', v_deleted_count;

        -- 3. Delete Bookings (Child of trips)
        DELETE FROM bookings WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % bookings', v_deleted_count;

        -- 4. Delete Itinerary Items (Child of itinerary_days & trips)
        DELETE FROM itinerary_items WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % itinerary_items', v_deleted_count;

        -- 5. Delete Itinerary Days (Child of trips)
        DELETE FROM itinerary_days WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % itinerary_days', v_deleted_count;

        -- 6. Delete Places (Child of trips)
        DELETE FROM places WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % places', v_deleted_count;

        -- 7. Delete Accommodation Stays (Child of trips)
        DELETE FROM accommodation_stays WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % accommodation_stays', v_deleted_count;

        -- 8. Delete Transport Legs (Child of trips)
        DELETE FROM transport_legs WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % transport_legs', v_deleted_count;

        -- 9. Delete Checklist Items (Child of trips)
        DELETE FROM checklist_items WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % checklist_items', v_deleted_count;

        -- 10. Delete Trip Notes (Child of trips)
        DELETE FROM trip_notes WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % trip_notes', v_deleted_count;

        -- 11. Delete Budget Categories (Child of trips)
        DELETE FROM budget_categories WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % budget_categories', v_deleted_count;

        -- 12. Delete Sync Metadata (Child of trips)
        DELETE FROM sync_metadata WHERE trip_id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted % sync_metadata', v_deleted_count;

        -- 13. Finally, Delete the Parent Trip record
        DELETE FROM trips WHERE id = v_rec.id;
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE '  - Deleted parent trip record %', v_rec.id;
    END LOOP;

    -- Also clean any orphan child records if any exist
    DELETE FROM itinerary_items WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM itinerary_days WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM expenses WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM booking_documents WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM bookings WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM places WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM accommodation_stays WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM transport_legs WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM checklist_items WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM trip_notes WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM budget_categories WHERE trip_id NOT IN (SELECT id FROM trips);
    DELETE FROM sync_metadata WHERE trip_id NOT IN (SELECT id FROM trips);

    IF v_trip_count = 0 THEN
        RAISE NOTICE 'No obsolete sample trips found matching target criteria. Supabase is already clean.';
    ELSE
        RAISE NOTICE '=======================================================';
        RAISE NOTICE 'Clean Data Reset completed successfully for % trip(s).', v_trip_count;
        RAISE NOTICE 'All database tables, schemas, policies, and auth accounts preserved.';
        RAISE NOTICE '=======================================================';
    END IF;
END $$;
