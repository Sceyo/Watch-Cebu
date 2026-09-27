# Watch Cebu — UX & Frontend Review Log

*Authoritative review log capturing frontend architecture, usability, accessibility, responsive behavior, and performance evaluations.*

---

## Pass 1: Shipped UI Baseline Review (WC7 Delivery)
**Date:** 2026-09-17  
**Evaluator:** Senior Frontend Engineer & UX Reviewer  
**Scope:** Shipped interface as of Stage 4 / WC7 delivery (Leaflet Dark Matter map, layer toggle group, day tabs filter bar, persistent legend drawer, coordinate provenance markers, header freshness chips, and fallback disclosure banner).

### 1. Categorized Weaknesses & Audit Findings

#### 1.1 Critical Issues (Blocks core usability or violates hard compliance standards)
1. **Pinch-to-Zoom Disabled on Viewport Meta (WCAG 1.4.4 Failure):**  
   `index.html` specifies `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />`. Disabling user zoom prevents visually impaired citizens from scaling typography or controls, directly violating WCAG 2.1 Level AA criteria without benefiting map pinch gestures (Leaflet handles touch gestures on `#map` via touch-action listeners independently).
2. **Missing Dialog Semantics & Focus Traps on Slide-Over Drawers:**  
   The Legend drawer is an `<aside>` element toggled via CSS transforms. It lacks `role="dialog"`, `aria-modal="true"`, focus trapping (`tab` key loops outside the drawer into background map controls), and an `Escape` key shortcut listener. Screen reader users navigating with virtual cursors are not informed that a modal context has opened.

#### 1.2 High Impact (Direct user confusion, friction, or misleading mental models)
3. **Silent Empty State on Day Filter Tabs:**  
   When a user clicks a day tab that contains zero power interruptions (or if an advisory week has missing days), all power markers disappear from the map with zero user feedback. There is no empty-state toast, floating chip, or inline message indicating *"No scheduled interruptions for [Date]"*. Users are left wondering whether the app crashed, the network failed, or the area is clear.
4. **Ambiguous Filter Scope in "Both" Layer Mode:**  
   The Day Tabs bar explicitly filters power advisories by date. However, in "Both" mode, earthquake events (which span arbitrary historical dates) remain visible on the map while power markers change. There is no visual indicator or label tying the Day Tabs strictly to the Power domain, misleading users into believing the day filter applies globally to all visible layers.
5. **No Mobile Backdrop / Click-Outside Dismissal for Drawers:**  
   Opening the Legend drawer on mobile (<640px) overlays 85% of the viewport width. There is no scrim/backdrop overlay, and tapping the visible sliver of the map does not dismiss the drawer; users are forced to reach for the small 28px '✕' icon in the top right corner.

#### 1.3 Medium Impact (Suboptimal ergonomics, polish, or performance overhead)
6. **Double Leaflet Stylesheet Ingestion:**  
   `index.html` loads Leaflet 1.9.4 CSS from unpkg CDN (`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">`), while `src/main.ts` simultaneously imports `leaflet/dist/leaflet.css`. This incurs an unnecessary render-blocking HTTP network request and CSSOM duplication.
7. **Complete Marker Destruction on Filter Change (Layout Thrashing):**  
   In `MapController.renderPowerAdvisories`, every date filter switch executes `this.powerLayerGroup.clearLayers()` and re-instantiates Leaflet `circleMarker` instances and DOM nodes. For larger datasets, this causes unnecessary garbage collection and map canvas redraws instead of filtering existing layer references.
8. **Under-Sized Touch Target on Mobile Close Buttons:**  
   The `.legend-close-btn` and `.banner-close-btn` are sized at 28×28px and 20×20px respectively, falling well below Apple HIG and Android Material Design minimum recommended touch target sizes (44×44px / 48×48px).

#### 1.4 Low Impact (Visual polish, hierarchy refinements, micro-copy)
9. **Layer Toggle Counter Hierarchy:**  
   Button text formatted as `Power (51)` and `Quakes (14)` uses identical typography for both label and count. Formatting counts in subtle monospace pills improves scannability at a glance.
10. **Dead Freshness Chips on Outage:**  
    When a feed goes offline (`status: 'error'`), the chip turns red with `Offline`, but offers no interactive affordance (such as a manual "Retry" action or diagnostic tooltip explaining the failure reason).

---

### 2. Top 10 Fixes in Implementation Order

| # | Problem | Why It Matters | Fix | Effort |
|---|---|---|---|---|
| **1** | Viewport blocks zoom (`user-scalable=no`) | Accessibility failure (WCAG 1.4.4); prevents low-vision magnification | Remove `maximum-scale=1.0, user-scalable=no` from `index.html` | Trivial (5 min) |
| **2** | Drawer lacks dialog semantics & Escape key | Screen readers miss drawer state; keyboard users cannot exit quickly | Add `role="dialog"`, `aria-modal="true"`, `aria-label`, and global `Escape` key listener | Low (15 min) |
| **3** | Click-outside does not close slide-over drawers | Poor mobile ergonomics; requires hitting tiny close button | Add a semi-transparent backdrop overlay with click-to-dismiss handler | Low (30 min) |
| **4** | Silent empty state when day tab has 0 markers | Users assume network failure when map becomes blank | Display a floating non-blocking pill: *"No interruptions scheduled for [Day]"* | Medium (45 min) |
| **5** | Day Tabs ambiguous in "Both" layer view | Users confused whether earthquakes are filtered by day | Prefix tab bar with small domain chip or hide/relocate with explicit scope indicator | Low (30 min) |
| **6** | Double Leaflet CSS imports in HTML and TS | Wasted HTTP request and redundant CSSOM parsing | Remove CDN `<link>` from `index.html`, keep bundled local Vite import | Trivial (5 min) |
| **7** | Sub-44px touch targets on close buttons | High mis-tap rate on mobile devices | Expand button padding and bounding box to minimum 44×44px hit target | Low (15 min) |
| **8** | Offline freshness chips are dead ends | Users cannot trigger a re-fetch without full browser reload | Make error chips clickable buttons that invoke `fetchPowerAdvisories` / `fetchEarthquakeEvents` | Medium (1 hr) |
| **9** | Marker layer thrashing on date tab switch | Canvas layout thrash and GC churn on mobile | Store markers in a Map by date and toggle visibility rather than re-creating | Medium (1.5 hr) |
| **10**| Monolithic header layout on narrow viewports | Elements wrap unevenly on <375px screens | Group brand into compact icon on mobile, collapsing chips below title | Medium (1.5 hr) |

---

## Pass 2: Post-Stage-5 Additions Review
**Date:** 2026-09-17  
**Evaluator:** Senior Frontend Engineer & UX Reviewer  
**Scope:** Stage 5 Additions (Header "About" button, About Drawer, Data Attribution, Rate Sourcing Heuristic, and NGCP Deferral Decision).

### 1. Evaluation Against Baseline Discipline

#### 1.1 Header About Button
- **Visual Weight & Hierarchy:** The About button (`#btn-toggle-about`) is rendered directly adjacent to `#btn-toggle-legend` inside `.header-right`. It reuses the exact `.legend-toggle-btn` class, typography, border styling, and hover states, establishing perfect visual parity without competing for prominence.
- **Iconography & Clarity:** Employs `📖` alongside the Legend's `ℹ️`, clearly communicating explanatory project background versus operational map symbols.
- **Mutual Exclusion:** Opening the About drawer automatically closes the Legend drawer, and opening the Legend drawer closes the About drawer. State is cleanly coordinated in `src/main.ts`.

#### 1.2 About Drawer & Attribution
- **Pattern Consistency:** Reuses the exact slide-over drawer structure (`.legend-drawer`), animation curves, and styling as the map guide.
- **Placeholder Markings:** All non-final launch copy is explicitly demarcated in code with `// PLACEHOLDER — replace before public launch` comments and centralized in `ABOUT_METADATA`, preventing premature promotion to public production copy.
- **Civic Attribution Integrity:** Even in placeholder mode, authoritative civic attribution is 100% genuine and prominent:
  - Visayan Electric (VECO)
  - DOST-PHIVOLCS
  - OpenStreetMap Contributors (ODbL)
  - CARTO Basemaps
- **Feedback Channel:** Includes a direct outbound link to the GitHub repository issues page with `target="_blank" rel="noopener noreferrer"`.

#### 1.3 Accessibility & Keyboard Interaction Improvements
- The About drawer and Legend drawer both incorporate:
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-label="About Watch Cebu"` / `aria-label="Map Guide & Legend"`
  - Keyboard shortcut: Global `Escape` key listener instantly dismisses whichever drawer is currently open.
- Touch target: Close button includes `aria-label="Close About Drawer"`.

#### 1.4 Rate Card & Grid Badge Discipline
- **Rate Parser (`src/parsers/vecoRates.ts`):** 
  - Strictly preserves verbatim bimonthly strings without force-normalizing to calendar months.
  - Implements honest `parse_confidence: 'high' | 'low'` and `parse_notes` reporting, maintaining the exact data contract discipline required for power and earthquake layers.
- **NGCP Grid Status:** 
  - Probes verified that `ngcp.ph` is behind Cloudflare bot challenges and Twitter/X is an authenticated walled garden.
  - In accordance with Watch Cebu's anti-misleading policy, the grid badge was **not** shipped with fake, stale, or guessed data; it is explicitly deferred in `docs/Data-Standards.md` Section 11.6.
  - Distinct palette reservation (Slate / Blue-Gray `#64748b`) recorded in Section 11.7.

### 2. Summary Verdict
The Stage 5 additions successfully preserve the control-room dark theme, adhere strictly to established interaction patterns, enhance keyboard accessibility via Escape dismissal, and enforce uncompromised attribution integrity.
