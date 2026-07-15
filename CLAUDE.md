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
- `parts` — inventory: stock_level, lead_time_days, reorder_threshold, unit, link, description, notes (text), plus purchasing fields `purchasing_status` (one of 9 stages, default 'To be Sourced') and `qty_on_order` (default 0). Unique constraint is `(name, description)` — same name with different description is a distinct part. **Do not rely on a `UNIQUE(name)` constraint; it was dropped.**
- `bom_items` — many-to-many robot↔parts with quantity_per_unit and link
- `assembly_stages` — per-model assembly breakdown: category ('mechanical'|'electrical'), duration_days, order_index
- `production_plans` — saved planner inputs: name, target_date, batch (jsonb array of `{modelId, qty}`), feasible (snapshot at save time)
- `logistics` — standalone shipment tracker (no FK to parts): product_name, status (11-stage), eta, quantity, supplier, unit_price, invoice_number, invoice_amount, currency, order_date, responsible_person, department, lead_time_days, payment_method, invoice_status, invoice_status_date, source_of_procurement, delivery_term, actual_arrival_date, transportation_cost, transportation_payment, custom_clearance_cost, custom_clearance_status, expertise_service_fee, expertise_fee_payment_status
- `logistics_attachments` — file attachments per logistics row: logistics_id (FK→logistics), file_name, file_path (Supabase Storage path in bucket `logistics-files`), file_size, mime_type, uploaded_by
- `logistics_history` — auto-populated change log: logistics_id (FK→logistics), field_name, old_value, new_value, changed_by (auth.email()), changed_at. Populated by plpgsql trigger `logistics_audit` on UPDATE of `logistics`.

All tables have RLS enabled; authenticated users have full read/write. New tables must follow the same pattern: `alter table X enable row level security` + `create policy "authenticated_all" on X for all to authenticated using (true) with check (true)`.

## Architecture

### Data flow
Each page uses one or more custom hooks that own all Supabase queries and local state. Components receive data and callbacks as props — no component talks to Supabase directly.

### Hooks (`src/hooks/`)
- `useRobotModels` — CRUD for robot_models
- `useParts` — CRUD for parts; exposes `lowStockParts` (stock_level ≤ reorder_threshold); ordered by `created_at` ascending (insertion order)
- `useBOM(robotModelId)` — CRUD for bom_items for one model
- `useAssemblyStages(robotModelId)` — fetches assembly_stages; auto-seeds the 8 default stages (4 mechanical + 4 electrical) if none exist for the model; returns `mechanicalStages`, `electricalStages`, `totalAssemblyDays`
- `useProduction` — core MRP engine: fetches BOM + assembly stages in parallel, aggregates required parts across batch, computes shortage/orderByDate accounting for assembly lead time; `calculate()` result also includes `targetDateStr` and `batch` (raw inputs) so a run can be saved/reopened
- `useProductionPlans` — CRUD for `production_plans` (`plans`, `savePlan`, `updatePlan`, `deletePlan`), ordered by `created_at` descending
- `useLogistics` — CRUD for `logistics`; ordered by `created_at` descending; clicking "+ Add Shipment" immediately inserts a row with defaults (no save button — all editing is inline)
- `useUserRole` — reads `app_metadata.role` from Supabase session; returns `{ role, isViewer }`. Role `'viewer'` = read-only UI on all sections except Logistics Tracker.
- `useColumnWidths(storageKey, defaults)` — generic per-table column width state, persisted to `localStorage`; returns `[widths, setWidth]`

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

**Drag-to-reorder columns** — `PartsTable`, `PurchasingTracker`, and `LogisticsTracker` all support HTML5 drag-and-drop on `<th>` elements. Column order is persisted in `localStorage` under per-table keys (`parts-column-order`, `purchasing-column-order`, `logistics-column-order`). A `resizingCol` state guards `draggable={!resizingCol}` on `<th>` so resize and drag-reorder don't conflict.

**Resizable columns** — `useColumnWidths` + `ResizeHandle` give every data table drag-to-resize `<th>` columns via `<colgroup>` + `tableLayout: fixed`. To allow narrowing columns below content width, set the table's `width` to the computed pixel sum of all column widths (not `max-content`). Storage keys: `parts-column-widths`, `bom-column-widths`, `planner-assembly-column-widths`, `planner-parts-column-widths`, `purchasing-column-widths-v2`, `logistics-column-widths-v2`.

**Search** — `PartsTable` and `BOMEditor` have local search inputs. Matching uses `normalize(s) = s.toLowerCase().replace(/\s+/g, '')` (strips ALL whitespace) so queries like `"DC-DC 48 > 12"` match `"DC-DC 48>12"`. Models list in `Models.jsx` has a separate model-name search.

**Bulk import** — `BulkImportPanel` (Parts & Inventory) parses tab-separated clipboard data from Google Sheets, maps columns, previews add/update actions, then calls `onAdd`/`onUpdate` per row. Duplicate detection uses a composite key `(name, description)` — same-name/different-description rows are treated as distinct parts. Within-paste duplicates prompt confirmation before import; existing-DB matches are flagged as "Update".

**BOM bulk paste** — `BOMEditor` has a collapsible "📋 Paste from Google Sheets" panel that validates each pasted row against `allParts` inventory (passed as prop, no extra DB call). Rows must match an existing inventory part (by normalized name); unmatched rows are shown as `not_found` and blocked from import.

**BOM multi-select** — `BOMEditor` has per-row checkboxes + select-all for bulk deletion. `bulkDeleteConfirm` state gates an inline confirmation before the Supabase deletes fire.

**Parts multi-select** — `PartsTable` has per-row checkboxes + select-all for bulk deletion (hidden for viewer role). `bulkDeleteConfirm` state gates confirmation.

**Assembly auto-seed** — `useAssemblyStages` inserts the 8 default stages via upsert with `onConflict: 'robot_model_id,category,order_index'` to prevent React StrictMode double-invocation duplicates. The unique constraint `assembly_stages_unique` must exist in the DB.

**Saved production plans** — `Planner.jsx` orchestrates `useProductionPlans` + `useProduction`. Saving stores raw inputs (`batch`, `target_date`) plus a `feasible` snapshot; opening a saved plan re-runs `calculate()` against current stock so shortages always reflect live inventory. `SavedPlansPanel` lists plans with inline rename, Open, and delete.

**Purchasing tracker** (`PurchasingTracker.jsx`, page `/purchasing`) — global, per-part procurement status tracker covering all parts, not just current shortages. `STATUS_OPTIONS` defines the 9-stage workflow (In-house Build → Local Store → To be Sourced → Negotiating w/Supplier → Test Sample Ordered → To be Ordered → Ordered → Shipped → Received). Status via `StatusSelect`; `qty_on_order` via `EditableQty`; `notes` via `EditableNotes`. The "Receive" button (`handleReceive`) adds `qty_on_order` to `stock_level` (additive), resets `qty_on_order` to 0, sets status to 'Received'. Supports per-row checkboxes + select-all, CSV export of selected rows, and drag-to-reorder columns. Column widths key: `purchasing-column-widths-v2`. Column order key: `purchasing-column-order`.

**Logistics tracker** (`LogisticsTracker.jsx`, page `/logistics`) — standalone (not linked to inventory) shipment tracker with 25 fields including `invoice_number`. Status uses an 11-stage workflow: Order Received → Source Chosen → Invoice Issued → Invoice Passed to Finance Dep → Invoice Paid → In Lead Time → Ready To Pickup → Picked Up / On The Way → Arrived to Armenia → In Custom Clearance → Delivered / Received. Several fields are dropdowns: Payment Method (Invoice, PayPal), Currency (USD, EUR, AMD), Invoice Status, Source of Procurement, Delivery Term, Transportation Payment, Custom Clearance Status, Expertise Fee Payment Status. ETA field turns red when overdue. Number fields display with locale comma formatting (e.g. 136500 → 136,500); editing shows raw number. A **totals footer row** (`<tfoot>`) sums Invoice Amount, Transportation Cost, Custom Clearance Cost, and Expertise Service Fee across visible rows. **Important**: status and other dropdowns use native `<select>` elements — do NOT use absolute-positioned custom popovers inside `overflow-auto` table containers, as they get clipped. Column widths key: `logistics-column-widths-v2`. Column order key: `logistics-column-order`.

**Logistics file attachments** — each logistics row has a 📎 button that opens `LogisticsAttachmentsModal`. Files are stored in Supabase Storage bucket `logistics-files` at path `{logistics_id}/{uuid}.{ext}`. The `logistics_attachments` table tracks metadata. A count badge on the button shows how many files are attached. Files open via signed URLs (1-hour expiry).

**Logistics change history** — each logistics row has a 🕐 button that opens `LogisticsHistoryModal`, showing a timeline of all field edits. Changes are auto-logged by the `logistics_audit` DB trigger (fires on UPDATE, compares old/new jsonb, writes one row per changed field to `logistics_history`). `changed_by` is captured via `auth.email()` inside the trigger.

**Send Shortages to Purchasing** — on `PlannerResults`, a button (enabled when any row has `shortage > 0`) calls `Planner.jsx`'s `handleSendToPurchasing`, which sets `qty_on_order = shortage` and `purchasing_status = 'To be Ordered'` for each shortfall part via `updatePart`. Re-clicking overwrites (not adds to) existing values.

### Role-based access
`RoleContext` (exported from `App.jsx`) provides `{ isViewer }` to all pages. `useUserRole` hook reads `app_metadata.role` from the Supabase JWT. Role `'viewer'` hides all edit controls (add, delete, inline edit, bulk delete, receive button) on Parts, BOM, Models, Planner, and Purchasing pages. Logistics Tracker is **fully editable for all roles**. To grant viewer access: create user in Supabase Auth, then run `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "viewer"}' where email = '...';`

### Color coding
- Green: sufficient stock / no shortage
- Orange: at or near reorder threshold
- Red: shortage / urgent / out of stock

### Auth
Supabase email/password. `AuthGuard` in `App.jsx` wraps all protected routes, checks session on mount, and listens to `onAuthStateChange`. `supabaseConfigured` flag in `src/lib/supabase.js` shows a setup screen instead of crashing when env vars are missing.

## Adding features
- **New page**: add to `src/pages/`, route in `App.jsx`, nav item in `Layout.jsx` (`navItems` array)
- **New DB table**: add to `supabase/schema.sql` with RLS, create hook in `src/hooks/`
- **New robot model**: no code changes — add via the Robot Models UI

## Deployment
Push to GitHub → import in Vercel → add the two env vars → deploy. `vercel.json` handles SPA routing rewrites.
