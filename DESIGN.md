---
name: timetoeat System
description: Mobile-first purchase, stock, recipe, budget, and member operations for branch-based food workflows.
colors:
  app-bg: "#f6f8fb"
  background: "oklch(0.995 0.004 255)"
  foreground: "oklch(0.18 0.025 255)"
  card: "oklch(1 0 0)"
  primary: "oklch(0.42 0.13 232)"
  primary-foreground: "oklch(0.99 0 0)"
  secondary: "oklch(0.96 0.015 245)"
  secondary-foreground: "oklch(0.22 0.035 255)"
  muted: "oklch(0.96 0.012 250)"
  muted-foreground: "oklch(0.46 0.03 255)"
  accent: "oklch(0.95 0.035 170)"
  accent-foreground: "oklch(0.24 0.06 170)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.9 0.018 250)"
  input: "oklch(0.9 0.018 250)"
  ring: "oklch(0.62 0.12 232)"
  chart-purchase: "oklch(0.7 0.16 65)"
  chart-success: "oklch(0.64 0.13 165)"
  chart-primary: "oklch(0.58 0.13 232)"
  chart-danger: "oklch(0.62 0.15 20)"
  chart-variant: "oklch(0.58 0.16 305)"
typography:
  display:
    fontFamily: "Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Noto Sans Thai, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "0"
  body:
    fontFamily: "Noto Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Noto Sans Thai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0"
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
    typography: "{typography.label}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
    typography: "{typography.body}"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.pill}"
    height: "20px"
    padding: "2px 8px"
---

# Design System: timetoeat System

## 1. Overview

**Creative North Star: "The Calm Kitchen Control Desk"**

timetoeat is a restrained product UI for people doing real operational work: recording purchases, checking stock, planning recipes, controlling branch budgets, and managing access. The system should feel like a calm control desk beside the kitchen workflow: clear enough for staff, precise enough for managers, and light enough to use on a phone without thinking about the interface.

The visual language is practical and compact. It uses a cool near-white workspace, white surfaces, a deep muted blue primary action color, and semantic status tints for stock, purchase, warning, budget, and role states. It explicitly rejects the PRODUCT.md anti-references: complex UI, corporate-heavy dashboards, overloaded dashboard decoration, dense admin clutter, excessive color, unnecessary cards, ornamental effects, and interactions that slow down kitchen or purchasing workflows.

**Key Characteristics:**
- Mobile-first operational density with readable Thai text and large enough touch targets.
- Restrained color: one primary blue for action and current selection, semantic tints only when they carry state.
- Familiar product patterns: tables, cards, tabs, modals, bottom navigation, badges, and search fields.
- Flat-by-default surfaces with borders/rings for structure and shadows only for overlays.
- Role-aware clarity: controls should match Owner, Manager, staff, and viewer responsibilities.

## 2. Colors

The palette is a cool operational palette: white and blue-tinted neutrals carry most of the interface, while saturated color is reserved for action, status, chart identity, and alerts.

### Primary
- **Control Blue** (`primary`): The primary action and selected-state color. Use for saving, adding, active navigation, focus emphasis, and important operational controls.
- **White Action Ink** (`primary-foreground`): Text and icons on Control Blue. It must stay high contrast and never be muted.

### Secondary
- **Cool Panel Mist** (`secondary`): A quiet blue-tinted support surface for inactive tabs, secondary chips, and low-emphasis controls.
- **Panel Ink** (`secondary-foreground`): Text on Cool Panel Mist. Use for secondary labels that still need to read clearly.

### Tertiary
- **Mint Readiness** (`accent`): A soft green-teal accent for safe, ready, available, or positive system states.
- **Mint Ink** (`accent-foreground`): Text on Mint Readiness for status labels and subtle success messaging.

### Neutral
- **App Workspace** (`app-bg`): The outer application field. It separates the app shell from content without feeling corporate-heavy.
- **Working White** (`background`, `card`): The main content surface. Use white cards and panels for editable or scannable work areas.
- **Operational Ink** (`foreground`): Primary text. Use for labels, values, titles, and table data.
- **Muted Utility Text** (`muted-foreground`): Secondary text. Keep it readable; do not fade important instructions below this tone.
- **Hairline Border** (`border`, `input`): Structural borders for cards, tables, fields, and separators.
- **Focus Blue** (`ring`): Focus ring and active-control emphasis.

### Named Rules

**The State Color Earns Its Place Rule.** Color must explain a state, category, role, or action. Never add color merely to decorate a dashboard card.

**The Primary Is Rare Rule.** Control Blue should stay uncommon on a screen. Use it for the one next action, not every clickable element.

## 3. Typography

**Display Font:** Noto Sans Thai (with system-ui and sans-serif fallback)
**Body Font:** Noto Sans Thai (with system-ui and sans-serif fallback)
**Label/Mono Font:** Geist Mono only for technical or numeric contexts when needed.

**Character:** The type system is single-family, practical, and calm. Thai labels must feel native to the product rather than squeezed into an English-first UI.

### Hierarchy
- **Display** (700, 24px, 1.2): Rare app-level headings and login emphasis. Avoid oversized marketing-style display type.
- **Headline** (700, 20px, 1.25): Screen titles and major section headers.
- **Title** (600, 16px, 1.375): Card titles, modal titles, table group labels, and important row names.
- **Body** (400, 14px, 1.5): Form help text, descriptions, table secondary data, and operational copy.
- **Label** (500, 14px, 1): Buttons, tabs, form labels, badges, and compact controls.

### Named Rules

**The Thai Readability Rule.** Do not shrink Thai helper text below 12px, and do not use negative letter spacing. Dense screens are acceptable; cramped Thai is not.

**The Product Scale Rule.** Use fixed product UI sizes, not fluid hero type. The interface is a tool, not a landing page.

## 4. Elevation

timetoeat is flat by default. Depth is conveyed through borders, background layers, and subtle rings. Shadows are reserved for popovers, selects, sheets, dialogs, tooltips, and other floating UI that must separate from the work surface.

### Shadow Vocabulary
- **Surface Ring** (`ring: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent)`): Default card boundary. Use instead of decorative drop shadows.
- **Overlay Medium** (`shadow-md` + `ring-1 ring-foreground/10`): Popover and select menus.
- **Overlay High** (`shadow-lg` + `border border-border`): Dialogs and sheets that temporarily own attention.
- **Control Knob** (`shadow-sm`): Small switches or draggable elements only.

### Named Rules

**The Flat-Until-Floating Rule.** If an element sits in the normal page flow, use a border or tonal layer. If it floats above content, use a shadow.

**The No Ghost Cards Rule.** Do not pair decorative wide shadows with thin borders on ordinary cards. It makes the product feel heavier than the work.

## 5. Components

### Buttons

Buttons are compact, familiar, and action-oriented.

- **Shape:** Gently curved rectangle (8px radius); icon buttons use fixed square sizing.
- **Primary:** Control Blue background with White Action Ink, 32px height, medium 14px label.
- **Hover / Focus:** Hover darkens or mixes the background; focus uses a 3px Focus Blue ring at 50% opacity.
- **Secondary / Ghost / Outline:** Use quiet backgrounds or borders for alternatives. Never make secondary actions visually compete with the primary save/add action.
- **Disabled:** 50% opacity, pointer disabled. Disabled labels must remain understandable.

### Chips

Chips and badges are small operational markers, not decorative pills.

- **Style:** 20px height, pill radius, 12px label, 8px horizontal padding.
- **State:** Use secondary badges for neutral metadata; semantic tints for saved/draft/low-stock/ready states.
- **Rule:** A chip should answer "what state is this?" or "which category is this?" If it cannot answer that, remove it.

### Cards / Containers

Cards frame repeated items, metrics, modals, and focused tools.

- **Corner Style:** 8px radius, matching the shared component vocabulary.
- **Background:** Working White on App Workspace, or muted tint for nested data blocks.
- **Shadow Strategy:** Surface Ring at rest; no decorative shadow.
- **Border:** Hairline Border or foreground 10% ring.
- **Internal Padding:** 12px for compact metric cards, 16px for normal cards, 20px for larger desktop panels.

### Inputs / Fields

Fields are compact, searchable, and clear under focus.

- **Style:** 32px height, 8px radius, transparent background, Hairline Border, 10px horizontal padding.
- **Focus:** Border shifts to Focus Blue with 3px ring at 50% opacity.
- **Error / Disabled:** Destructive border and ring for invalid states; disabled fields use input tint and 50% opacity.
- **Search:** Search fields may include a leading icon, but the typed text area must remain wide enough on mobile.

### Navigation

Navigation is role-aware and mobile-first.

- **Desktop:** Sidebar or structured app shell with current item highlighted by tint and icon color.
- **Mobile:** Bottom navigation with icon + short Thai label. Active item uses a soft selected background and the same icon vocabulary as desktop.
- **Header:** Sticky top header with current module icon, product label, page title, alert shortcut, logout, and branch selector.

### Tables

Tables are the preferred desktop representation for purchase summaries, inventory, and budget management.

- **Rows:** 40px header height, 8px cell padding, border-bottom row separation, hover muted background.
- **Mobile:** Preserve table behavior only when comparison matters; otherwise use compact rows/cards with the same data order and affordances.
- **Numeric Alignment:** Currency and quantities align right when shown in columns.

### Dialogs, Sheets, and Popovers

Overlays are focused work surfaces.

- **Dialog:** Centered, max width around 512px, 8px radius, border, Overlay High shadow, 16px content rhythm.
- **Sheet:** Edge-attached panel with 200ms transition and directional movement.
- **Popover / Select:** 8px radius, 10px padding, Overlay Medium shadow and ring.
- **Backdrop:** Black at 10-20% with a small blur. Keep it functional, not glassy.

## 6. Do's and Don'ts

### Do:
- **Do** keep the interface simple, professional, and easy to use; this is the brand personality from PRODUCT.md.
- **Do** make budget and stock consequences visible at the moment of action.
- **Do** use Control Blue for primary actions and current selection.
- **Do** use semantic tints for warning, low stock, ready, saved, draft, and role states.
- **Do** keep mobile purchase and stock workflows touch-friendly and compact.
- **Do** use existing shadcn/Base UI primitives and lucide icons before inventing controls.
- **Do** prefer tables for desktop comparison and compact rows for mobile scanning.

### Don't:
- **Don't** make the UI feel complex, corporate-heavy, or overloaded with dashboard decoration.
- **Don't** create dense admin clutter, excessive color, unnecessary cards, ornamental effects, or interactions that slow down kitchen or purchasing workflows.
- **Don't** use marketing-page tropes: oversized hero type, decorative gradients, glass panels, or repeated icon-card grids.
- **Don't** use color as decoration. If it does not communicate state, action, role, or category, remove it.
- **Don't** hide important Owner/Manager controls behind ambiguous icons without tooltips or labels.
- **Don't** let mobile text overflow buttons, table cells, or cards; Thai labels must wrap or resize cleanly.
- **Don't** make ordinary cards float with large shadows. Use borders and tonal layers first.
