-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Database Schema Migration 001: Initial Relational Tables & RLS Policies
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically bump updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. TRIPS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_budget >= 0),
    emergency_reserve NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (emergency_reserve >= 0),
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_cash >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_trip_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own trips"
    ON trips FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. ITINERARY DAYS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    date DATE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    theme_type TEXT NOT NULL DEFAULT 'Temple' CHECK (theme_type IN ('Temple', 'Sightseeing', 'Transport', 'Personal')),
    details TEXT,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_trip_day UNIQUE (trip_id, day_number),
    CONSTRAINT unique_trip_date UNIQUE (trip_id, date)
);

CREATE INDEX idx_itinerary_days_trip_date ON itinerary_days(trip_id, date);
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD itinerary days for their trips"
    ON itinerary_days FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_itinerary_days_updated_at
    BEFORE UPDATE ON itinerary_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. ITINERARY ITEMS (Daily Tasks & Activities)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'Task' CHECK (item_type IN ('Darshan', 'Travel', 'Sightseeing', 'Task', 'Rest', 'Meal')),
    time_estimate TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    needs_verification BOOLEAN NOT NULL DEFAULT FALSE,
    verification_note TEXT,
    location TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itinerary_items_day ON itinerary_items(day_id, sort_order);
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD items for their trips"
    ON itinerary_items FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_itinerary_items_updated_at
    BEFORE UPDATE ON itinerary_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. BUDGET CATEGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_trip_category UNIQUE (trip_id, name)
);

CREATE INDEX idx_budget_categories_trip ON budget_categories(trip_id);
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD budget categories for their trips"
    ON budget_categories FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- ------------------------------------------------------------------------------
-- 6. EXPENSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_id UUID REFERENCES itinerary_days(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL CHECK (category IN ('Transport', 'Accommodation', 'Food', 'Temple / donation', 'Sightseeing', 'Shopping', 'Other')),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Debit / credit card', 'Online booking', 'Other')),
    destination TEXT,
    notes TEXT,
    is_cash_inflow BOOLEAN NOT NULL DEFAULT FALSE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, date);
CREATE INDEX idx_expenses_category ON expenses(trip_id, category);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD expenses for their trips"
    ON expenses FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. BOOKINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    booking_type TEXT NOT NULL CHECK (booking_type IN ('Train', 'Bus', 'Accommodation', 'Temple booking', 'ID / document', 'Other')),
    reference_pnr TEXT,
    provider TEXT,
    booking_date DATE,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    seat_details TEXT,
    status TEXT NOT NULL DEFAULT 'Needs verification' CHECK (status IN ('Needs verification', 'Confirmed', 'Waitlisted', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_trip ON bookings(trip_id);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD bookings for their trips"
    ON bookings FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. BOOKING DOCUMENTS (Private Vault Metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'Train Ticket' CHECK (doc_type IN ('Train Ticket', 'Bus Ticket', 'Hotel Receipt', 'ID Proof', 'Temple Pass', 'Other')),
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    storage_path TEXT NOT NULL,
    travel_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_documents_trip ON booking_documents(trip_id);
ALTER TABLE booking_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD booking documents for their trips"
    ON booking_documents FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_booking_documents_updated_at
    BEFORE UPDATE ON booking_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 9. TRANSPORT LEGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transport_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_id UUID REFERENCES itinerary_days(id) ON DELETE SET NULL,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('Train', 'State Bus', 'Local Bus', 'Shared Auto', 'Walking', 'Taxi', 'Other')),
    service_number TEXT,
    departure_time TEXT,
    arrival_time TEXT,
    status TEXT NOT NULL DEFAULT 'Needs verification' CHECK (status IN ('Needs verification', 'Scheduled', 'Booked', 'Completed')),
    needs_verification BOOLEAN NOT NULL DEFAULT TRUE,
    booking_ref TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transport_legs_trip ON transport_legs(trip_id);
ALTER TABLE transport_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD transport legs for their trips"
    ON transport_legs FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_transport_legs_updated_at
    BEFORE UPDATE ON transport_legs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 10. ACCOMMODATION STAYS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accommodation_stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stay_type TEXT NOT NULL DEFAULT 'Dharamshala' CHECK (stay_type IN ('Dharamshala', 'Budget Hotel', 'Ashram', 'Dormitory', 'Night Train', 'Other')),
    city TEXT NOT NULL,
    checkin_date DATE,
    checkout_date DATE,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00 CHECK (estimated_cost >= 0),
    contact_phone TEXT,
    address TEXT,
    booking_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accommodation_stays_trip ON accommodation_stays(trip_id);
ALTER TABLE accommodation_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD accommodations for their trips"
    ON accommodation_stays FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_accommodation_stays_updated_at
    BEFORE UPDATE ON accommodation_stays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 11. PLACES (Jyotirlingas, Temples, Heritage Sites)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    place_type TEXT NOT NULL DEFAULT 'Jyotirlinga' CHECK (place_type IN ('Jyotirlinga', 'Temple', 'Cave', 'Ghat', 'Viewpoint', 'Heritage', 'Transit')),
    significance TEXT,
    opening_hours TEXT,
    dress_code TEXT,
    darshan_type TEXT,
    needs_verification BOOLEAN NOT NULL DEFAULT FALSE,
    map_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_places_trip ON places(trip_id);
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD places for their trips"
    ON places FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_places_updated_at
    BEFORE UPDATE ON places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 12. CHECKLIST ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Documents', 'Clothing', 'Medicines', 'Electronics', 'Toiletries', 'Gear', 'Pre-Trip Preparation')),
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_trip ON checklist_items(trip_id);
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD checklists for their trips"
    ON checklist_items FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 13. TRIP NOTES (Daily logs, reflections, important advice)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_id UUID REFERENCES itinerary_days(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('General', 'Emergency', 'Travel Tip', 'Reflection', 'Contact')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_notes_trip ON trip_notes(trip_id);
ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD trip notes for their trips"
    ON trip_notes FOR ALL
    USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()))
    WITH CHECK (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

CREATE TRIGGER set_trip_notes_updated_at
    BEFORE UPDATE ON trip_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 14. SYNC METADATA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_version TEXT,
    CONSTRAINT unique_device_trip_sync UNIQUE (trip_id, device_id)
);

ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their sync metadata"
    ON sync_metadata FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 15. PRIVATE STORAGE BUCKET POLICIES FOR 'trip-documents'
-- ------------------------------------------------------------------------------
-- Create bucket if it doesn't exist (Supabase storage.buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-documents',
    'trip-documents',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can only upload and read files inside their own user_id directory
CREATE POLICY "Users can upload their own trip documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'trip-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read their own trip documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'trip-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own trip documents"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'trip-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own trip documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'trip-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
