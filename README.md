# Westhaven Marina Dashboard

A modern marina operations dashboard for berth occupancy, customer insights, marina map views, and vessel compliance monitoring. The app is designed for internal management reporting and is optimized for desktop and mobile use.

## Features

- Dashboard overview with KPI cards for active berths, occupied, booked, available, and occupancy percentage
- Occupancy trend analysis by date, month, or year
- Pier occupancy breakdown with a vertical portrait chart layout for easier reading of pier names
- Berth type analysis using a pie chart with berth-type legend labels
- Ownership occupancy breakdown by ownership type
- Berth length analysis and size-fit reporting
- Management summary cards highlighting live operational status
- Data quality monitoring and validation summaries
- Future availability and future bookings/rentals filtering
- Marina map and berth map views for visual berth placement and berth-letter references
- Customer heat map with location-based customer clustering and origin visibility
- Customer age report page for age-band analysis and CSV export
- Vessel compliance report with expiry checks for insurance, EWOF, and TNT
- Filter panel for marina, pier, berth type, ownership type, occupancy status, and berth size
- Full-page responsive layout for desktop, tablet, and mobile devices
- CSV export support for reports and filtered data sets
- Detail panel for berth-level inspection and customer/vessel context

## Included Pages

- Dashboard
- Future Availability
- Future Bookings
- Marina Map
- Customer Heat Map
- Customer Age Report
- Berths
- Ownership
- Reports
- Data Quality
- Vessel Compliance

## Technology Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS
- Recharts
- Leaflet + react-leaflet
- SheetJS (xlsx)
- CSS utility helpers and data-processing utilities

## Required Dependencies and Plugin

This project uses the Vite React plugin in [vite.config.js](vite.config.js), which is required for the app to build and run correctly.

The dependency is already included in [package.json](package.json):

- @vitejs/plugin-react
- vite

When you clone or pull this project from GitHub onto a new machine, you must install dependencies before running it:

```bash
npm install
```

If a fresh install is missing the plugin, you can install it explicitly:

```bash
npm install @vitejs/plugin-react
```

> This is not a VS Code-only plugin. It is a project dependency required by Vite, so it must be present in the repository environment after a fresh clone or pull.

## Prerequisites

- Node.js 18+
- npm

## Excel Data Source

The app reads the marina workbook from the public folder. The current workbook is expected in:

- public/OccupancyReport.xlsx

The file is loaded by the Excel service and parsed into berth/customer/vessel records. If you replace the workbook with a new file, the app should refresh with the updated data after reload.

## Running the App

### Development mode

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```text
WH_Dashboard-main/
+-- public/
¦   +-- OccupancyReport.xlsx
¦   +-- marina-map-image.png
+-- src/
¦   +-- components/
¦   +-- pages/
¦   +-- services/
¦   +-- types/
¦   +-- utils/
¦   +-- App.tsx
¦   +-- index.css
¦   +-- main.tsx
¦   +-- leaflet.d.ts
+-- index.html
+-- package.json
+-- postcss.config.js
+-- tailwind.config.js
+-- tsconfig.json
+-- tsconfig.node.json
+-- vite.config.js
+-- README.md
+-- dist/
```

## Data Features

- Excel parsing and row normalization for berth, customer, and vessel data
- Date parsing and null-safe handling
- Data quality checks for missing values and invalid date ranges
- Occupancy calculations for active berths, bookings, rentals, and availability
- Customer DOB parsing for age analysis and reporting
- Customer location data preparation for geographic mapping
- Compliance logic for insurance/EWOF/TNT expiry management

## GitHub / Re-pull Notes

If this project is pushed to GitHub and then pulled into another environment, do the following on the new machine:

```bash
npm install
npm run dev
```

This ensures all project dependencies, including the Vite React plugin, are installed correctly and no local-only dependency is missing.

## Troubleshooting

### App does not start after GitHub pull

- Run `npm install`
- Confirm `@vitejs/plugin-react` exists in package.json
- Verify Node.js is installed and compatible
- Clear cached dependencies if needed:

```bash
rm -rf node_modules
npm install
```

### Excel file not loaded

- Confirm the file exists in the public folder
- Check the workbook name matches the expected filename
- Open the browser console for the source error if parsing fails

## License

Internal project documentation for Westhaven Marina operations.

## Notes

This dashboard was built as a practical marina management UI and includes operational reporting, visual berth mapping, customer analytics, and vessel compliance tracking.
