# DESIGN.md — Product Hub

> A dark, premium command center for luxury resellers — confident, spacious, and built to handle complex supplier and product workflows without clutter.

---

## 1. Visual Theme & Atmosphere

### Mood

Product Hub is the tool luxury resellers trust when precision matters. The interface is dark by default — not to be trendy, but because it signals focus and reduces distraction for users managing high-stakes product data. Every surface is intentional: generous whitespace keeps complex data readable, while bold typographic moments and sharp indigo accents give the tool an edge that matches the high-ticket products users source and manage. The overall feeling is premium SaaS meets luxury editorial — think Linear's density discipline crossed with the typographic confidence of a fashion trade publication.

### Design Philosophy

- **Whitespace is structural, not decorative** — spacing creates hierarchy; don't fill it
- **Bold moments earn their place** — use weight and color to direct attention, not decorate
- **Dark surfaces, light information** — high-contrast text on deep charcoal, never reversed
- **Data should breathe** — tables, cards, and lists need room to scan at a glance
- **Consistency within Polaris** — push the palette and typography; respect the component system

### Inspiration References

- **Linear**: Take the dark premium surface hierarchy, precise spacing, and typographic discipline. Their approach to information density in dark mode is the baseline.
- **Vercel Dashboard**: Take the high-contrast minimal approach — black/white clarity, confident use of negative space, and restrained accent use.
- **SSENSE / Net-a-Porter**: Take the editorial typographic weight and luxury spacing conventions — headings that command attention.
- **Shopify Polaris (dark-accented)**: Component and interaction patterns stay Polaris-native; palette and type push beyond defaults.

---

## 2. Color Palette & Roles

### Primary Palette — Dark Mode (Default)

| Name           | Hex       | Role                                                |
| -------------- | --------- | --------------------------------------------------- |
| Indigo         | `#7B68EE` | Primary action, CTAs, key highlights, active states |
| Indigo Deep    | `#6855E0` | Hover states on primary elements                    |
| Obsidian       | `#0C0D10` | Page background                                     |
| Slate          | `#14161B` | Card and panel surface                              |
| Slate Elevated | `#1C1F26` | Elevated panels, dropdowns, modals                  |
| Divider        | `#272B35` | Borders, row separators, dividers                   |

### Primary Palette — Light Mode

| Name           | Hex       | Role                                      |
| -------------- | --------- | ----------------------------------------- |
| Indigo         | `#5B4FD4` | Primary action, CTAs, key highlights      |
| Indigo Light   | `#7B68EE` | Hover states on primary elements          |
| Cloud          | `#F6F7FA` | Page background                           |
| White          | `#FFFFFF` | Card and panel surface                    |
| White Elevated | `#FFFFFF` | Elevated panels (distinguished by shadow) |
| Divider        | `#E1E5EE` | Borders, row separators, dividers         |

### Semantic Colors

| Name    | Hex       | Role                                     |
| ------- | --------- | ---------------------------------------- |
| Success | `#22C55E` | Positive states, synced, active supplier |
| Warning | `#F59E0B` | Needs attention, incomplete product data |
| Error   | `#EF4444` | Destructive actions, sync failures       |
| Info    | `#60A5FA` | Neutral information, tooltips, hints     |

### Text Colors — Dark Mode

| Name           | Hex       | Role                                     |
| -------------- | --------- | ---------------------------------------- |
| Primary text   | `#F0F1F5` | Body copy, headings                      |
| Secondary text | `#8E95A6` | Labels, captions, metadata               |
| Muted text     | `#525A6A` | Placeholders, disabled states            |
| Inverse text   | `#0C0D10` | Text on indigo/light colored backgrounds |

### Text Colors — Light Mode

| Name           | Hex       | Role                            |
| -------------- | --------- | ------------------------------- |
| Primary text   | `#0C0D10` | Body copy, headings             |
| Secondary text | `#4A5264` | Labels, captions, metadata      |
| Muted text     | `#8E95A6` | Placeholders, disabled states   |
| Inverse text   | `#F0F1F5` | Text on indigo/dark backgrounds |

### Usage Rules

- Never use Indigo (`#7B68EE`) as a large background surface — reserve it for buttons, badges, and accent marks only
- Indigo on dark surfaces (`#14161B`) achieves ~4.8:1 contrast — always verify before use on text smaller than 16px
- Semantic colors (success/warning/error) should always appear with an icon or label — never color alone to convey meaning
- In dark mode, use `Divider (#272B35)` for separation before reaching for shadows — shadows are for elevation, not delineation
- Light mode backgrounds use shadow to distinguish elevation; dark mode uses progressive surface lightening (`#0C0D10` → `#14161B` → `#1C1F26`)

---

## 3. Typography Rules

### Font Families

| Role               | Family         | Weights       | Fallback              |
| ------------------ | -------------- | ------------- | --------------------- |
| Display / Headings | Space Grotesk  | 500, 600, 700 | system-ui, sans-serif |
| Body / UI          | Inter          | 400, 500      | system-ui, sans-serif |
| Monospace / Code   | JetBrains Mono | 400           | Consolas, monospace   |

> Both Space Grotesk and Inter are available on Google Fonts. JetBrains Mono is open source (SIL OFL license).

### Type Scale

| Token        | Size | Line Height | Weight | Usage                                        |
| ------------ | ---- | ----------- | ------ | -------------------------------------------- |
| `display-xl` | 36px | 1.1         | 700    | Hero headings, empty states, onboarding      |
| `display-lg` | 28px | 1.2         | 700    | Page titles (Dashboard, Suppliers, Products) |
| `display-md` | 22px | 1.3         | 600    | Section headings, card group titles          |
| `display-sm` | 18px | 1.4         | 600    | Card headings, subsection titles             |
| `body-lg`    | 16px | 1.6         | 400    | Primary body text, descriptions              |
| `body-md`    | 14px | 1.5         | 400    | Standard UI text, table cells                |
| `body-sm`    | 13px | 1.5         | 400    | Secondary text, captions, helper text        |
| `label`      | 12px | 1.4         | 500    | Form labels, column headers, tags, metadata  |
| `mono`       | 13px | 1.5         | 400    | SKUs, product IDs, supplier codes, prices    |

### Typography Rules

- Space Grotesk at 700 weight is the "bold moment" — use it for page titles and key stat callouts; never dilute it with overuse
- Body text is always Inter — Space Grotesk is only for headings and display sizes (`display-sm` and above)
- Headings never exceed 2 lines; truncate with ellipsis at overflow
- Supplier names, product titles, and SKUs should follow their own hierarchy: product name in `display-sm`, SKU in `mono`
- Numeric data (prices, quantities, percentages) always renders in `mono` for alignment in tables
- Letter-spacing: headings at 700 weight get `-0.02em` tracking; table column headers get `+0.04em` uppercase tracking

---

## 4. Component Stylings

### Buttons

```
Primary (Dark Mode):
  background: #7B68EE
  color: #0C0D10
  border-radius: 8px
  padding: 10px 20px
  font: Inter 500 14px
  hover: background #6855E0, transform scale(1.01)
  active: background #5B4FD4
  disabled: opacity 0.35, cursor not-allowed

Primary (Light Mode):
  background: #5B4FD4
  color: #FFFFFF
  hover: background #4A3FC0

Secondary:
  background: transparent
  color: #8E95A6 (dark) / #4A5264 (light)
  border: 1px solid #272B35 (dark) / #E1E5EE (light)
  border-radius: 8px
  padding: 10px 20px
  hover: background #14161B (dark) / #F6F7FA (light), color #F0F1F5 (dark) / #0C0D10 (light)

Destructive:
  background: #EF4444
  color: #FFFFFF
  border-radius: 8px
  padding: 10px 20px
  hover: background #DC2626

Ghost / Link:
  background: none
  color: #7B68EE (dark) / #5B4FD4 (light)
  hover: background rgba(123,104,238,0.08)
  border-radius: 6px
```

### Cards & Panels

```
Surface (Dark Mode):
  background: #14161B
  border: 1px solid #272B35
  border-radius: 12px
  padding: 24px
  box-shadow: none

Surface (Light Mode):
  background: #FFFFFF
  border: 1px solid #E1E5EE
  border-radius: 12px
  padding: 24px
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)

Interactive card (hover):
  border-color: #7B68EE (dark) / #5B4FD4 (light)
  box-shadow: 0 0 0 1px #7B68EE (dark) / 0 0 0 1px #5B4FD4 (light)
  transition: all 150ms ease

Selected / active card:
  border-color: #7B68EE
  background: rgba(123,104,238,0.06) (dark) / rgba(91,79,212,0.05) (light)

Stat / metric card (dashboard):
  padding: 28px 24px
  heading: Space Grotesk 700 28px
  label below: Inter 500 12px uppercase tracking-wide color #8E95A6
```

### Form Inputs

```
Default (Dark Mode):
  background: #0C0D10
  border: 1px solid #272B35
  border-radius: 8px
  padding: 10px 14px
  color: #F0F1F5
  placeholder-color: #525A6A
  font: Inter 400 14px

Default (Light Mode):
  background: #FFFFFF
  border: 1px solid #E1E5EE
  color: #0C0D10
  placeholder-color: #8E95A6

Focus:
  border-color: #7B68EE
  box-shadow: 0 0 0 3px rgba(123,104,238,0.20)
  outline: none

Error:
  border-color: #EF4444
  box-shadow: 0 0 0 3px rgba(239,68,68,0.15)

Disabled:
  background: #14161B (dark) / #F6F7FA (light)
  opacity: 0.6
  cursor: not-allowed

Select / Dropdown:
  Same as text input
  chevron-color: #8E95A6

Textarea:
  min-height: 120px
  resize: vertical
  line-height: 1.6
```

### Navigation (In-App Tabs)

```
Since the app embeds inside Shopify Admin (which provides primary navigation),
in-app navigation uses horizontal tabs or a secondary sidebar.

Tab bar (top of content area):
  background: #14161B (dark) / #FFFFFF (light)
  border-bottom: 1px solid #272B35 (dark) / #E1E5EE (light)
  padding: 0 24px

Tab item (default):
  color: #8E95A6
  padding: 14px 16px
  font: Inter 400 14px
  border-bottom: 2px solid transparent

Tab item (hover):
  color: #F0F1F5 (dark) / #0C0D10 (light)
  background: rgba(255,255,255,0.04) (dark) / rgba(0,0,0,0.03) (light)

Tab item (active):
  color: #7B68EE (dark) / #5B4FD4 (light)
  border-bottom: 2px solid #7B68EE (dark) / #5B4FD4 (light)
  font-weight: 500
```

### Tables & Data Lists

```
Header row:
  background: #0C0D10 (dark) / #F6F7FA (light)
  color: #8E95A6
  font: Inter 500 12px
  text-transform: uppercase
  letter-spacing: 0.04em
  border-bottom: 1px solid #272B35 (dark) / #E1E5EE (light)

Body row:
  background: #14161B (dark) / #FFFFFF (light)
  border-bottom: 1px solid #272B35 (dark) / #E1E5EE (light)
  hover: background #1C1F26 (dark) / #F6F7FA (light)
  transition: background 100ms ease

Selected row:
  background: rgba(123,104,238,0.08) (dark) / rgba(91,79,212,0.06) (light)
  border-left: 2px solid #7B68EE

Cell padding: 14px 16px
Cell font: Inter 400 14px
Cell color: #F0F1F5 (dark) / #0C0D10 (light)

Supplier name cell: Inter 500 14px
SKU / ID cell: JetBrains Mono 400 13px, color #8E95A6
Price cell: JetBrains Mono 500 14px
```

### Badges & Status Chips

```
Height: 20px (sm), 24px (md)
Border-radius: 9999px (pill)
Font: Inter 500 12px
Padding: 3px 10px

Active / Success:
  background: rgba(34,197,94,0.12)
  color: #22C55E

Warning / Needs Attention:
  background: rgba(245,158,11,0.12)
  color: #F59E0B

Error / Inactive:
  background: rgba(239,68,68,0.12)
  color: #EF4444

Info / Syncing:
  background: rgba(96,165,250,0.12)
  color: #60A5FA

Neutral / Draft:
  background: rgba(142,149,166,0.12) (dark) / rgba(74,82,100,0.10) (light)
  color: #8E95A6

Verified Supplier:
  background: rgba(123,104,238,0.12)
  color: #7B68EE (dark) / #5B4FD4 (light)
```

### Modals & Dialogs

```
Overlay: rgba(0,0,0,0.65), backdrop-filter: blur(4px)

Container (Dark Mode):
  background: #1C1F26
  border: 1px solid #272B35
  border-radius: 16px
  max-width: 560px
  padding: 32px
  box-shadow: 0 24px 48px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4)

Container (Light Mode):
  background: #FFFFFF
  border: 1px solid #E1E5EE
  border-radius: 16px
  box-shadow: 0 24px 48px rgba(0,0,0,0.14), 0 8px 16px rgba(0,0,0,0.08)

Modal header:
  font: Space Grotesk 600 18px
  color: #F0F1F5 (dark) / #0C0D10 (light)
  margin-bottom: 16px

Modal footer:
  display: flex
  justify-content: flex-end
  gap: 12px
  margin-top: 32px
  padding-top: 24px
  border-top: 1px solid #272B35 (dark) / #E1E5EE (light)
```

---

## 5. Layout Principles

### Spacing Scale

| Token      | Value | Usage                                           |
| ---------- | ----- | ----------------------------------------------- |
| `space-1`  | 4px   | Tight gaps, icon-to-text padding, badge padding |
| `space-2`  | 8px   | Inner component padding, compact list gaps      |
| `space-3`  | 12px  | Related element gaps, inline spacing            |
| `space-4`  | 16px  | Standard component padding, form field gaps     |
| `space-5`  | 20px  | Section internal gaps, button padding           |
| `space-6`  | 24px  | Card padding, group separators                  |
| `space-8`  | 32px  | Major section spacing, modal padding            |
| `space-10` | 40px  | Page section separation                         |
| `space-12` | 48px  | Hero / large section gaps, dashboard stat rows  |

### Grid & Layout

```
Embedded content area: 100% width within Shopify Admin iframe
Page content max-width: 1200px (centered when viewport exceeds this)
Content padding: 32px horizontal, 32px vertical top
Column grid: 12-column, 20px gap

Dashboard stat row: 4-column (3-column at md breakpoint)
Supplier CRM layout: full-width table with 320px detail drawer
Product edit layout: 8-column form + 4-column metadata sidebar
```

### Whitespace Philosophy

- Let data breathe: minimum 24px between distinct content groups on the dashboard
- Table rows need vertical rhythm — 14px cell padding top and bottom is the minimum
- Never stack two cards without at least 16px gap; prefer 24px between card groups
- Empty states get generous vertical centering with 80px minimum vertical padding

---

## 6. Depth & Elevation

### Shadow Scale

| Level         | Value                                                     | Usage                                        |
| ------------- | --------------------------------------------------------- | -------------------------------------------- |
| `shadow-none` | none                                                      | Flat elements, table rows, inline components |
| `shadow-sm`   | `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)`    | Cards in light mode, subtle lift             |
| `shadow-md`   | `0 4px 8px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)`  | Floating panels, select dropdowns            |
| `shadow-lg`   | `0 12px 24px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.3)` | Modals, popovers, command palette            |
| `shadow-xl`   | `0 24px 48px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4)` | Critical dialogs, full-screen overlays       |

### Surface Hierarchy

```
Level 0 — Page background (dark):    #0C0D10
Level 0 — Page background (light):   #F6F7FA
Level 1 — Card / panel (dark):       #14161B
Level 1 — Card / panel (light):      #FFFFFF + shadow-sm
Level 2 — Elevated card (dark):      #1C1F26
Level 2 — Elevated card (light):     #FFFFFF + shadow-md
Level 3 — Popover / dropdown (dark): #1C1F26 + border #272B35 + shadow-md
Level 3 — Popover / dropdown (light):#FFFFFF + shadow-md
Level 4 — Modal (dark):              #1C1F26 + shadow-xl
Level 4 — Modal (light):             #FFFFFF + shadow-xl
```

### Border Usage

- In **dark mode**: use borders (`#272B35`) as the primary separation mechanism — shadows are nearly invisible on dark surfaces and should only be used for true elevation (dropdowns, modals)
- In **light mode**: use shadows for elevation (cards, panels) and borders for flat delineation (table rows, form fields)
- Never use both a border AND a shadow on the same surface unless it is an interactive element in its focused state

---

## 7. Do's and Don'ts

### Do

- Use `Space Grotesk 700` for page titles and key metric callouts — let the bold weight do the heavy lifting
- Apply the indigo accent (`#7B68EE`) to exactly one primary action per view; it should always point to the most important next step
- Use `mono` font for all SKUs, IDs, prices, and quantities so columns align visually in tables
- Keep the dashboard stat cards to 4 per row maximum — more than 4 becomes noise, not signal
- Use status badges consistently across supplier CRM and product lists so users build pattern recognition

### Don't

- Don't use Indigo as a background for large panels or sections — it breaks contrast and dilutes the accent's meaning
- Don't add decorative borders or dividers between items that are already separated by spacing — pick one separation method
- Don't mix Space Grotesk into body copy or small labels — below `display-sm` (18px), always use Inter
- Don't use more than 2 semantic colors on the same screen without a clear legend — color overload erodes trust
- Don't use generic gray buttons when a clear primary or secondary button hierarchy can be established — ambiguous CTAs stall workflow

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width       | Behavior                                                           |
| ---- | ----------- | ------------------------------------------------------------------ |
| `xs` | < 480px     | Single column, full-width components, tab bar scrolls horizontally |
| `sm` | 480–768px   | 2-column stat grid, table collapses to card list                   |
| `md` | 768–1024px  | 3-column stat grid, sidebar drawers become bottom sheets           |
| `lg` | 1024–1280px | Standard layout — 12 column grid active                            |
| `xl` | > 1280px    | Max-width 1200px container, centered in content area               |

> Note: This app embeds inside Shopify Admin. The Admin iframe controls the outer layout. Design for `lg` and `xl` as the primary viewport; `md` and below for smaller Admin windows or future standalone views.

### Touch Targets

- Minimum tap target: 44×44px on any interactive element
- Table row actions (edit, delete) must have at least 40px height; prefer 44px
- Icon-only buttons require a visible tooltip on hover and sufficient tap area on touch

### Collapsing Strategy

- Dashboard stat row: 4-col → 2-col at `md` → 1-col at `xs`
- Supplier CRM detail drawer: side-by-side at `lg+` → full panel overlay at `md` and below
- Product edit sidebar: 4-col metadata sidebar collapses into an accordion section at `md`
- Navigation tabs: scroll horizontally if tabs exceed available width — never wrap to two rows

---

## 9. Agent Prompt Guide

### Quick Color Reference

```
Dark Mode:
  Primary:     #7B68EE — main CTAs, active states, highlights
  Background:  #0C0D10 — page surface
  Surface:     #14161B — cards, panels
  Elevated:    #1C1F26 — modals, dropdowns
  Border:      #272B35 — dividers, outlines
  Text:        #F0F1F5 — primary / #8E95A6 — secondary / #525A6A — muted
  Success:     #22C55E  Warning: #F59E0B  Error: #EF4444  Info: #60A5FA

Light Mode:
  Primary:     #5B4FD4 — main CTAs, active states
  Background:  #F6F7FA — page surface
  Surface:     #FFFFFF — cards, panels
  Border:      #E1E5EE — dividers, outlines
  Text:        #0C0D10 — primary / #4A5264 — secondary / #8E95A6 — muted
```

### Typography Quick Reference

```
Heading font: Space Grotesk, weights 500/600/700
Body font:    Inter, weights 400/500
Mono font:    JetBrains Mono, weight 400
Scale:        [label: 12px/500] [sm: 13px] [base: 14px] [lg: 16px] [xl: 18px/600] [2xl: 22px/600] [3xl: 28px/700] [4xl: 36px/700]
```

### Ready-to-Use Agent Prompts

**Building a new page:**

> "Follow DESIGN.md. Page background #0C0D10, cards use #14161B surface with 1px #272B35 border and 12px border-radius. Page title in Space Grotesk 700 28px color #F0F1F5. Body text Inter 400 14px. Section headings Space Grotesk 600 22px. Page padding 32px. Use spacing tokens from DESIGN.md section 5."

**Building the dashboard:**

> "Dashboard per DESIGN.md. Stat cards: #14161B background, 12px radius, 28px padding, metric in Space Grotesk 700 28px #F0F1F5, label in Inter 500 12px uppercase #8E95A6. 4-column grid at desktop, 20px gap. Quick action buttons use primary #7B68EE. Status badges per DESIGN.md section 4 badge specs."

**Building a data table:**

> "Table per DESIGN.md section 4. Header: #0C0D10 bg, Inter 500 12px uppercase 0.04em tracking color #8E95A6. Body rows: #14161B bg, #272B35 bottom border, hover #1C1F26. Cell padding 14px 16px, Inter 400 14px #F0F1F5. SKUs and IDs in JetBrains Mono 13px #8E95A6. Selected row: rgba(123,104,238,0.08) bg with 2px left border #7B68EE."

**Building a form / edit page:**

> "Form inputs per DESIGN.md section 4: #0C0D10 background, 1px #272B35 border, 8px radius, Inter 400 14px #F0F1F5, placeholder #525A6A. Focus: border #7B68EE, box-shadow 0 0 0 3px rgba(123,104,238,0.20). Labels: Inter 500 12px #8E95A6. Field gaps 16px. Section headings Space Grotesk 600 18px. Primary submit button: #7B68EE bg, #0C0D10 text, 8px radius, 10px 20px padding."

**Building a modal:**

> "Modal per DESIGN.md section 4. Overlay: rgba(0,0,0,0.65) with backdrop-filter blur(4px). Container: #1C1F26 bg, 1px #272B35 border, 16px radius, 32px padding, shadow 0 24px 48px rgba(0,0,0,0.6). Header: Space Grotesk 600 18px #F0F1F5. Footer: flex row justify-end, 12px gap, 24px top padding, 1px #272B35 top border."

**Building supplier CRM cards:**

> "Supplier card per DESIGN.md. Surface #14161B, 1px #272B35 border, 12px radius, 24px padding. Supplier name: Inter 500 14px #F0F1F5. Status badge: pill shape per badge specs in DESIGN.md section 4. Metadata (location, SKU count): Inter 400 13px #8E95A6. On hover: border-color #7B68EE, transition 150ms ease."
