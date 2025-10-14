# Financial Dashboard Design Guidelines - Awentia Bilanci

## Design Approach
**Design System**: Custom Financial Dashboard System inspired by modern SaaS applications (Linear, Stripe, Notion)
- **Rationale**: Information-dense financial application requiring clarity, precision, and professional credibility
- **Core Principle**: Data clarity over visual flair - every design element serves functional purpose

## Color Palette

### Primary Colors (Dark Mode Ready)
- **Primary Brand**: 250 75% 58% (Indigo #6366f1)
- **Primary Dark**: 243 75% 59% (Deep Indigo #4f46e5)
- **Background Light**: 210 20% 98% (#f8f9fa)
- **Background Dark**: 222 47% 11%

### Semantic Colors
- **Success/Positive**: 142 76% 36% (Green #10b981)
- **Danger/Negative**: 0 84% 60% (Red #ef4444)
- **Warning**: 45 93% 47% (Amber #f59e0b)
- **Info**: 217 91% 60% (Blue #3b82f6)

### Neutral Scale
- **Text Primary**: 0 0% 10% (#1a1a1a)
- **Text Secondary**: 220 9% 46% (#6b7280)
- **Border Light**: 220 13% 91% (#e5e7eb)
- **Surface**: 0 0% 100% (White)

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
- **Fixed sidebar** (280px) with gradient background (Primary → Primary Dark)
- Logo section with company name and emoji icon
- Navigation items with icons (emoji/Font Awesome), hover states with rgba(255,255,255,0.1)
- Active state: rgba(255,255,255,0.15) background + 3px white left border
- Sticky on desktop, collapsible on mobile

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
- Chart.js with custom color scheme matching brand
- Tooltips with financial formatting (€ symbol, thousand separators)

### Page Headers
- **Gradient background**: linear-gradient(135deg, Primary 0%, #8b5cf6 100%)
- Rounded-xl, white text, p-8
- H1 title + descriptive subtitle
- Shadow with brand color tint
- Full-width within content area

### Info Boxes
- Light blue background (#eff6ff), blue border (#bfdbfe)
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