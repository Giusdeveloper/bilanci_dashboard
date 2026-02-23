---
name: bilanci-ui-engineer
description: Engineering and styling of the financial dashboard UI. Use when modifying tables with frozen/sticky columns, fixing scrolling overlaps, or standardizing financial data formatting (currency, alignment, opaque backgrounds).
---

# Bilanci UI Engineer

Standards for the React dashboard frontend.

## Table Engineering

### 1. Sticky Columns & Headers
To prevent data bleed-through and ensure a professional scroll experience:
- **Opaque Backgrounds**: EVERY sticky cell must have a solid background color.
  - Header: `bg-slate-100` (Light) / `bg-slate-900` (Dark).
  - Body: `bg-white` (Light) / `bg-[#020617]` (Dark).
- **Z-Index Standards**:
  - `z-50`: Intersection of frozen column and sticky header.
  - `z-30`: Regular sticky headers.
  - `z-20`: Frozen columns in the body.
- **Shadows/Borders**: Use `shadow-[2px_0_0_rgba(0,0,0,0.05)]` or `border-r-2` to visually separate frozen columns.

### 2. Sizing & Layout
- **Auto-Resize**: Use standard table layout (remove `table-fixed`) and `whitespace-nowrap` for all data columns to fit content.
- **Fixed Sticky Offsets**: Frozen columns MUST have fixed widths (e.g., `w-[120px]`) so that subsequent sticky columns can set an accurate `left-[Xpx]`.
- **Text Management**: Use `truncate` or `max-w` only when explicitly requested; default to showing full descriptions.

## Data Formatting
- **Currency**: `it-IT` locale, right-aligned.
- **Dates**: Centered, format `DD/MM/YYYY`.
- **KPI Variance**: Positive growth in revenue is green; positive growth in costs is red.

## Component Reference
- `client/src/components/DataTable.tsx`: Generic data table with custom row styling support.
- `client/src/pages/dashboard.tsx`: Main dashboard layout and KPI logic.
