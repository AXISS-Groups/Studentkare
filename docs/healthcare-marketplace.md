# Studentkare healthcare marketplace

## Product direction

The storefront uses the reference structure at https://www.1mg.com/: service
navigation, search, categories, promotional banners, product shelves, diagnostic
packages, brands, and a cart. It keeps Studentkare's own branding and pearl,
lavender, mint, and warm-neutral visual theme.

The catalog contains **12 fictional products and 4 lab packages**, across 8 product
categories and 5 fictional product brands. Three sample cities are available.
Ratings, savings, product packaging, lab slots, and prices are illustrative.

## Implemented journeys

1. Browse the homepage or a health category.
2. Search globally across product names, brands, categories, and lab packages.
3. Filter by category and brand; sort by price, rating, or percentage savings.
4. Open product or lab details, including package contents and preparation notes.
5. Add products or lab packages to a shared in-memory cart.
6. Use the built-in sample prescription for the fictional prescription item.
7. Change quantities, remove items, select demo delivery or campus pickup, and
   apply or remove the `CARE10` coupon.
8. Select a sample lab-collection slot when required and create a demo order.
9. Visit the health overview or insurance hub and return through **Shop & lab tests**.

The previous healthcare landing page is available through **About Studentkare**.
Existing login and signup screens have a **Back to marketplace** action.

## Cart rules

- Product quantity: 1–10 per item; setting quantity to zero removes the item.
- Lab packages: one selection per package.
- Prescription demo: a sample prescription step is required before adding the
  fictional prescription item. This is not clinical or pharmacy verification.
- Demo delivery: ₹40 when physical-product subtotal is below ₹399; free from ₹399.
- Campus pickup and lab collection: no demo delivery fee.
- `CARE10`: 10% of subtotal, capped at ₹150; computed in paise and applied once.
- Empty carts cannot proceed to checkout. Lab carts require a selected demo slot.
- Checkout clears the cart and displays a session-only confirmation. It collects
  no personal address, document upload, payment, or real-world booking.

Cart state lives above the top-level screens, so it survives in-app navigation.
It is intentionally not written to browser storage or a server. Refreshing the
page clears it.

## Implementation map

| Area | File |
| --- | --- |
| Storefront and discovery | `src/screens/marketplace/HealthcareMarketplace.tsx` |
| Catalog and filtering | `src/data/marketplaceCatalog.ts` |
| Pure cart reducer and totals | `src/data/marketplaceCart.ts` |
| Shared React state | `src/data/MarketplaceStore.tsx` |
| Reusable product and lab cards | `src/components/marketplace/CatalogCards.tsx` |
| Local SVG product images | `src/components/marketplace/ProductArtwork.tsx` |
| Product detail view | `src/components/marketplace/ProductDetails.tsx` |
| Cart and checkout | `src/components/marketplace/CartPanel.tsx` |
| Native modal focus management | `src/components/marketplace/ShopDialog.tsx` |
| Storefront theme and breakpoints | `src/theme/marketplace.css` |
| Local care illustration | `public/marketplace/care-team.svg` |

The new imagery is local SVG artwork, so the marketplace does not depend on
external stock-image requests or copied 1mg product assets. No dependency was
added for the marketplace implementation.

## Motion and accessibility

Promotional banners are manually controlled. Product artwork enters with a short
animation, cards and buttons have hover transitions, and cart feedback uses a
status notification. Reduced-motion preferences disable these animations.

Dialogs use the browser's modal behavior for keyboard containment, close on
Escape, restore the opening control's focus, and prevent background scrolling.
Forms have named controls and error messages. Empty search results and an empty
cart have recovery actions.

## Verification

```sh
npm test
npm run lint
npm run build
```

With a local dev server running and Playwright/Chromium available:

```sh
node tests/marketplace.smoke.mjs
node tests/health-experience.smoke.mjs
```

If using an existing external installation, set `PLAYWRIGHT_MODULE` to its
absolute `playwright/index.mjs` path. `BASE_URL` can target a preview server.
`SCREENSHOT_DIR` optionally writes screenshots into an existing directory.

The marketplace smoke test covers discovery, cart retention across the health
hub, prescription gating, coupon validation, checkout, lab-slot selection,
320/390/768px layouts, mobile removal/pickup pricing, focus restoration, and
reduced motion. The earlier health/insurance smoke suite remains available.

## Next integration steps for production scale

1. **Catalog service:** paginated product/brand/category APIs with availability,
   searchable metadata, authoritative prices, and a managed image pipeline.
2. **Order service:** authenticated carts, server-side price/coupon validation,
   idempotent order creation, inventory reservation, and a persistent order history.
3. **Pharmacy workflow:** secure prescription uploads, licensed review, product
   eligibility, substitutions, and fulfilment state transitions.
4. **Lab scheduling:** provider availability, actual preparation instructions,
   cancellable bookings, and report delivery to the health vault.
5. **Payments and operations:** a payment sandbox, verified webhooks, reconciliation,
   refunds, durable jobs, and delivery-provider events.
6. **Scale checks:** student/tenant ownership enforcement, catalog caching,
   bounded queries, route URLs, observability, and load testing.

The existing [healthcare roadmap](healthcare-development-roadmap.md) covers the
medical-metrics, insurance, and multi-campus integration foundations. This update
is a working frontend demo, not a live pharmacy or insurer integration.
