-- ==============================================================================
-- Yatra — My Pilgrimage Planner
-- Database Schema Migration 002: Add day_id to checklist_items (PROPOSED DRAFT)
--
-- PURPOSE:
-- Enables Day Details checklist items to preserve foreign key association with
-- specific itinerary days in Supabase cloud, matching local Dexie & TypeScript models.
--
-- SAFETY & COMPATIBILITY:
-- 1. Adds day_id as a NULLABLE column: does NOT break existing general trip checklists.
-- 2. Foreign Key references itinerary_days(id) ON DELETE SET NULL:
--    Matches expenses, transport_legs, and trip_notes behavior. If a day is removed,
--    the checklist item is preserved as a general item rather than causing data loss.
-- 3. Creates an index on day_id for fast day-level queries.
-- 4. RLS policies on checklist_items remain completely unchanged because
--    they already evaluate trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()).
--
-- STATUS: DRAFT ONLY — NOT YET APPLIED TO LIVE DATABASE
-- ==============================================================================

-- 1. Add nullable day_id foreign key column
ALTER TABLE checklist_items
ADD COLUMN IF NOT EXISTS day_id UUID REFERENCES itinerary_days(id) ON DELETE SET NULL;

-- 2. Create index on day_id
CREATE INDEX IF NOT EXISTS idx_checklist_items_day ON checklist_items(day_id);

-- 3. Add column comment for documentation
COMMENT ON COLUMN checklist_items.day_id IS 'Optional foreign key to itinerary_days for Day Details specific checklists. NULL for general trip checklists.';
