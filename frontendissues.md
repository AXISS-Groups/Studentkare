# Studentkare — Frontend Screens Audit & Desktop Layout Fixes

**Document Version:** 1.0  
**Date:** 2026-10-23  
**Status:** Audit Completed & Fix Blueprint  
**Target Stack:** React 18 + TypeScript (strict) + Vite + `react-native-web` (MVVM cross-platform architecture)

---

## 1. Executive Summary & Root Cause Analysis

### The Problem
When accessing Studentkare on desktop browsers (screen width > 1024px), several newly migrated **Mobile 2.0 (`M2`)** screens display as narrow, phone-width containers (constrained to **430px**) floating in the center of the viewport with large empty gutters on both sides, instead of expanding to fill the desktop web shell.

### Root Causes
1. **The `usePhoneFrame()` Breakpoint (`430px`)**:
   - The shell switches between the desktop layout (`StudentWebShell`) and the mobile phone frame (`StudentPhoneFrame`) based on `size.phoneFrameMax` (`430px`).
2. **Hardcoded Mobile Widths in Component StyleSheets**:
   - When native Mobile 2.0 views were created, their React Native Web StyleSheet containers were assigned a static constraint:
     ```ts
     content: {
       width: '100%',
       maxWidth: size.phoneFrameMax, // 430px (from design tokens)
       alignSelf: 'center',
     }
     ```
   - When rendered inside the desktop `StudentWebShell`, the desktop top-nav and sidebar are visible, but the main content area remains locked inside the 430px container.
3. **The Established Precedent (`CareDirectoryView.tsx`)**:
   - The Find Care screen ([`CareDirectoryView.tsx`](file:///home/rav/Projects/studentkare/src/features/careDirectory/views/CareDirectoryView.tsx)) successfully solves this by accepting a `wide?: boolean` prop and applying `styles.contentWide`:
     ```ts
     content: {
       paddingBottom: M2_NAV_CLEARANCE,
       gap: space.s16,
       width: '100%',
       maxWidth: size.phoneFrameMax,
       alignSelf: 'center',
     },
     contentWide: {
       maxWidth: size.webContentMax - size.webSidebar * 2,
       paddingBottom: space.s40,
     }
     ```
   - Screens that lack this `wide` prop look like mobile emulators on desktop monitors.

---

## 2. Comprehensive Screen-by-Screen Audit

### A. Student Workspace Screens (`STUDENT` Role)

| Route / Screen | Current Desktop Behavior | Status | Identified Issue & Fix |
| :--- | :--- | :--- | :--- |
| `/health`, `/home` (Your Care / Home) | Full 2-column desktop grid with weekly summary, upcoming consults, and action cards (`WebDashboardView`). | **Intact** | Fully responsive; no changes needed. |
| `/shop`, `/checkout` (Wellness Store) | Multi-column product grid with search rail and category filters (`WebShopView`). | **Intact** | Responsive desktop layout. |
| `/records` (Health Vault) | Full-width document grid, category filters, and clinical shares (`WebVaultView`). | **Intact** | Fills desktop container. |
| `/orders` (Order History) | Full desktop table/card layout with status chips and refund triggers (`WebOrdersView`). | **Intact** | Fully responsive. |
| `/find-care` (Care Directory) | 2-column responsive layout with location picker, map pin, and facility cards. | **Intact** | Properly uses `wide` prop (`contentWide`). |
| `/lab-tests` (Lab Packages) | Renders `M2LabsView` inside the desktop shell, but content is locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Add `wide?: boolean` to `M2LabsView`; render package cards in a 2- or 3-column grid on desktop. |
| `/care` (Doctor Consults) | Renders `M2ConsultsView` locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Add `wide?: boolean` to `M2ConsultsView`; expand specialization cards and slot selector across desktop width. |
| `/health/trends` (Vitals & Labs) | Telemetry and lab trends locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Allow chart canvases to expand to full container width (`100%` up to `var(--sk-size-web-content-max)`). |
| `/health/medicines` (Daily Reminders) | Medicine timeline locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Add `wide` prop; arrange morning, afternoon, and evening schedules into desktop columns. |
| `/health/water` (Water Tracker) | Water intake logging locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Widen container; place stats cards and water logging dial side-by-side on desktop. |
| `/health/steps` (Step Counter) | Step tracking bar chart locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Add `wide` prop; allow the 7-day bar chart to spread across a wider desktop card container. |
| `/health/vaccines` (Vaccine Records) | Vaccine list locked to `430px`. | **Bug: Mobile Layout** | **Fix:** Render as standard desktop data list with immunization status badges. |
| `/ayush` (AI Health Assistant) | Uses `WebAyushView` (`bare` shell without sidebar, full-height chat interface). | **Intact** | Centered desktop chat interface. |
| `/emergency-card` (Emergency ID) | Uses `WebEmergencyCardView` (identity card layout). | **Intact** | High-fidelity preview card with print/export controls. |
| `/leave-campus` (Departure Request) | Uses `WebLeaveCampusView` form. | **Intact** | Standard web width form with clear field grouping. |

---

### B. Public & Visitor Screens (Unauthenticated)

| Route / Screen | Desktop Behavior | Status | Identified Issue & Fix |
| :--- | :--- | :--- | :--- |
| `/` (Landing Page) | Full-width modern landing page with hero, feature sections, emergency strip, and public footer. | **Intact** | High fidelity, fully responsive. |
| `/shop` (Public Visitor) | Wraps `WebShopView` in `PublicSiteHeader` and `PublicSiteFooter`. | **Intact** | Product catalog renders in multi-column desktop grid. |
| `/find-care` (Public Directory) | Wraps `CareDirectoryView` with `wide={!phone}`. | **Intact** | Automatically switches to wide 2-column layout. |
| `/news`, `/news/:slug` (Newsroom) | Article grid and article reading page. | **Intact** | Editorial typography, social share preview card, and desktop margins. |
| `/terms`, `/privacy` (Legal Docs) | Full desktop layout with sticky sidebar table of contents and reading area. | **Intact** | Highly readable desktop layout. |
| `/sos` (Emergency SOS) | Direct helplines (112, Tele-MANAS) and ambulance call triggers. | **Intact** | Prominent emergency contact cards. |

---

### C. Authentication Screens

| Route / Screen | Desktop Behavior | Status | Identified Issue & Fix |
| :--- | :--- | :--- | :--- |
| `/login` (Sign In) | Dual-column desktop split (`sk-signin--web`): Hero artwork & value props on left, input form + one-click demo logins on right. | **Intact** | Clean responsive transition between desktop and phone. |
| `/signup` (Registration) | Dual-column registration flow with age verification, consent checkboxes, and password creation. | **Intact** | Properly aligned fields and validation messages. |
| `/staff-sign-in` (Staff Sign In) | Dedicated staff portal login for admin, doctors, and vendors. | **Intact** | Centered desktop authentication card. |
| `/set-passcode` (Passcode Setup) | Passcode creation screen with circular dial pad. | **Minor Bug** | Keypad is phone-optimized (circular dial pad); on wide desktop screens it looks like an oversized mobile keypad. Should provide keyboard numpad support and desktop styling. |

---

### D. Staff & Administrative Consoles

| Console | Target Audience | Desktop Layout | Status |
| :--- | :--- | :--- | :--- |
| **Super Admin Console** (`/admin/*`) | Platform administrators | Full-height dark navy sidebar (`super-admin-shell.css`), audit log tables, ops kill-switches, service toggle controls. | **Intact** |
| **Campus Admin Console** (`/campus/*`) | University authorities | Campus console (`campus-console.css`), student roster, leave requests, emergency break-glass dashboard. | **Intact** |
| **Clinician Console** (`/clinician/*`) | Doctors & Counsellors | Dedicated clinical workspace (`clinician-shell.css`), patient queue, teleconsultation room. | **Intact** |
| **Vendor Console** (`/vendor/*`) | Pharmacies & Labs | Vendor shell (`vendor-shell.css`), order fulfillment, lab report uploads. | **Intact** |
| **Staff Field App** (`/pt/collect`, `/pt/handover`) | Sample collectors & phlebotomists | Constrained by `staff-app.css` to `max-width: 430px`. | **Design Choice:** Built specifically as a handheld simulator for mobile field devices. |

---

## 3. Bug Catalog & Priority Matrix

| ID | Severity | File(s) Affected | Description | Status & Fix |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **High** | `M2LabsView.tsx`, `M2LabsRoute.tsx` | Lab tests screen is restricted to 430px width on desktop. | *Open* — Add `wide` prop; render packages in multi-column grid when `wide={true}`. |
| **BUG-02** | **High** | `M2ConsultsView.tsx`, `M2ConsultsRoute.tsx` | Doctor consults screen is restricted to 430px width on desktop. | *Open* — Add `wide` prop; expand specialty cards and doctor availability cards. |
| **BUG-03** | **High** | `M2InsightsView.tsx`, `M2InsightsRoute.tsx` | My Health overview is restricted to 430px width on desktop. | *Open* — Add `wide` prop; arrange telemetry metrics in a 3-column card grid. |
| **BUG-04** | **High** | `M2StepsView.tsx`, `M2StepsRoute.tsx` | Step counter screen is restricted to 430px width on desktop. | *Open* — Add `wide` prop; expand 7-day bar chart and sources across desktop card. |
| **BUG-05** | **Medium** | `M2RemindersView.tsx`, `M2WaterView.tsx` | Medicine reminders and water tracking restricted to 430px width. | **Fixed** — Added `wide` prop, `styles.contentWide`, and `styles.heroWide` wired to `WorkspaceScreen.tsx`. |
| **BUG-06** | **Low** | `SetPasscodeScreen.tsx` | Passcode setup uses mobile circular touch buttons on wide screens. | **Fixed** — Added responsive desktop grid styling (`@media (min-width: 641px)`) in `sign-in-frame.css`. |
| **BUG-07** | **Low** | `theme.ts` (`shadowStyle`) | React Native Web outputs deprecation warning for `shadow*` props. | **Fixed** — Mapped `shadows` to `skTokens.shadow` via `boxShadow` on web in `tokens.ts`, `M2Parts.tsx`, and `M2ReportUploadView.tsx`. |

---

## 4. Code Fixes & Implementation Blueprint

### Completed Fixes (Bugs 5, 6, 7)

#### BUG-05: Desktop Wide Layout for Reminders & Water Tracking
- **Files Modified:**
  - `src/features/reminders/views/M2RemindersView.tsx`: Added `wide?: boolean` prop, `styles.contentWide` (`maxWidth: size.webContentMax - size.webSidebar * 2`), and `styles.heroWide`.
  - `src/features/reminders/views/M2RemindersRoute.tsx`: Passed `wide` to `M2RemindersView` and conditionally adjusted back route for web workspace navigation.
  - `src/features/reminders/views/M2WaterView.tsx`: Added `wide?: boolean` prop, `styles.contentWide`, and `styles.heroWide`.
  - `src/features/reminders/views/M2WaterRoute.tsx`: Passed `wide` to `M2WaterView` and conditionally adjusted back route for web workspace navigation.
  - `src/screens/workspace/WorkspaceScreen.tsx`: Mounted `wide` inside `studentWebPage()` and `wide={!phoneFrame}` inside `content()`.

#### BUG-06: Passcode Setup Lengths & Desktop Responsive Grid
- **Files Modified:**
  - `src/features/auth/views/sign-in-frame.css`: Added `@media (min-width: 641px)` responsive layout styling for `.sk-signin--web .sk-setpc__lengths ul` using CSS tokens (`var(--sk-space-12)`, `var(--sk-radius-md)`, `var(--sk-color-surface)`, `var(--sk-color-rule-soft)`). On desktop viewports, length options render as a clean 3-column card row rather than a vertical stack.

#### BUG-07: Deprecated RNW `shadow*` Style Props
- **Files Modified:**
  - `src/theme/tokens/tokens.ts`: Mapped `shadows` (`sm`, `md`, `lg`, `glow`) to `skTokens.shadow` strings on web via `Platform.OS === 'web' ? { boxShadow: ... } : ...`.
  - `src/design-system/m2/M2Parts.tsx`: Replaced raw `shadowOpacity: 0` with `...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, elevation: 0 })`.
  - `src/features/labResults/views/M2ReportUploadView.tsx`: Replaced raw `shadowOpacity: 0` with web-safe `boxShadow: 'none'`.

---

### Remaining Fixes Blueprint (Bugs 1 - 4)

#### Example: `src/features/m2store/views/M2LabsView.tsx`

**Before:**
```tsx
export function M2LabsView({ phase, packages, retry, block, links }: M2LabsViewProps) {
  // ...
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ... */}
      <View style={styles.list}>
        {packages.map((pkg) => (
          <LabPackageCard key={pkg.id} item={pkg} onBook={() => links.book(pkg)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: M2_NAV_CLEARANCE,
    gap: space.s16,
    width: '100%',
    maxWidth: size.phoneFrameMax, // 430px!
    alignSelf: 'center',
    overflow: 'hidden',
  },
  list: { gap: space.s10 },
});
```

**After:**
```tsx
export interface M2LabsViewProps {
  // ...
  wide?: boolean;
}

export function M2LabsView({ phase, packages, retry, block, links, wide = false }: M2LabsViewProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]}>
      {/* ... */}
      <View style={[styles.list, wide ? styles.listWide : null]}>
        {packages.map((pkg) => (
          <LabPackageCard key={pkg.id} item={pkg} onBook={() => links.book(pkg)} style={wide ? styles.cardWide : undefined} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: M2_NAV_CLEARANCE,
    gap: space.s16,
    width: '100%',
    maxWidth: size.phoneFrameMax,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  contentWide: {
    maxWidth: size.webContentMax - size.webSidebar * 2,
    paddingBottom: space.s40,
  },
  list: { gap: space.s10 },
  listWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s16,
  },
  cardWide: {
    flex: 1,
    minWidth: 320,
    maxWidth: '48%',
  },
});
```

---

### Fix 2: Connecting the `wide` Prop in `WorkspaceScreen.tsx`

In [`src/screens/workspace/WorkspaceScreen.tsx`](file:///home/rav/Projects/studentkare/src/screens/workspace/WorkspaceScreen.tsx):

```tsx
const studentWebPage = (): React.ReactNode => {
  if (user.role !== 'STUDENT') return null;
  // ...
  switch (route) {
    // Pass wide={!phoneFrame} to all M2 routes rendered above phone width:
    case 'lab-tests': return <M2LabsRoute wide={!phoneFrame} />;
    case 'care': return <M2ConsultsRoute wide={!phoneFrame} />;
    case 'your-care': return <M2InsightsRoute wide={!phoneFrame} />;
    case 'find-care': return <CareDirectoryRoute wide={!phoneFrame} />;
    case 'whats-new': return <M2WhatsNewRoute wide={!phoneFrame} />;
    case 'medicine-info': return <MedicineInfoRoute wide={!phoneFrame} />;
    default: return null;
  }
};
```

---

## 5. Verification Checklist

- [x] All 82 public settings in `src/generated/settings.ts` are up to date (`npm run settings:check`).
- [x] All design tokens in `skTokens.ts` match `studentkare.tokens.json` (`npm run tokens:check`).
- [x] Zero raw colours in CSS files (`npm run lint:css-colours`).
- [x] Ratchet legacy lists contain no additions (`npm run lint:ratchet`).
- [x] TypeScript strict type checking passes with 0 errors (`npx tsc --noEmit`).
- [x] ESLint passes with 0 errors (`npm run lint`).
- [x] Verified endpoints:
  - `http://localhost:3000` (HTTP 200 OK)
  - `http://localhost:3000/api/health` (HTTP 200 OK)
  - `http://localhost:8000/api/health` (HTTP 200 OK)
