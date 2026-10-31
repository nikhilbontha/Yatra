# 🕉️ Yatra — My Pilgrimage Planner
> Production-ready, mobile-first, offline-first personal travel management application built for the solo Jyotirlinga pilgrimage from Hyderabad to Khammam (17 November – 5 December 2026).

---

## 1. Project Overview

**Yatra** is a travel planner designed for a 19-day solo budget pilgrimage covering 7 sacred Jyotirlingas, ancient rock-cut cave temples, and sacred river ghats across Telangana, Maharashtra, Madhya Pradesh, and Gujarat.

### Key Capabilities
- **Zero-Latency Offline-First Operation**: Runs completely in the browser with **IndexedDB (Dexie.js)**. Works offline on remote trains, ghats, and hill shrines without requiring an active internet connection.
- **Private Cloud Synchronization**: Optional two-way synchronization with a personal **Supabase PostgreSQL** database protected by strict **Row Level Security (RLS)**.
- **Financial Precision Engine**: Strict budget calculations (Total Spent, Available to Spend, Protected Emergency Reserve, Physical Cash on Hand) with zero floating-point rounding errors.
- **Document & Ticket Vault**: Private vault for IRCTC e-tickets, PNR records, bus reservations, and dharamshala receipts, stored locally for offline access or in private Supabase Storage via short-lived signed URLs.
- **Progressive Web App (PWA)**: Installable on Android, iOS, and laptops with offline service worker caching and native look & feel.
- **Privacy & Shared Laptop Protection**: Designed with a safe logout mechanism that cleans local document blobs and sync tokens when logging out on shared devices.

---

## 2. Technology Stack & Selected Versions

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `16.4.0` | React framework with server and client components |
| **Core UI Library** | React / React DOM | `19.3.0` | Modern React with concurrent rendering |
| **Styling** | Tailwind CSS | `v4` | Mobile-first custom design tokens, off-white & forest-green palette |
| **Offline Storage** | Dexie.js | `4.4.6` | Client-side IndexedDB wrapper for relational entities & sync queue |
| **Cloud Database & Auth** | Supabase JS | `2.117.3` | PostgreSQL database, Email/Password authentication, Private storage |
| **Schema Validation** | Zod | `3.24.x` | Runtime schema validation for trips, expenses, documents, and days |
| **Icons** | Lucide React | `1.56.0` | Accessible, clean pilgrimage and travel iconography |
| **Testing** | Vitest | `5.0.4` | Automated unit and integration test suite |

---

## 3. Preloaded 19-Day Pilgrimage Itinerary

The application comes preloaded with the complete 19-day itinerary from **Hyderabad, Telangana** to **Khammam, Telangana** (17 Nov – 5 Dec 2026):

* **Day 1 (17 Nov 2026)**: Hyderabad to Shirdi — Board planned Train 17208 from Secunderabad toward Sainagar Shirdi *(Marked "Needs verification")*.
* **Day 2 (18 Nov 2026)**: Shirdi — Sai Baba Samadhi Mandir, Dwarkamai, Chavadi, Gurusthan, Lendi Baug, Khandoba Temple. Budget stay.
* **Day 3 (19 Nov 2026)**: Shirdi to Grishneshwar — Travel via Chhatrapati Sambhajinagar toward Verul/Ellora. **Grishneshwar Jyotirlinga (Jyotirlinga #1)**.
* **Day 4 (20 Nov 2026)**: Ellora Caves — Cave 16 (Kailasa Temple), Buddhist & Jain caves. Proceed toward Nashik.
* **Day 5 (21 Nov 2026)**: Nashik — Panchavati, Ramkund on Godavari, Kalaram Temple. Trimbakeshwar access verification.
* **Day 6 (22 Nov 2026)**: Conditional Trimbakeshwar — **Trimbakeshwar Jyotirlinga (Jyotirlinga #2)** & Kushavarta Kund *(Conditional / Needs verification)*.
* **Day 7 (23 Nov 2026)**: Bhimashankar Jyotirlinga — **Bhimashankar Jyotirlinga (Jyotirlinga #3)** via Pune MSRTC bus *(Needs verification)*. Return to Pune.
* **Day 8 (24 Nov 2026)**: Pune to Lonavala — Scenic daytime local suburban train. Explore viewpoint.
* **Day 9 (25 Nov 2026)**: Lonavala/Pune toward Indore — Verified long-distance rail transit *(Needs verification)*.
* **Day 10 (26 Nov 2026)**: Indore to Omkareshwar — State bus to Mandhata Island. **Omkareshwar Jyotirlinga (Jyotirlinga #4)** and Narmada ghats.
* **Day 11 (27 Nov 2026)**: Omkareshwar & Mamleshwar to Ujjain — Mamleshwar darshan on south bank. Bus via Indore to Ujjain.
* **Day 12 (28 Nov 2026)**: Ujjain — **Mahakaleshwar Jyotirlinga (Jyotirlinga #5)**, Mahakal Lok corridor, Ram Ghat, Kal Bhairav Temple.
* **Day 13 (29 Nov 2026)**: Ujjain to Dwarka — Verified rail connection toward Saurashtra *(Needs verification)*.
* **Day 14 (30 Nov 2026)**: Dwarka & Nageshwar — Dwarkadhish Temple, Gomti Ghat, Rukmini Devi Temple, **Nageshwar Jyotirlinga (Jyotirlinga #6)**.
* **Day 15 (01 Dec 2026)**: Dwarka to Somnath — Optional Bet Dwarka / Gopi Talav. GSRTC bus along coastal highway.
* **Day 16 (02 Dec 2026)**: Somnath — **Somnath Jyotirlinga (Jyotirlinga #7 / First Jyotirlinga)**, Bhalka Tirth, Dehotsarg/Golokdham, Triveni Sangam.
* **Day 17 (03 Dec 2026)**: Somnath toward Ahmedabad — Veraval rail connection toward Ahmedabad/Gandhinagar *(Needs verification)*.
* **Day 18 (04 Dec 2026)**: Return journey toward Khammam — Rail connection across Central/South India.
* **Day 19 (05 Dec 2026)**: Expected arrival in Khammam — Reconcile final spending, back up trip records.

> **Note on Verification**: All uncertain train schedules, platform numbers, temple darshan protocols, and road closures are clearly flagged with **"Needs verification"** badges. Every day, task, time, and note is fully editable by the user.

---

## 4. Local Installation & Development

### Prerequisites
- Node.js `v20.x` or higher (`v24.x` tested)
- npm `10.x` or higher

### Steps
1. Clone the repository and navigate into the project directory:
   ```bash
   cd travelwithme
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   *(The app operates 100% offline using IndexedDB out of the box even without Supabase keys)*.

4. Run the development server:
   ```bash
   npm run dev -- --port 3005
   ```
   Open [http://localhost:3005](http://localhost:3005) in your browser.

5. Run automated unit tests:
   ```bash
   npm test
   ```

6. Build for production:
   ```bash
   npm run build
   ```

---

## 5. Supabase Database & Private Cloud Setup

To enable private cloud synchronization across multiple devices:

### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy your **Project URL** and **anon public key**.

### Step 2: Apply the Database Migration
1. Open the **SQL Editor** in your Supabase dashboard.
2. Copy and execute the contents of `supabase/migrations/001_initial_schema.sql`.
   - This creates all relational tables: `profiles`, `trips`, `itinerary_days`, `itinerary_items`, `expenses`, `budget_categories`, `bookings`, `booking_documents`, `transport_legs`, `accommodation_stays`, `places`, `checklist_items`, `trip_notes`, and `sync_metadata`.
   - Enables Row Level Security (RLS) on **all tables** ensuring users can only read and write their own records.
   - Configures child verification checks so records cannot be attached to another user's trip.
   - Configures the private `trip-documents` storage bucket with folder-level isolation (`auth.uid()/*`).

### Step 3: (Optional) Preload Seed Data in Supabase
Run `supabase/seed.sql` in the SQL Editor after signing up to populate the 19 days directly into your cloud database. Alternatively, the app will automatically synchronize your preloaded local itinerary on first login.

### Step 4: Configure Environment Variables
In `.env.local` (or the in-app **More -> Cloud & Settings** tab):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=trip-documents
```

---

## 6. Financial Formulas & Budget Rules

All financial calculations follow strict formulas to prevent duplicate counts or accounting errors:

1. **Total Spent**:
   $$\text{Total Spent} = \sum \text{Recorded Expenses (excluding Cash Inflows / Transfers)}$$
2. **Available to Spend**:
   $$\text{Available to Spend} = \text{Total Budget} - \text{Total Spent} - \text{Emergency Reserve}$$
3. **Cash on Hand**:
   $$\text{Cash on Hand} = \text{Opening Cash} + \text{ATM / Cash Inflows} - \text{Cash Expenses}$$

- **Zero Invention**: Total budget starts at ₹0 until configured by the user.
- **Protected Emergency Reserve**: Emergency funds are strictly deducted from available spendable money. An alert is displayed if expenses breach the reserve limit.
- **Account Transfers**: ATM cash withdrawals tagged as "Cash Inflow" increase physical cash on hand without inflating total expenditures.
- **CSV Export**: Compliant with RFC 4180 with UTF-8 Byte Order Mark (BOM) for opening in Excel or Google Sheets.

---

## 7. Offline-First & Conflict Resolution Engine

1. **Local First**: Every create, edit, or delete is immediately written to **IndexedDB** with high performance.
2. **Offline Queue**: When offline or before syncing, operations are queued in `syncQueue` with deterministic UUIDs.
3. **Idempotent Writes**: All records use client-generated UUIDs (`crypto.randomUUID()`) to prevent duplicate records during network retries.
4. **Conflict Resolution UI**: If a record was modified both locally and in the cloud, a visual conflict modal appears allowing you to inspect both versions and choose **"Keep Local Version"** or **"Accept Cloud Version"**.
5. **Shared Laptop Protection**: Clicking **Sign Out** clears locally cached document blobs and session tokens to protect sensitive files on public devices.

---

## 8. PWA Installation

### Android (Chrome / Brave / Firefox)
1. Open the application in mobile Chrome.
2. Tap the browser menu (three dots) -> **"Install app"** or **"Add to Home Screen"**.
3. The app will install with a native launcher icon and open full-screen.

### Laptop (Chrome / Edge)
1. In the browser address bar, click the **Install icon** (monitor with down arrow).
2. Click **Install** to run Yatra as a standalone desktop window.

---

## 9. Security & Production Checklist

- [x] **Zero Secrets in Code**: No API keys, passwords, or service-role keys committed or bundled.
- [x] **Row Level Security (RLS)**: Enforced on all 14 PostgreSQL tables.
- [x] **Storage Privacy**: Document bucket is strictly private; downloads use 15-minute signed URLs.
- [x] **Strict Validation**: All inputs validated via Zod schemas.
- [x] **Offline Resilience**: Complete 19-day itinerary, checklists, and expenses operable without network.
- [x] **Automated Tests**: Unit tests passing for calculations, itinerary chronology, validation, and sync.
- [x] **PWA Assets**: Valid Web App Manifest, Service Worker, and high-resolution icons.

---

## 10. License

Private personal use for pilgrimage travel planning.
