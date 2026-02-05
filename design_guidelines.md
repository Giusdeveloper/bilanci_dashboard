# Financial Dashboard Design Guidelines - Awentia Bilanci

## Design Approach
**Design System**: Custom Financial Dashboard System inspired by modern SaaS applications (Linear, Stripe, Notion)
- **Rationale**: Information-dense financial application requiring clarity, precision, and professional credibility
- **Core Principle**: Data clarity over visual flair - every design element serves functional purpose

## Color Palette - Imment Financial Dashboard

### Primary Colors (Imment Palette)
- **Primary Brand**: 214 50% 39% (#335C96) - Blu medio vibrante - Usato per elementi principali, bottoni, link
- **Primary Dark**: 210 55% 20% (#17334F) - Blu scuro profondo - Usato per gradienti, sidebar, header
- **Primary Light**: 210 48% 52% (#4A82BF) - Blu medio chiaro - Usato per hover states, accent
- **Background Light**: 210 100% 95% (#e3f0ff) - Blu chiarissimo - Usato per background secondari
- **Background Dark**: 222 47% 11% - Mantenuto per dark mode

### Accent Colors (Imment Palette)
- **Accent Light**: 207 50% 75% (#9cbfe0) - Blu pastello chiaro - Usato per dati storici, elementi secondari
- **Alert/Error**: 325 100% 31% (#9e005c) - Magenta scuro - Usato per valori negativi, alert, errori

### Semantic Colors (Financial Context)
- **Positive/Growth**: 210 48% 52% (#4A82BF) - Blu chiaro Imment - Crescita positiva, trend positivi
- **Negative/Alert**: 325 100% 31% (#9e005c) - Magenta Imment - Valori negativi, perdite, alert
- **Warning**: 45 93% 47% (Amber #f59e0b) - Mantenuto per warning generici
- **Info**: 214 50% 39% (#335C96) - Usa primary brand per info

### Neutral Scale
- **Text Primary**: 210 55% 20% (#17334F) - Blu scuro Imment per testo principale
- **Text Secondary**: 220 9% 46% (#6b7280) - Mantenuto per testo secondario
- **Border Light**: 220 13% 91% (#e5e7eb) - Mantenuto per bordi leggeri
- **Surface**: 0 0% 100% (White) - Mantenuto per card/surface

## Typography
**Font Stack**: 'Inter', system-ui, -apple-system, sans-serif
- **Display/H1**: 32px, 700 weight (Dashboard titles)
- **H2/Section Titles**: 24px, 700 weight
- **H3/Card Titles**: 18px, 700 weight
- **Body**: 15px, 400-500 weight
- **Small/Meta**: 14px, 500 weight
- **KPI Values**: 32-48px, 700-800 weight
- **Table Headers**: 14px, 600 weight

## Layout System
**Tailwind Spacing Primitives**: 2, 4, 6, 8, 12, 16, 20, 24, 32
- **Section Padding**: py-8 md:py-12 lg:py-16
- **Card Padding**: p-6
- **Grid Gaps**: gap-6 (24px standard)
- **Container Max Width**: max-w-7xl
- **Sidebar Width**: 280px (fixed on desktop)

## Component Library

### Navigation & Sidebar
- **Fixed sidebar** (280px) with Imment gradient background (#335C96 → #17334F)
- Logo section with company name and emoji icon
- Navigation items with icons (emoji/Font Awesome), hover states with rgba(255,255,255,0.1)
- Active state: rgba(255,255,255,0.15) background + 3px white left border
- Sticky on desktop, collapsible on mobile
- Shadow: rgba(23, 51, 79, 0.2) per profondità finanziaria

### KPI Cards
- **Grid Layout**: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- White background, rounded-xl (12px)
- Shadow: 0 2px 8px rgba(0,0,0,0.08)
- Hover: translateY(-4px) + shadow-lg
- Content: Label (14px gray), Value (32px bold), Change indicator (14px, colored by positive/negative)
- Icons optional, positioned top-right

### Data Tables
- **Full-width** within container
- Header: Light gray background (#f3f4f6), 2px bottom border
- Rows: 1px border-bottom, hover state (#f9fafb)
- Alternating highlights for totals/subtotals (blue/yellow backgrounds)
- Right-align numerical columns
- Sticky header on scroll for long tables
- Responsive: horizontal scroll on mobile

### Chart Cards
- **Grid**: grid-cols-1 lg:grid-cols-2 for dual charts
- White background, rounded-xl, shadow-sm
- Title: 18px bold, mb-5
- Chart height: 300px (fixed for consistency)
- Chart.js with Imment color scheme:
  - **Ricavi/Dati principali**: #335C96 (Blu medio vibrante)
  - **EBITDA positivo**: #4A82BF (Blu chiaro)
  - **EBITDA negativo/Alert**: #9e005c (Magenta)
  - **Dati storici/Confronti**: #9cbfe0 (Blu pastello)
- Tooltips with financial formatting (€ symbol, thousand separators)

### Page Headers
- **Gradient background**: linear-gradient(135deg, #335C96 0%, #17334F 100%) - Imment palette
- Rounded-xl, white text, p-8
- H1 title + descriptive subtitle
- Shadow: rgba(23, 51, 79, 0.25) per profondità finanziaria
- Full-width within content area

### Info Boxes
- Light blue background (#e3f0ff - Imment Blu chiarissimo), blue border (#9cbfe0 - Imment Blu pastello)
- Text color: #17334F (Imment Blu scuro) per leggibilità finanziaria
- Rounded-xl, p-5
- Icon + bold title + descriptive text
- Used for financial notes/explanations

## Page-Specific Layouts

### Dashboard (Overview)
- KPI grid (4 cards): Ricavi, EBITDA, Risultato, Margine
- Chart section: 2-column grid with trend and comparison charts
- Summary table: full-width economic overview
- Footer with timestamp/data source

### CE Dettaglio & CE Sintetico
- Filter bar at top (date range, comparison toggles)
- Full-width financial tables
- Hierarchical row grouping with indentation
- Expandable/collapsible sections for sub-categories
- Total rows with distinct styling

### CE Mensile Pages
- Month selector navigation (tabs or dropdown)
- Multi-column tables (one column per month)
- Horizontal scroll for >6 months
- Sticky first column (account names)
- Trend sparklines in final column (optional)

### Source Page
- Data import status indicators
- Last updated timestamp
- Table of raw data sources with metadata
- Data quality indicators/warnings if applicable

## Interactions & States
- **Hover**: Subtle lift (translateY(-2px)) on cards
- **Loading**: Skeleton screens with shimmer effect
- **Empty States**: Centered message with icon
- **Error States**: Red border + error message
- **No animations** for data changes (instant updates)
- Smooth transitions (0.2s) for hover/focus states only

## Responsive Behavior
- **Desktop (lg+)**: Sidebar fixed, multi-column layouts
- **Tablet (md)**: Sidebar toggleable, 2-column max
- **Mobile (base)**: Sidebar overlay, single column, horizontal scroll tables

## Accessibility
- High contrast ratios (WCAG AAA for text)
- Semantic HTML (table, nav, main, aside)
- Keyboard navigation for all interactive elements
- ARIA labels for charts and complex data
- Focus indicators (2px ring with brand color)

## Data Visualization Standards
- **Currency**: € symbol, space before number, 2 decimals
- **Percentages**: 1 decimal, % symbol
- **Trend Indicators**: ↑↓ arrows with colors
- **Negative Values**: Parentheses or red color, never both
- **Chart Colors**: Primary palette + semantic colors for categories