# Workflow: Adding a New Feature

Follow this checklist in order. Each step catches things the next step depends on.

## 1. Data layer
- [ ] Add column(s) to the SQLAlchemy model in `backend/app/models/`
- [ ] Create a new Alembic migration: `alembic revision -m "description"`, fill `upgrade()` / `downgrade()`
- [ ] Run `alembic upgrade head` to apply locally

## 2. Schema layer
- [ ] Add field to the relevant Pydantic schema in `backend/app/schemas/`
- [ ] If it's a list-level field, add it to both `ProductOut` AND `ProductListOut`
- [ ] If it's an AI suggestion field, follow the **add-ai-field workflow** instead

## 3. API layer
- [ ] Add/update the endpoint in the relevant `backend/app/routers/` file
- [ ] All queries filter by `user_id == current_user.id` (or via parent ownership check)
- [ ] Sub-resource endpoints call `_get_<parent>_or_404` before child query
- [ ] If price field: call `record_price_history()` on change, flag `out_of_sync` if `base_price` changed

## 4. Worker layer (if async processing)
- [ ] Add task in `backend/app/workers/`
- [ ] Register in `celery_app.py` beat schedule if periodic
- [ ] Follow 3-phase DB pattern: read→close→work→open→write (never hold connection during I/O)

## 5. Frontend API client
- [ ] Add function to the relevant API object in `frontend/src/lib/api.ts`
- [ ] Add TypeScript types to `frontend/src/types/` if new response shape

## 6. Frontend UI
- [ ] Add/update page in `frontend/src/app/`
- [ ] Wrap in `<PageShell>` with title, description, and actions slot
- [ ] Use TanStack Query for data fetching; `refetchInterval` for polling if job-based
- [ ] Check `src/components/ui/` before creating new components

## 7. Documentation
- [ ] Update `backend/CLAUDE.md` — add to models table and/or API routes
- [ ] Update `backend/app/workers/CLAUDE.md` if a task was added
- [ ] Update `frontend/CLAUDE.md` if a new page was added
- [ ] Update `.claude/production-checklist.md` if the feature has known gaps

## 8. Verify
- [ ] Run `pytest tests/` — fix any failures
- [ ] Test the endpoint manually with the dev user
- [ ] If Shopify sync is involved: verify `shopify_hash` is cleared when content changes
