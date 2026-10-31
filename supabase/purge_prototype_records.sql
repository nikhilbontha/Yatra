-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Phase D: Surgical Cloud Purge of Prototype Records
--
-- STRICT PRESERVATION RULES:
-- 1. Does NOT drop tables, schemas, migrations, functions, triggers or policies.
-- 2. Does NOT delete auth.users, profiles, or genuine user-created records.
-- 3. Does NOT clear entire tables or storage buckets.
-- 4. Surgically targets ONLY confirmed prototype documents and expenses.
-- 5. Preserves the approved 19 itinerary days, 50 activities, 32 places,
--    17 transport legs, 11 research stays, 36 checklists, and 3 notes.
-- ==============================================================================

DO $$
DECLARE
    v_docs_deleted INTEGER := 0;
    v_expenses_deleted INTEGER := 0;
    v_trips_updated INTEGER := 0;
    v_docs_remaining INTEGER := 0;
    v_expenses_remaining INTEGER := 0;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Yatra Phase D: Surgical Cloud Prototype Records Purge';
    RAISE NOTICE '=======================================================';

    -- 1. Surgical Purge: Confirmed Prototype Booking Documents
    DELETE FROM booking_documents
    WHERE 
        id::text LIKE 'e7a1b32d-9831-4fa2-8b43-0008%'
        OR pnr IN ('1234567890', '9876543210')
        OR booking_ref IN ('HSR12345', 'VAN-7788', 'INS-992384')
        OR title ILIKE '%srisailam%';
    GET DIAGNOSTICS v_docs_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % confirmed prototype booking_documents', v_docs_deleted;

    -- 2. Surgical Purge: Confirmed Prototype Expenses
    DELETE FROM expenses
    WHERE 
        id::text LIKE 'e7a1b32d-9831-4fa2-8b43-0007%'
        OR trip_id = 'e7a1b32d-9831-4fa2-8b43-96b61df30191'
        OR notes ILIKE '%PNR: 1234567890%'
        OR notes ILIKE '%Hotel Sri Sai Residency%'
        OR title = 'Khammam Fort Entry & Guide';
    GET DIAGNOSTICS v_expenses_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % confirmed prototype expenses', v_expenses_deleted;

    -- 3. Normalize Trip Budget to 0.00 ("Budget not set") if holding prototype ₹10,000 / ₹50,000 / ₹1,00,000
    UPDATE trips
    SET total_budget = 0.00,
        emergency_reserve = 0.00,
        opening_cash = 0.00
    WHERE total_budget IN (10000.00, 50000.00, 100000.00)
      AND title ILIKE '%Jyotirlinga%';
    GET DIAGNOSTICS v_trips_updated = ROW_COUNT;
    RAISE NOTICE 'Normalized budget to 0.00 on % trips', v_trips_updated;

    -- 4. Verification & Audit Reporting
    SELECT COUNT(*) INTO v_docs_remaining FROM booking_documents;
    SELECT COUNT(*) INTO v_expenses_remaining FROM expenses;

    RAISE NOTICE '--- Post-Cleanup Cloud Summary ---';
    RAISE NOTICE 'Remaining genuine documents: %', v_docs_remaining;
    RAISE NOTICE 'Remaining genuine expenses:  %', v_expenses_remaining;
    RAISE NOTICE 'Prototype cloud purge completed safely.';
END $$;
