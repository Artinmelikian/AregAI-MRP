# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does
Lightweight MRP (Material Requirements Planning) system for AregAI's robot production planning. Staff manage Bills of Materials per robot model, track parts inventory, run mixed-batch production feasibility checks, and monitor reorder alerts.

## Commands
```bash
npm run dev      # Start dev server (usually port 5173 or 5174)
npm run build    # Production build
npm run preview  # Preview production build locally
```

## Environment
Copy `.env.local.example` → `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database
Run `supabase/schema.sql` in Supabase SQL Editor to create all tables. Tables:
- `robot_models` — robot model definitions (SOBOT, MOWBOT, CBOT + any added via UI)
- `parts` — inventory: stock_level, lead_time_days, reorder_threshold, unit, link
- `bom_items` — many-to-many robot↔parts with quantity_per_unit and link
- `assembly_stages` — per-model assembly breakdown: category ('mechanical'|'electrical'), duration_days, order_index

All tables have RLS enabled; authenticated users have full read/write. New tables must follow the same pattern: `alter table X enable row level security` + `create policy "authenticated_all" on X for all to authenticated using (true) with check (true)`.

## Architecture

### Data flow
Each page uses one or more custom hooks that own all Supabase queries and local state. Components receive data and callbacks as props — no component talks to Supabase directly.

### Hooks (`src/hooks/`)
- `useRobotModels` — CRUD for robot_models
- `useParts` — CRUD for parts; exposes `lowStockParts` (stock_level ≤ reorder_threshold); ordered by `created_at` ascending (insertion order)
- `useBOM(robotModelId)` — CRUD for bom_items for one model
- `useAssemblyStages(robotModelId)` — fetches assembly_stages; auto-seeds the 8 default stages (4 mechanical + 4 electrical) if none exist for the model; returns `mechanicalStages`, `electricalStages`, `totalAssemblyDays`
- `useProduction` — core MRP engine: fetches BOM + assembly stages in parallel, aggregates required parts across batch, computes shortage/orderByDate accounting for assembly lead time

### MRP calculation (`useProduction.js`)
```
assemblyDays     = max(totalAssemblyDays across all models in batch)
partsNeededBy    = targetDate − assemblyDays
orderByDate      = partsNeededBy − part.lead_time_days
isUrgent         = orderByDate < today
shortage         = max(0, required − inStock)
feasible         = all shortages === 0
```

### Key UI patterns
**Inline editing** — click any cell → `<input>` appears → blur or Enter saves to Supabase, Escape cancels. Used in `PartsTable`, `BOMEditor`, `AssemblyEditor`. The `EditableCell` pattern: local `editing` state, `draft` value, `commit()` on blur/Enter.

**Link field** — accepts plain text or URLs. Renders as clickable `<a>` only when value matches `/^https?:\/\//`. Used in both `PartsTable` and `BOMEditor`.

**Drag-to-reorder columns** — `PartsTable` supports HTML5 drag-and-drop on `<th>` elements. Column order is persisted in `localStorage` under key `parts-column-order`.

**Bulk import** — `BulkImportPanel` parses tab-separated clipboard data from Google Sheets, maps columns, previews add/update actions, then calls `onAdd`/`onUpdate` per row.

**Assembly auto-seed** — `useAssemblyStages` inserts the 8 default stages via upsert with `onConflict: 'robot_model_id,category,order_index'` to prevent React StrictMode double-invocation duplicates. The unique constraint `assembly_stages_unique` must exist in the DB.

### Color coding
- Green: sufficient stock / no shortage
- Orange: at or near reorder threshold
- Red: shortage / urgent / out of stock

### Auth
Supabase email/password. `AuthGuard` in `App.jsx` wraps all protected routes, checks session on mount, and listens to `onAuthStateChange`. `supabaseConfigured` flag in `src/lib/supabase.js` shows a setup screen instead of crashing when env vars are missing.

## Adding features
- **New page**: add to `src/pages/`, route in `App.jsx`, nav item in `Layout.jsx`
- **New DB table**: add to `supabase/schema.sql` with RLS, create hook in `src/hooks/`
- **New robot model**: no code changes — add via the Robot Models UI

## Deployment
Push to GitHub → import in Vercel → add the two env vars → deploy. `vercel.json` handles SPA routing rewrites.
