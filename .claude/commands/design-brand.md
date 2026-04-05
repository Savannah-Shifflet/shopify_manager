---
description: Run a guided brand interview and generate a DESIGN.md design system for the project
argument-hint: [output-filename]
---

# Design Brand: Generate DESIGN.md Design System

## Overview

Run a structured brand design interview with the user, research design trends for the application category, then generate a comprehensive `DESIGN.md` file following the Stitch DESIGN.md format. The output is a plain-text design system document that AI agents read to generate consistent, on-brand UI.

## Output File

Write the DESIGN.md to: `$ARGUMENTS` (default: `DESIGN.md`)

---

## Phase 1: Brand Interview

Ask the following questions **one at a time**, waiting for the user's response before asking the next. Do not ask multiple questions in one message.

Work through this question list in order, skipping any that have already been answered in the conversation:

1. **App name & tagline**: What is the name of the application? Do you have a tagline or one-sentence description of what it does?

2. **Audience & context**: Who are the primary users, and where do they spend most of their time in the app? (e.g., reviewing data, managing products, doing outreach)

3. **Mood & atmosphere**: Pick 3–5 adjectives that describe how the app should *feel*. (e.g., sleek, minimal, powerful, trustworthy, bold, warm, clinical, energetic)

4. **Visual references**: Are there any apps, websites, or brands whose visual style you admire and want to draw inspiration from? (Can be inside or outside your industry)

5. **Color direction**: Do you have any color preferences or colors to avoid? Any existing brand colors (logo, website) to stay consistent with?

6. **Typography feel**: Do you prefer a modern sans-serif feel (clean, minimal), a humanist feel (approachable, warm), or something more editorial/distinctive?

7. **Density & information**: Should the UI feel spacious and airy, or dense and information-rich? Think about how much data users will scan at once.

8. **Dark mode**: Should the app support dark mode, light mode only, or both?

9. **Key screens**: What are the 2–3 most important screens or views in the app? (These will anchor the design system examples)

10. **Constraints**: Are there any hard technical or brand constraints? (e.g., must use Polaris component library, must embed in Shopify Admin, must match a parent brand)

---

## Phase 2: Research

After completing the interview, use the WebSearch tool to research:

1. Design trends for this category of application (SaaS dashboard, e-commerce tool, B2B platform, etc.)
2. Color palette trends for the mood adjectives the user provided
3. Typography pairings that match the desired feel
4. Any design references the user named — identify their specific design characteristics (colors, type, spacing)

Synthesize the research findings into concrete design decisions that align with the user's answers.

---

## Phase 3: Generate DESIGN.md

Generate the DESIGN.md file using the Stitch DESIGN.md format. Every section is required. Be specific — use exact hex codes, pixel values, font names, and named examples. Vague guidance produces inconsistent UI.

---

## DESIGN.md Structure

```markdown
# DESIGN.md — [App Name]

> [One-sentence design philosophy for this app]

---

## 1. Visual Theme & Atmosphere

### Mood
[3–5 sentences describing the overall feeling, density, and design philosophy. What emotional response should users have? What does the UI say about the product?]

### Design Philosophy
- [Principle 1 — e.g., "Information density over decoration"]
- [Principle 2]
- [Principle 3]

### Inspiration References
- [Reference 1]: [What specifically to take from it]
- [Reference 2]: [What specifically to take from it]

---

## 2. Color Palette & Roles

### Primary Palette

| Name | Hex | Role |
|---|---|---|
| [Name] | `#XXXXXX` | Primary action, CTAs, key highlights |
| [Name] | `#XXXXXX` | Secondary actions, hover states |
| [Name] | `#XXXXXX` | Backgrounds, page surface |
| [Name] | `#XXXXXX` | Card/panel surface |
| [Name] | `#XXXXXX` | Border, divider |

### Semantic Colors

| Name | Hex | Role |
|---|---|---|
| Success | `#XXXXXX` | Positive states, confirmations |
| Warning | `#XXXXXX` | Caution, needs attention |
| Error | `#XXXXXX` | Destructive actions, failures |
| Info | `#XXXXXX` | Neutral information, tooltips |

### Text Colors

| Name | Hex | Role |
|---|---|---|
| Primary text | `#XXXXXX` | Body copy, headings |
| Secondary text | `#XXXXXX` | Labels, captions, metadata |
| Muted text | `#XXXXXX` | Placeholders, disabled states |
| Inverse text | `#XXXXXX` | Text on dark/colored backgrounds |

### Usage Rules
- [Rule 1 — e.g., "Never use primary color as a background on large surfaces"]
- [Rule 2]
- [Rule 3]

---

## 3. Typography Rules

### Font Families

| Role | Family | Weights | Fallback |
|---|---|---|---|
| Display / Headings | [Font] | 600, 700 | system-ui, sans-serif |
| Body / UI | [Font] | 400, 500 | system-ui, sans-serif |
| Monospace / Code | [Font] | 400 | Consolas, monospace |

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 36px | 1.1 | 700 | Hero headings, empty states |
| `display-lg` | 28px | 1.2 | 700 | Page titles |
| `display-md` | 22px | 1.3 | 600 | Section headings |
| `display-sm` | 18px | 1.4 | 600 | Card headings, subsections |
| `body-lg` | 16px | 1.6 | 400 | Primary body text |
| `body-md` | 14px | 1.5 | 400 | Standard UI text |
| `body-sm` | 13px | 1.5 | 400 | Secondary text, captions |
| `label` | 12px | 1.4 | 500 | Form labels, tags, metadata |
| `mono` | 13px | 1.5 | 400 | Code, SKUs, IDs |

### Typography Rules
- [Rule 1 — e.g., "Headings never exceed 2 lines; truncate with ellipsis"]
- [Rule 2]
- [Rule 3]

---

## 4. Component Stylings

### Buttons

```
Primary:
  background: [hex]
  color: [hex]
  border-radius: [Xpx]
  padding: [X Y]
  font: [weight size]
  hover: background [hex], scale(1.01)
  active: background [hex]
  disabled: opacity 0.4, cursor not-allowed

Secondary:
  background: transparent
  color: [hex]
  border: 1px solid [hex]
  hover: background [hex]

Destructive:
  background: [hex]
  color: [hex]
  hover: background [hex]

Ghost/Link:
  background: none
  color: [hex]
  hover: background [hex] at low opacity
```

### Cards & Panels

```
Surface:
  background: [hex]
  border: 1px solid [hex]
  border-radius: [Xpx]
  padding: [X]
  box-shadow: [value]

Interactive card (hover):
  border-color: [hex]
  box-shadow: [value]
  transition: 150ms ease

Selected/active card:
  border-color: [primary hex]
  background: [tinted hex]
```

### Form Inputs

```
Default:
  background: [hex]
  border: 1px solid [hex]
  border-radius: [Xpx]
  padding: [X Y]
  color: [hex]
  placeholder-color: [hex]

Focus:
  border-color: [primary hex]
  box-shadow: 0 0 0 3px [primary at 20% opacity]
  outline: none

Error:
  border-color: [error hex]
  box-shadow: 0 0 0 3px [error at 15% opacity]

Disabled:
  background: [hex]
  opacity: 0.6
  cursor: not-allowed
```

### Navigation

```
Sidebar / Top Nav:
  background: [hex]
  border: [side] 1px solid [hex]
  width: [Xpx] (sidebar) | height: [Xpx] (top nav)

Nav item (default):
  color: [hex]
  padding: [X Y]
  border-radius: [Xpx]

Nav item (hover):
  background: [hex]
  color: [hex]

Nav item (active):
  background: [hex]
  color: [primary hex]
  font-weight: 500
```

### Tables & Data Lists

```
Header row:
  background: [hex]
  color: [hex]
  font: 12px / 500
  text-transform: uppercase
  letter-spacing: 0.04em

Body row:
  background: [hex]
  border-bottom: 1px solid [hex]
  hover: background [hex]

Selected row:
  background: [tinted primary]

Cell padding: [X Y]
```

### Badges & Status Chips

```
Default sizes: height 20px (sm), 24px (md)
Border-radius: 9999px (pill)

[Status name]:
  background: [hex]
  color: [hex]
  [Define for: success, warning, error, info, neutral, + any domain-specific statuses]
```

### Modals & Dialogs

```
Overlay: rgba(0,0,0,0.5), backdrop-filter blur 4px
Container:
  background: [hex]
  border-radius: [Xpx]
  border: 1px solid [hex]
  max-width: [Xpx]
  padding: [X]
  box-shadow: [value]
```

---

## 5. Layout Principles

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight gaps, icon padding |
| `space-2` | 8px | Inner component padding |
| `space-3` | 12px | Related element gaps |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Section internal gaps |
| `space-6` | 24px | Card padding, section breaks |
| `space-8` | 32px | Major section spacing |
| `space-10` | 40px | Page section separation |
| `space-12` | 48px | Hero / large section gaps |

### Grid & Layout

```
Page max-width: [Xpx]
Content area: [Xpx] (with [X]px sidebar)
Column grid: 12-column, [X]px gap
Page padding: [X]px horizontal

Sidebar width: [Xpx] (collapsed: [Xpx])
Top bar height: [Xpx]
```

### Whitespace Philosophy
- [Rule 1 — e.g., "Err toward more whitespace; information should breathe"]
- [Rule 2]

---

## 6. Depth & Elevation

### Shadow Scale

| Level | Value | Usage |
|---|---|---|
| `shadow-none` | none | Flat elements, table rows |
| `shadow-sm` | [value] | Cards, inputs on focus |
| `shadow-md` | [value] | Floating panels, dropdowns |
| `shadow-lg` | [value] | Modals, popovers |
| `shadow-xl` | [value] | Toasts, command palettes |

### Surface Hierarchy

```
Level 0 — Page background:    [hex]
Level 1 — Card / panel:       [hex]
Level 2 — Elevated card:      [hex]
Level 3 — Popover / dropdown: [hex]
Level 4 — Modal:              [hex]
```

### Border Usage
- [When to use borders vs. shadows vs. background contrast to define separation]

---

## 7. Do's and Don'ts

### Do
- [Specific positive guidance with example]
- [Specific positive guidance with example]
- [Specific positive guidance with example]
- [Specific positive guidance with example]
- [Specific positive guidance with example]

### Don't
- [Specific anti-pattern with example of what breaks the system]
- [Specific anti-pattern]
- [Specific anti-pattern]
- [Specific anti-pattern]
- [Specific anti-pattern]

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Behavior |
|---|---|---|
| `xs` | < 480px | Single column, full-width components |
| `sm` | 480–768px | 2-column where needed |
| `md` | 768–1024px | Sidebar collapses to icons |
| `lg` | 1024–1280px | Standard desktop layout |
| `xl` | > 1280px | Max-width container, centered |

### Touch Targets
- Minimum tap target: 44×44px on mobile
- [Other mobile-specific rules]

### Collapsing Strategy
- [What collapses or stacks at each breakpoint]
- [Navigation behavior on mobile]

---

## 9. Agent Prompt Guide

### Quick Color Reference
```
Primary:     [hex] — main CTAs, active states
Background:  [hex] — page surface
Surface:     [hex] — cards, panels
Border:      [hex] — dividers, outlines
Text:        [hex] — primary / [hex] — secondary
Success:     [hex]  Warning: [hex]  Error: [hex]
```

### Typography Quick Reference
```
Heading font: [Family], [weights]
Body font:    [Family], [weights]
Scale:        [sm: 13px] [base: 14px] [lg: 16px] [xl: 18px] [2xl: 22px] [3xl: 28px]
```

### Ready-to-Use Agent Prompts

**Building a new page:**
> "Follow DESIGN.md. Use [background hex] as page background, [surface hex] for cards with [border-radius]px radius and [border hex] borders. Headings in [heading font] [weight], body in [body font] 400. Spacing tokens from the scale in DESIGN.md section 5."

**Building a data table:**
> "Table following DESIGN.md section 4. Header: [header bg], 12px uppercase 500-weight labels. Rows: [row bg], [border hex] dividers, [hover bg] on hover. Cell padding [value]."

**Building a form:**
> "Form inputs per DESIGN.md section 4: [input bg] background, [border hex] border, [radius]px radius. Focus ring: [primary hex] at 20% opacity, 3px spread. Labels: [label hex], 12px, 500 weight."

**Building a modal:**
> "Modal per DESIGN.md section 4: [overlay], [modal bg] container, [radius]px radius, [shadow-lg value] shadow, [padding]px padding."
```

---

## Instructions

### Interview Phase
- Ask questions one at a time from the Phase 1 list
- Accept answers that are vague and translate them into design decisions
- If the user references a specific brand or site, look it up to understand the actual design characteristics
- Only move to Phase 2 once all 10 questions are answered (or the user says to proceed)

### Research Phase
- Search for "[app category] dashboard UI design 2025"
- Search for "[mood adjectives] SaaS design color palette"
- Search for any visual references the user named
- Look for specific hex codes, font choices, and spacing patterns from real examples

### Generation Phase
- Fill every section completely — no placeholder text, no "TBD"
- All hex codes must be real, tested color values that form a coherent palette
- Typography choices must be from Google Fonts or system fonts (available without licensing fees by default)
- Component specs must include all interactive states (hover, focus, active, disabled, error)
- The Agent Prompt Guide must be immediately usable — copy-paste prompts that work

### Quality Checks
- ✅ Every section in the DESIGN.md structure is present and complete
- ✅ All hex codes are valid 6-digit hex values
- ✅ Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI components)
- ✅ Typography scale covers all needed sizes
- ✅ All component states defined (default, hover, focus, active, disabled, error)
- ✅ Agent prompt guide uses the exact hex/font values from the palette
- ✅ Design feels coherent — palette, type, and component choices all tell the same story

## Output Confirmation

After writing the DESIGN.md:
1. Confirm the file path
2. Summarize the design direction in 2–3 sentences
3. List the primary color palette with hex codes
4. Suggest next steps (e.g., run `/create-rules` to bake it into CLAUDE.md, share with a designer for review)
