# Workflow: Shopify Sync Changes

Reference for working on anything in `utils/shopify_client.py` or `workers/sync_tasks.py`.

## API Version

Current: **2025-01**. Check `app/config.py` for `SHOPIFY_API_VERSION`.

## Breaking Changes in 2025-01

| What changed | Old | New |
|---|---|---|
| Product options | `options: [String!]` in `ProductInput` | `productOptions: [OptionCreateInput!]` with value arrays |
| Variants on create | `variants: [...]` in `ProductInput` | Not supported — create shell first, then bulk update |
| SKU on variant | Top-level `sku` in `ProductVariantsBulkInput` | Nested: `inventoryItem: { sku, requiresShipping }` |
| Option values on create | `selectedOptions: [...]` | `optionValues: [{ optionName, name }]` |
| Option values on update | Sent in update | Never send option fields on update — immutable on existing variants |

## Create Flow

1. `productCreate` with `productOptions` — Shopify auto-creates variants
2. Fetch auto-created variants, match to local variants by `selectedOptions`
3. `productVariantsBulkUpdate` to set price/sku/inventory on matched variants

## Update Flow

1. Pre-fetch Shopify product (catches "not found" and option mismatches)
2. If option names differ: delete Shopify product, clear `shopify_product_id`, recreate from scratch
3. If "not found": clear `shopify_product_id`, proceed as new create
4. `productUpdate` for product-level fields (title, body, tags, etc.)
5. `productVariantsBulkUpdate` for existing variants (no option fields)
6. `productVariantsBulkCreate` for new variants

## Sync Hash

`product.shopify_hash` = SHA256 of the serialized payload sent last time. If the new payload hash matches, skip the API call entirely.

**Always clear `shopify_hash = None` when:**
- Merging products
- Any operation that should force a re-sync regardless of content

## When to Flag `out_of_sync`

Set `sync_status = "out_of_sync"` when any of these change on a synced product:
`title, body_html, tags, vendor, product_type, base_price, compare_at_price`

Also clear `shopify_hash` when flagging out_of_sync so the next sync sends a fresh payload.

## Sync Price Only

`sync_price_update_only.delay(str(product_id))` — queues a lightweight sync that only updates variant prices. Use after alert approval or schedule activation instead of a full sync.

## Adding a New Field to Sync

1. Add it to the payload dict in `shopify_client.py` `build_product_payload()`
2. It will be included in the hash automatically
3. If it's a field that can change independently, add it to the out-of-sync trigger list in `routers/products.py`
