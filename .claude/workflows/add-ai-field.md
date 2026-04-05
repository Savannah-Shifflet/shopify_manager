# Workflow: Adding a New AI Suggestion Field

AI fields follow a strict non-destructive pattern. The user always explicitly accepts before anything overwrites a main field.

## The Contract

Every AI field has:
- A **staging column** (`ai_<name>`) — enrichment writes here
- A **main column** — only updated via explicit user acceptance
- An **accept flag** (`accept_ai_<name>`) sent in `PATCH /products/{id}`

All mappings live in `ACCEPTANCE_MAP` in `backend/app/services/ai_acceptance.py`. This is the single source of truth.

---

## Checklist

### 1. Migration
- [ ] Create migration: `op.add_column("products", sa.Column("ai_<name>", ...))`
- [ ] Update `backend/CLAUDE.md` migrations table

### 2. Model
- [ ] Add `ai_<name> = Column(...)` to `Product` in `backend/app/models/product.py`
- [ ] Keep it in the "AI staging" comment block

### 3. Schema
- [ ] Add `ai_<name>: Optional[...] = None` to `ProductOut` in `schemas/product.py`
- [ ] Add `ai_<name>: Optional[...] = None` to `ProductUpdate` (for direct clear via PATCH)
- [ ] Add `accept_ai_<name>: Optional[bool] = None` to `ProductUpdate`

### 4. Acceptance map
- [ ] Add one row to `ACCEPTANCE_MAP` in `services/ai_acceptance.py`:
  ```python
  ("accept_ai_<name>", "ai_<name>", "<main_field>", "set"),  # or "merge"
  ```
- [ ] If the main field triggers Shopify sync, add it to `SYNC_TRIGGER_FIELDS`

### 5. Enrichment task
- [ ] In `workers/enrichment_tasks.py`, write to `product.ai_<name>` (NOT to the main field)
- [ ] Do this in both `enrich_product` (single) and `_enrich_one_async` (batch)

### 6. Enrichment service
- [ ] In `services/enrichment_service.py`, ensure the field is requested from Claude and returned in the result dict

### 7. Frontend
- [ ] Add `ai_<name>` to the product TypeScript types
- [ ] Display the staged value as a suggestion with Accept / Reject controls in `/products/[id]`
- [ ] Accept: `PATCH { accept_ai_<name>: true }`
- [ ] Reject: `PATCH { ai_<name>: null }`

---

## Example: how `ai_title` was added

1. Migration 015: `op.add_column("products", sa.Column("ai_title", sa.String(500)))`
2. Model: `ai_title = Column(String(500))` in the AI staging block
3. Schema: `ai_title` in `ProductOut`, `ProductUpdate`; `accept_ai_title` in `ProductUpdate`
4. `ACCEPTANCE_MAP`: `("accept_ai_title", "ai_title", "title", "set")`
5. Enrichment: `product.ai_title = result["title"]` (was incorrectly `product.title` before)
