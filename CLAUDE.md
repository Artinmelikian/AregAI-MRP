# AregAI MRP — Claude Context

## What this app does
Lightweight MRP (Material Requirements Planning) system for AregAI's robot production planning. Staff use it to manage Bills of Materials per robot model, track parts inventory, run mixed-batch production feasibility checks, and monitor reorder alerts.

## Tech Stack
- **React 18 + Vite** — frontend SPA
- **Tailwind CSS v3** — utility-first styling, no component library
- **React Router v6** — client-side routing with `BrowserRouter`
- **Supabase** — Postgres database + Row-Level Security + email/password auth
- **date-fns** — date arithmetic (subDays, isBefore, format)
- **react-hot-toast** — toast notifications
- **Vercel** — hosting (SPA rewrites via vercel.json)

## Environment Variables
Copy `.env.local.example` → `.env.local` and fill in values from Supabase Dashboard → Project Settings → API:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database Schema
Run `supabase/schema.sql` in the Supabase SQL editor. Tables:
- `robot_models` — SOBOT, MOWBOT, CBOT, and future models
- `parts` — stock_level, lead_time_days, reorder_threshold, unit
- `bom_items` — many-to-many: robot_model_id + part_id + quantity_per_unit

All tables have RLS enabled; authenticated users have full read/write access.

## Project Structure
```
src/
  lib/supabase.js          # Supabase client (singleton)
  hooks/
    useRobotModels.js      # CRUD: robot_models table
    useParts.js            # CRUD: parts table; computes lowStockParts
    useBOM.js              # CRUD: bom_items for a given robot model
    useProduction.js       # MRP calculation logic (client-side)
  components/
    Layout.jsx             # Sidebar nav + page shell
    ReorderAlerts.jsx      # Alert cards for low/out-of-stock parts
    PartsTable.jsx         # Inline-editable inventory table
    BOMEditor.jsx          # BOM table with inline qty editing + add/remove
    PlannerForm.jsx        # Mixed-batch input + date picker
    PlannerResults.jsx     # Results table with color coding + status banner
  pages/
    Login.jsx              # Email/password auth form
    Dashboard.jsx          # Stat cards + ReorderAlerts
    Parts.jsx              # Parts & Inventory page
    Models.jsx             # Robot model list + BOMEditor panel
    Planner.jsx            # Production planner (form → results)
  App.jsx                  # Routes + AuthGuard
  main.jsx                 # React entry point
```

## Key Patterns

### Inline editing
Click any table cell → shows `<input>` → blur or Enter saves to Supabase. Escape cancels. Pattern used in `PartsTable`, `BOMEditor`.

### MRP Calculation (useProduction.js)
1. Fetch all BOM items for models in the batch (single query with `.in()`)
2. Aggregate `quantity_per_unit × qty` per part across all models
3. Compute shortage = max(0, required − in_stock)
4. Compute orderByDate = targetDate − lead_time_days
5. Flag isUrgent if orderByDate < today

### Color coding convention
- Green: sufficient stock / no shortage
- Orange: at reorder threshold (warning)
- Red: below threshold / shortage / urgent

### Auth
Supabase email/password. `AuthGuard` in App.jsx checks session on mount and listens for auth state changes. Redirect to `/login` if no session.

## Running Locally
```bash
npm install
cp .env.local.example .env.local
# Fill in Supabase values, then:
npm run dev
```

## Deploying to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy — `vercel.json` handles SPA routing

## Adding a New Robot Model
No code changes needed — add via the Robot Models UI. The BOM editor and Production Planner automatically pick it up.

## Adding a New Feature
- New page: add to `src/pages/`, add a route in `App.jsx`, add a nav item in `Layout.jsx`
- New table: add to `supabase/schema.sql`, create RLS policy, write a hook in `src/hooks/`
