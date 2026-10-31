-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Seed Data: 19-Day Jyotirlinga Pilgrimage (Hyderabad to Khammam)
-- Can be executed within a Supabase SQL session replacing :USER_ID with your auth.uid()
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_trip_id UUID;
    d1 UUID; d2 UUID; d3 UUID; d4 UUID; d5 UUID;
    d6 UUID; d7 UUID; d8 UUID; d9 UUID; d10 UUID;
    d11 UUID; d12 UUID; d13 UUID; d14 UUID; d15 UUID;
    d16 UUID; d17 UUID; d18 UUID; d19 UUID;
BEGIN
    -- Select first existing user or use current session auth.uid()
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user or auth.users found. Run after user signup.';
        RETURN;
    END IF;

    -- Create Trip
    INSERT INTO trips (
        id, user_id, title, origin, destination, start_date, end_date, total_budget, emergency_reserve, opening_cash, notes
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        'Complete Jyotirlinga Pilgrimage',
        'Hyderabad',
        'Khammam',
        '2026-11-17',
        '2026-12-05',
        0.00,
        0.00,
        0.00,
        'Solo and budget-conscious pilgrimage across 7 Jyotirlingas. Sleeper trains, state buses, shared autos and budget stays.'
    ) RETURNING id INTO v_trip_id;

    -- Preload Budget Categories
    INSERT INTO budget_categories (trip_id, name, icon, allocated_amount) VALUES
    (v_trip_id, 'Transport', 'Train', 0.00),
    (v_trip_id, 'Accommodation', 'BedDouble', 0.00),
    (v_trip_id, 'Food', 'Utensils', 0.00),
    (v_trip_id, 'Temple / donation', 'Landmark', 0.00),
    (v_trip_id, 'Sightseeing', 'Ticket', 0.00),
    (v_trip_id, 'Shopping', 'ShoppingBag', 0.00),
    (v_trip_id, 'Other', 'Receipt', 0.00);

    -- Preload 19 Days
    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 1, '2026-11-17', 'Hyderabad to Shirdi', 'Overnight train journey (Train 17208)', 'Transport', 'Board planned train 17208 from Secunderabad toward Sainagar Shirdi. Verify actual service, running day, station, and timetable before travel.', 'Secunderabad / Shirdi')
    RETURNING id INTO d1;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 2, '2026-11-18', 'Shirdi', 'Sai Baba darshan and sacred sites', 'Temple', 'Sai Baba Samadhi Mandir, Dwarkamai, Chavadi, Gurusthan, Lendi Baug, optional Khandoba Temple and evening darshan / Aarti if feasible. Budget accommodation.', 'Shirdi')
    RETURNING id INTO d2;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 3, '2026-11-19', 'Shirdi to Grishneshwar', 'Travel via Chhatrapati Sambhajinagar', 'Temple', 'Travel via Chhatrapati Sambhajinagar toward Verul/Ellora. Grishneshwar Jyotirlinga darshan. Budget stay near Verul or Sambhajinagar.', 'Grishneshwar / Verul')
    RETURNING id INTO d3;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 4, '2026-11-20', 'Ellora Caves', 'Cave 16 Kailasa Temple & heritage', 'Sightseeing', 'Ellora Caves, including Cave 16/Kailasa Temple and selected Buddhist and Jain caves. Proceed toward Nashik if transport allows.', 'Ellora / Nashik')
    RETURNING id INTO d4;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 5, '2026-11-21', 'Nashik', 'Panchavati, Ramkund and sacred riverfront', 'Sightseeing', 'Panchavati, Ramkund and Kalaram Temple. Trimbakeshwar access must be verified before travel.', 'Nashik')
    RETURNING id INTO d5;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 6, '2026-11-22', 'Trimbakeshwar or Nashik', 'Conditional Jyotirlinga visit', 'Temple', 'Conditional Trimbakeshwar Jyotirlinga and Kushavarta Kund visit if open and accessible. Otherwise, additional Nashik sightseeing. Consider travel toward Pune if feasible.', 'Trimbakeshwar / Nashik')
    RETURNING id INTO d6;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 7, '2026-11-23', 'Bhimashankar Jyotirlinga', 'Bhimashankar via Pune', 'Temple', 'Bhimashankar Jyotirlinga via Pune, subject to current access restrictions. Return to Pune for overnight stay.', 'Bhimashankar / Pune')
    RETURNING id INTO d7;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 8, '2026-11-24', 'Pune to Lonavala', 'Scenic daytime train journey', 'Transport', 'Pune to Lonavala by daytime train. Explore the town or a nearby viewpoint. Overnight in Lonavala.', 'Lonavala')
    RETURNING id INTO d8;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 9, '2026-11-25', 'Lonavala/Pune toward Indore', 'Long-distance rail transit', 'Transport', 'Lonavala/Pune toward Indore by a verified long-distance train connection. Needs verification of running day and boarding station.', 'Transit to Indore')
    RETURNING id INTO d9;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 10, '2026-11-26', 'Indore to Omkareshwar', 'Omkareshwar Jyotirlinga & ghats', 'Temple', 'Travel by state bus to Omkareshwar. Omkareshwar Jyotirlinga darshan and Narmada ghats. Overnight stay.', 'Omkareshwar')
    RETURNING id INTO d10;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 11, '2026-11-27', 'Omkareshwar and Mamleshwar to Ujjain', 'Mamleshwar darshan and transit', 'Temple', 'Omkareshwar and Mamleshwar if required, then travel via Indore to Ujjain. Check in at Ujjain stay.', 'Ujjain')
    RETURNING id INTO d11;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 12, '2026-11-28', 'Ujjain', 'Mahakaleshwar Jyotirlinga', 'Temple', 'Mahakaleshwar Jyotirlinga darshan, Mahakal Lok corridor, Ram Ghat and optional Kal Bhairav Temple.', 'Ujjain')
    RETURNING id INTO d12;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 13, '2026-11-29', 'Ujjain to Dwarka', 'Verified rail connection', 'Transport', 'Ujjain to Dwarka via a verified train connection. Light sightseeing if arriving late. Budget stay in Dwarka.', 'Dwarka')
    RETURNING id INTO d13;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 14, '2026-11-30', 'Dwarka and Nageshwar', 'Dwarkadhish & Nageshwar Jyotirlinga', 'Temple', 'Dwarkadhish Temple, Gomti Ghat, Rukmini Devi Temple and Nageshwar Jyotirlinga via local bus or shared auto.', 'Dwarka')
    RETURNING id INTO d14;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 15, '2026-12-01', 'Dwarka to Somnath', 'Coastal transit toward Somnath', 'Transport', 'Dwarka to Somnath. Optional Gopi Talav or Bet Dwarka if transport and time permit. Travel by GSRTC bus or rail connection.', 'Somnath')
    RETURNING id INTO d15;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 16, '2026-12-02', 'Somnath', 'Somnath Jyotirlinga & sacred sites', 'Temple', 'Somnath Jyotirlinga darshan, Bhalka Tirth, Dehotsarg/Golokdham and Triveni Sangam. Optional local sacred sites.', 'Somnath')
    RETURNING id INTO d16;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 17, '2026-12-03', 'Somnath toward Ahmedabad/Gandhinagar', 'Veraval rail connection', 'Transport', 'Somnath/Veraval toward Ahmedabad or Gandhinagar by verified rail connection, then onward travel planning.', 'Veraval / Transit')
    RETURNING id INTO d17;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 18, '2026-12-04', 'Return journey toward Khammam', 'Long-distance rail transit', 'Transport', 'Continue the return journey toward Khammam by confirmed train connection.', 'En route to Khammam')
    RETURNING id INTO d18;

    INSERT INTO itinerary_days (id, trip_id, day_number, date, title, subtitle, theme_type, details, location)
    VALUES (gen_random_uuid(), v_trip_id, 19, '2026-12-05', 'Expected arrival in Khammam', 'Trip completion and debrief', 'Personal', 'Expected arrival in Khammam, subject to actual train schedules. Reconcile final expenses and archive trip data.', 'Khammam')
    RETURNING id INTO d19;

    -- Preload Checklist Items
    INSERT INTO checklist_items (trip_id, category, title, is_completed, sort_order) VALUES
    (v_trip_id, 'Documents', 'Original Government Photo ID (Aadhaar / Voter ID)', FALSE, 1),
    (v_trip_id, 'Documents', 'Train and bus tickets saved offline on device', FALSE, 2),
    (v_trip_id, 'Documents', 'Emergency contacts list printed / noted in notebook', FALSE, 3),
    (v_trip_id, 'Clothing', 'Comfortable cotton walking clothes', FALSE, 4),
    (v_trip_id, 'Clothing', 'Dhoti / Kurta / modest temple attire for Jyotirlinga entry', FALSE, 5),
    (v_trip_id, 'Clothing', 'Warm shawl / light jacket for overnight sleeper trains', FALSE, 6),
    (v_trip_id, 'Electronics', 'Smartphone with offline maps and Yatra PWA', FALSE, 7),
    (v_trip_id, 'Electronics', 'High-capacity power bank (20,000 mAh) and charging cables', FALSE, 8),
    (v_trip_id, 'Medicines', 'Personal medications and prescription copies', FALSE, 9),
    (v_trip_id, 'Medicines', 'Basic first aid: ORS sachets, pain relief, band-aids, antacids', FALSE, 10),
    (v_trip_id, 'Gear', 'Secure padlock and steel chain for sleeper berths', FALSE, 11),
    (v_trip_id, 'Gear', 'Compact umbrella or rain poncho', FALSE, 12),
    (v_trip_id, 'Gear', 'Refillable insulated water bottle', FALSE, 13),
    (v_trip_id, 'Pre-Trip Preparation', 'Verify train 17208 running schedule and boarding station', FALSE, 14),
    (v_trip_id, 'Pre-Trip Preparation', 'Check official darshan timings and entry dress code for Trimbakeshwar', FALSE, 15),
    (v_trip_id, 'Pre-Trip Preparation', 'Check current access status for Bhimashankar Jyotirlinga', FALSE, 16),
    (v_trip_id, 'Pre-Trip Preparation', 'Confirm Mahakaleshwar Bhasma Aarti / General darshan protocols', FALSE, 17);

    RAISE NOTICE 'Yatra seed data preloaded successfully for user % and trip %', v_user_id, v_trip_id;
END $$;
