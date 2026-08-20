# Westhaven Marina - Occupancy & Berth Dashboard

A production-quality internal web application for Westhaven Marina management, providing a Power BI-style interactive dashboard for berth occupancy analysis.

## Features

- **Real-time KPI Dashboard**: Track total active berths, occupied, booked, available, and occupancy percentage
- **Interactive Charts**: Occupancy trends, pier breakdown, berth type analysis, ownership breakdown, and length analysis
- **Advanced Filtering**: Filter by marina, pier, berth type, ownership type, occupancy status, and berth length
- **Future Availability**: Project berth availability for future dates based on current bookings
- **Monthly Analysis**: View occupancy trends by month with highest/lowest occupancy periods
- **Data Quality Monitoring**: Built-in data quality checks and reporting
- **Export Functionality**: Export filtered data to CSV format
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Professional UI**: Clean, modern interface optimized for management use

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 3
- **Data Processing**: SheetJS (xlsx)
- **Utilities**: clsx, tailwind-merge

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd C:\Users\AdmSRV\WHDashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Excel Data Setup

The application uses an Excel file as its data source. Follow these steps to set up the data:

1. **Place the Excel file** in the `public` directory:
   - File name: `OccupancyReport.xlsx`
   - Location: `public/OccupancyReport.xlsx`

2. **Expected Excel Structure**:
   The Excel file should contain the following columns:
   - BerthID, Berth, Pier, BerthType
   - NominalLength, NominalWidth, NominalDepth
   - ActualLength, ActualWidth, ActualDepth
   - Marina, BerthStatus
   - OwnershipTypeID, OwnershipType
   - OccupancyStatus, OccupiedFlag, AvailableFlag
   - RentalAgreementID, BookingID
   - DateIn, DateOut, BookingEnteredDate
   - CustomerID, CustomerName
   - VesselID, VesselName
   - ServiceStatus, ServiceLineType

3. **Updating the Data**:
   - Simply replace the `public/OccupancyReport.xlsx` file with a new export
   - The application will automatically load the new data on refresh
   - No code changes required

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:3000` (or the next available port).

### Production Build

```bash
npm run build
```

The optimized production build will be created in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Dashboard Navigation

The application includes the following pages:

1. **Dashboard**: Main overview with KPIs, charts, and filters
2. **Future Availability**: Project availability for specific future dates
3. **Monthly Occupancy**: Monthly occupancy analysis and trends
4. **Berths**: Detailed berth listing with search and filtering
5. **Ownership**: Ownership type analysis and breakdown
6. **Reports**: Generate and export various reports
7. **Data Quality**: View data quality metrics and issues

### Using Filters

1. Click "Expand" on the Filters panel to see all available filters
2. Select filter criteria from the dropdowns
3. Active filters appear as removable chips
4. Use "Clear Filters" to remove all current filters
5. Use "Reset Dashboard" to return to the default view

### Exporting Data

1. Navigate to the Berths page or Reports page
2. Apply any desired filters
3. Click "Export CSV" to download the filtered data

### Viewing Berth Details

1. Navigate to the Berths page
2. Click on any row in the table to view detailed information
3. The detail panel shows dimensions, ownership, customer, vessel, and rental information

## Architecture

### Project Structure

```
WHDashboard/
├── public/
│   └── OccupancyReport.xlsx    # Excel data source
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── BerthDetailPanel.tsx
│   │   ├── BerthTable.tsx
│   │   ├── DataQualityIndicator.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── KPICards.tsx
│   │   ├── LengthChart.tsx
│   │   ├── ManagementSummary.tsx
│   │   ├── OccupancyGauge.tsx
│   │   ├── OccupancyTrendChart.tsx
│   │   ├── OwnershipChart.tsx
│   │   ├── PierOccupancyChart.tsx
│   │   ├── BerthTypeChart.tsx
│   │   ├── Sidebar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx
│   │   ├── FutureAvailability.tsx
│   │   ├── MonthlyOccupancy.tsx
│   │   ├── Berths.tsx
│   │   ├── Ownership.tsx
│   │   ├── Reports.tsx
│   │   └── DataQuality.tsx
│   ├── services/               # Business logic
│   │   └── excelService.ts     # Excel data loading
│   ├── utils/                  # Utility functions
│   │   ├── dataUtils.ts        # Data processing
│   │   └── cn.ts               # Class name utility
│   ├── types/                  # TypeScript types
│   │   └── berth.ts            # Data models
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── data/                       # Backup data location
│   └── OccupancyReport.xlsx
├── index.html                  # HTML template
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json               # Project dependencies
```

### Key Components

- **Excel Service**: Handles loading, parsing, and validating Excel data
- **Data Utils**: Provides filtering, calculations, and data transformation functions
- **Filter System**: Centralized state management for dashboard filters
- **Chart Components**: Reusable chart components using Recharts
- **Table Components**: Interactive data tables with sorting and pagination

## Data Quality

The application includes automatic data quality checks:

- **Row Validation**: Ensures all required fields are present
- **Date Validation**: Checks for valid date ranges
- **Null Handling**: Gracefully handles missing or null values
- **Error Recovery**: Continues processing even if individual rows fail

View the Data Quality page to see detailed metrics about your data.

## Business Logic

### Occupancy Calculation

- **Occupied**: Berths with status "Rented"
- **Booked**: Berths with status "Booked"  
- **Available**: Berths with status "Available"
- **Occupancy %**: (Occupied + Booked) / Total Active Berths × 100

### Future Availability

A berth is considered available for a future date if:
- The date falls outside any existing DateIn/DateOut range
- No active rental or booking conflicts exist

## Deployment

### Manual Deployment

1. **Build the production version**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server:
   - Copy the entire `dist` directory to your web server
   - Ensure the server supports single-page applications (SPA routing)
   - Configure the server to redirect all routes to `index.html`

### Environment Variables

The application currently uses the following configuration:

- **Excel File Path**: Configured in `src/services/excelService.ts`
- **API Base URL**: Not required (uses direct file loading)
- **Server Port**: Configured in `vite.config.js` (default: 3000)

## Performance Considerations

- **Data Caching**: Excel data is cached after initial load
- **Memoization**: Expensive calculations are memoized using React hooks
- **Virtual Scrolling**: Tables use pagination for large datasets
- **Lazy Loading**: Components are loaded on-demand

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Excel File Not Loading

1. Ensure the Excel file is in the `public` directory
2. Check that the file name matches exactly: `OccupancyReport.xlsx`
3. Verify the file is not corrupted
4. Check browser console for specific error messages

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

### Styling Issues

1. Ensure Tailwind CSS is properly configured
2. Check that `postcss.config.js` and `tailwind.config.js` are present
3. Verify the build process completed successfully

## Assumptions Made

1. **Excel Column Names**: The application expects specific column names as listed in the data setup section
2. **Date Format**: Dates should be in Excel serial format or standard date strings
3. **Status Values**: OccupancyStatus should be "Available", "Rented", or "Booked"
4. **Active Berths**: Only berths with BerthStatus = "Active" are included in calculations
5. **Single Sheet**: The Excel file should have data in the first sheet

## Data Quality Issues Discovered

Based on the initial Excel file analysis:

- **Total Rows**: 2,015 records loaded
- **Active Berths**: All records appear to be active
- **Data Completeness**: The initial data shows good completeness with no missing critical fields
- **NULL Handling**: The application properly handles "NULL" string values in the Excel file

## Future Enhancements

The application is structured to support future additions:

- Revenue dashboard and metrics
- Customer demographics analysis
- Waiting list management
- Historical occupancy tracking
- Advanced forecasting capabilities
- Utility usage monitoring
- Data import history and versioning

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the Data Quality page for data issues
3. Ensure the Excel file meets the expected format
4. Verify all dependencies are correctly installed

## License

Internal Use Only - Westhaven Marina

## Credits

Developed for Westhaven Marina Management
- Powered by React, Vite, and modern web technologies
- Data visualization by Recharts
- Excel processing by SheetJS