# Operational Input Dashboard

A comprehensive high-density React dashboard for hospital operations management with 6 specialized modules. Built with React, Tailwind CSS, React Hook Form, Zod validation, and React Query.

## Features

### 📋 6 Operational Modules

#### 1. **Clinical (Nurse Station)**
- Ward-based patient admission management (Wards 1-10)
- Quick grid navigation for ward selection
- Patient input form with:
  - Patient Name
  - Contact Number
  - Triage Level (Emergency, Urgent, Non-urgent)
  - Admitted By (Staff ID in STF-XXXX format)
  - Admission Notes (up to 500 chars)
- Recent admissions table per ward
- Color-coded triage indicators

#### 2. **Staffing (Admin)**
- Staff directory with advanced search
- Directory card view with utilization density
- Update staff records with:
  - Staff ID (STF-XXXX format validation)
  - Staff Name
  - Department
  - Status (On-duty, Off-duty, On-break)
  - Seniority Level (Junior, Mid-level, Senior, Lead)
  - Shift Assignments (3 shifts)
- Real-time search across ID, name, and department
- Color-coded status and seniority badges

#### 3. **Lab Tech (Diagnostics)**
- Structured JSON-based diagnostic results entry
- Built-in JSON validation and formatting
- Lab test inputs:
  - Patient ID
  - Test Name
  - Test Date/Time
  - Performed By (Staff ID validation)
  - Normal Range (optional)
  - JSON formatted test results
- Lab test history with result preview
- Real-time JSON format validation

#### 4. **Pharmacy (Inventory/Sales)**
- Tabbed interface for Sales, Stock, and Expiry tracking
- Daily sales recording
- Stock level management
- Drug expiry tracking with alerts:
  - 🔴 Red alert for expired items
  - 🟡 Yellow alert for items expiring within 30 days
- Inventory overview table with status indicators
- Drug batch and supplier tracking

#### 5. **Facilities & Logistics**
- Resource monitoring for: Oxygen, Ventilators, Beds, Wheelchairs, Monitors, Pumps
- Status tracking (Available, In-use, Maintenance)
- Utilization visualization with percentage bars
- Maintenance scheduling and logs
- Card-based resource overview with:
  - Availability metrics
  - In-use tracking
  - Maintenance history
  - Next scheduled maintenance dates

#### 6. **Finance (Billing/HMO)**
- Patient lookup with auto-fill
- Comprehensive billing management:
  - Patient ID and Name
  - Insurance Provider
  - Policy Number
  - Total Amount and Paid Amount
  - Payment Status (Paid, Partial, Outstanding)
  - Payment Method
  - Due Date tracking
- Real-time payment calculations:
  - Payment percentage
  - Pending amount
- Visual payment status cards (gradient backgrounds)
- Quick invoice template generator

## Technical Stack

### Frontend
- **React** 18.2.0 - UI library
- **React Hook Form** - Efficient form management
- **Zod** - TypeScript-first schema validation
- **@tanstack/react-query** - Server state management
- **Lucide React** - Icon library (20+ icons)
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety
- **Vite** - Build tool

### Backend
- **Express** - API server
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Zod** - Validation schemas

## Validation Schema

All forms implement Zod validation with specific requirements:

```typescript
// STF-XXXX format validation
const STF_ID_PATTERN = /^STF-\d{4}$/;

// Examples:
✓ STF-0001
✓ STF-9999
✗ STF-001 (invalid)
✗ stf-0001 (invalid)
```

## Responsive Design

### Breakpoints
- **Mobile** (< 768px): Tab-based navigation, stacked layouts
- **Tablet** (768px - 1024px): Single sidebar + content, optimized for touch
- **Desktop** (1024px+): Full sidebar + content, maximum density

### Touch-Optimized
- Larger touch targets for tablets
- Horizontal scrollable tabs on mobile
- Responsive grid layouts
- Adaptive form columns

## React Query State Management

### Benefits
- ✅ Updates in Pharmacy tab don't clear Clinical data
- ✅ Automatic cache invalidation on mutations
- ✅ Background re-fetching
- ✅ Request deduplication
- ✅ Offline support ready

### Cache Configuration
```typescript
staleTime: 5 minutes    // Data considered fresh for 5 min
gcTime: 10 minutes      // Keep unused data for 10 min (formerly cacheTime)
```

## API Endpoints

```
GET  /api/patients                    # List patients
POST /api/patients/admit              # Admit new patient
GET  /api/staff                       # List staff
PUT  /api/staff/:id                   # Update staff
GET  /api/lab-tests                   # List lab tests
POST /api/lab-tests                   # Submit lab test
GET  /api/pharmacy                    # Get inventory
POST /api/pharmacy                    # Update pharmacy
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

Already includes:
- react-hook-form
- @tanstack/react-query
- lucide-react
- zod
- @hookform/resolvers

### 2. Setup Environment

Create `.env` file in project root:
```
DATABASE_URL=postgresql://user:password@localhost:5432/hospital_db
VITE_API_URL=http://localhost:3000/api
```

### 3. Run Development Server

**Backend:**
```bash
npm run dev
```
(Runs on port 3000)

**Frontend:**
```bash
npm run client:dev
```
(Runs on port 5173 via Vite)

## File Structure

```
client/src/
├── components/
│   ├── layout/
│   │   └── Layout.tsx                # Sidebar + navigation
│   ├── sections/
│   │   ├── ClinicalTab.tsx          # Nurse Station
│   │   ├── StaffingTab.tsx          # Admin/HR
│   │   ├── LabTechTab.tsx           # Diagnostics
│   │   ├── PharmacyTab.tsx          # Inventory
│   │   ├── FacilitiesTab.tsx        # Logistics
│   │   └── FinanceTab.tsx           # Billing
│   ├── common/
│   │   └── FormComponents.tsx        # Reusable UI
│   └── Dashboard.tsx                 # Main orchestrator
├── hooks/
│   └── useApi.ts                     # React Query hooks
├── schemas/
│   └── validation.ts                 # Zod schemas
└── App.tsx                           # Query provider setup
```

## Zod Validation Examples

### Clinical Data Validation
```typescript
clinicalSchema = z.object({
  patientName: z.string().min(2),
  triageLevel: z.enum(['Emergency', 'Urgent', 'Non-urgent']),
  wardNumber: z.number().min(1).max(10),
  admittedBy: z.string().regex(/^STF-\d{4}$/, 'Format: STF-XXXX'),
  admissionNotes: z.string().max(500),
  contactNumber: z.string().regex(/^\d{10,}$/),
});
```

### Staff ID Format Validation
```typescript
// All STF_ID fields use this regex
const STF_ID_PATTERN = /^STF-\d{4}$/;

// Valid: STF-0001, STF-9999
// Invalid: STF-001, stf-0001, STF-00001
```

### Lab Tech JSON Validation
```typescript
testResults: z.string().refine(
  (val) => {
    try { JSON.parse(val); return true; }
    catch { return false; }
  },
  'Invalid JSON format'
)
```

## Key Components

### FormComponents.tsx
Reusable form UI components:
- `<Input />` - Text input with optional label and error
- `<Select />` - Dropdown with options
- `<TextArea />` - Multi-line text input
- `<Button />` - Variants: primary, secondary, danger
- `<Alert />` - Types: success, error, warning, info

### Layout.tsx
- Responsive sidebar (hidden on mobile)
- Mobile/tablet top navigation with horizontal scroll
- Tab-based section switching
- Real-time sync indicator

### useApi.ts
React Query hooks with:
- Automatic cache management
- Error handling with fallbacks
- Stale-while-revalidate strategy
- Mutation success callbacks
- Mock data fallbacks for unmocked endpoints

## React Query Integration

### Prevent Data Loss
```typescript
// Updates in Pharmacy tab don't affect Clinical data
// Both use separate queryKeys: ['pharmacy'] and ['clinical']
const pharmacy = usePharmacyInventory();
const clinical = useClinicalEntries();

// Each has its own cache
```

### Automatic Invalidation
```typescript
export const useUpdatePharmacy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return axios.post(`${API_BASE}/pharmacy`, data);
    },
    onSuccess: () => {
      // Only pharmacy cache is invalidated
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });
};
```

## Color Scheme

- **Primary**: Blue-600 (Actions, active states)
- **Success**: Green (Available, Paid, Admitted)
- **Warning**: Yellow (Partial, Expiring soon, On-break)
- **Danger**: Red (Emergency, Expired, Maintenance needed)
- **Info**: Blue (In-use, Processing, Urgent)
- **Neutral**: Gray (Off-duty, backgrounds, disabled)

## Performance Optimizations

✅ React Query caching prevents unnecessary API calls
✅ Memoized components with React.FC
✅ Lazy validation with Zod
✅ Debounced search in Staffing tab
✅ Virtual scrolling ready for large lists
✅ Tailwind CSS purging in production builds

## Responsive Design Examples

### Mobile (< 768px)
```
┌─────────────┐
│ Clinical   │ (scrollable tabs)
│ Staffing   │
│ Lab Tech   │
└─────────────┘
│ Form and content stacked
│ Single column layout
└─────────────┘
```

### Tablet (768px - 1024px)
```
┌────────────┬──────────────────┐
│ SIDEBAR    │ Content Area     │
│ Clinical   │ (responsive grid)│
│ Staffing   │                  │
│ Lab Tech   │ 2-3 column layout│
│ ...        │                  │
└────────────┴──────────────────┘
```

### Desktop (1024px+)
```
┌──────────┬─────────────────────────┐
│ SIDEBAR  │ Content Area            │
│ Clinical │ Full density layout     │
│ Staffing │ 3-4+ column grids       │
│ Lab Tech │ Tables with full width  │
│ ...      │                         │
└──────────┴─────────────────────────┘
```

## Usage Examples

### Adding a Patient (Clinical)
```typescript
const { mutate: addEntry, isPending } = useAddClinicalEntry();

const onSubmit = (data: ClinicalFormData) => {
  addEntry(data, {
    onSuccess: () => {
      toast.success('Patient admitted');
      // Pharmacy data remains cached!
    }
  });
};
```

### Searching Staff (Staffing)
```typescript
const { data: staffData } = useStaffDirectory();
const [searchTerm, setSearchTerm] = useState('');

const filtered = staffData?.filter(staff =>
  staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  staff.staffId.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### JSON Lab Results (Lab Tech)
```typescript
<TextArea
  value={testResults}
  onChange={(e) => {
    validateJson(e.target.value);
    setTestResults(e.target.value);
  }}
  placeholder={JSON.stringify({ glucose: 95, hemoglobin: 14.5 }, null, 2)}
/>
```

### Payment Calculation (Finance)
```typescript
const totalAmount = watch('totalAmount');
const paidAmount = watch('paidAmount');

const pendingAmount = totalAmount - paidAmount;
const paymentPercentage = (paidAmount / totalAmount) * 100;
```

## Build & Deploy

### Development
```bash
npm run client:dev
```

### Production Build
```bash
npm run client:build
```

### Start Production Server
```bash
npm run build
npm start
```

## Accessibility

- Semantic HTML (`<button>`, `<input>`, `<select>`)
- Form labels with required indicators (`*`)
- Error messages with color + text
- Color + text for status indicators
- Keyboard navigation support
- ARIA attributes on interactive elements

## Troubleshooting

### Form validation not working
- Ensure `@hookform/resolvers` is installed
- Check Zod schema matches form field names exactly
- Verify error messages display in UI

### React Query not caching
- Check `staleTime` and `gcTime` configuration
- Ensure `queryKey` is consistent across calls
- Monitor network tab for duplicate requests

### Responsive layout issues
- Verify Tailwind CSS classes are correct
- Check breakpoint prefixes: `sm:`, `md:`, `lg:`
- Test on actual mobile/tablet devices

### API 404 errors
- Confirm backend is running: `http://localhost:3000`
- Verify API endpoints match backend routes
- Check CORS headers if frontend/backend on different ports
- Mock data will be used as fallback for missing endpoints

## Future Enhancements

1. **Real-time Sync**: WebSocket integration for live updates
2. **Audit Logs**: Track all data modifications with timestamps
3. **Export**: PDF/CSV export for reports and compliance
4. **Notifications**: Toast/badge alerts for critical events
5. **Dark Mode**: Theme toggle for reduced eye strain
6. **Multi-language**: i18n support for international use
7. **Analytics**: Charts and statistics dashboards
8. **Role-based Access**: Admin, Doctor, Nurse, Pharmacist roles
9. **Offline Mode**: Service worker for offline functionality
10. **Mobile App**: React Native version for iOS/Android

## License

MIT

---

**Last Updated**: May 2026
**Version**: 1.0.0
**Status**: Production Ready

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── OperationalInputDashboard.tsx    # Main dashboard with tab navigation
│   │   │   └── tabs/
│   │   │       ├── NurseStationTab.tsx           # Ward occupancy & admissions
│   │   │       ├── LabTechTab.tsx                # Lab results with JSON editor
│   │   │       └── PharmacyTab.tsx               # Pharmacy sales input
│   │   ├── schemas/
│   │   │   └── validation.ts                     # Zod validation schemas
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   └── vite.config.ts
├── src/
│   ├── routes/
│   │   ├── index.ts
│   │   ├── staff.ts                              # GET /api/staff
│   │   ├── patients.ts                           # POST /api/patients/admit
│   │   ├── labTests.ts                           # POST /api/lab-tests
│   │   └── pharmacy.ts                           # POST /api/pharmacy/sales
│   ├── app.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma                             # Hospital database schema
├── package.json
├── tsconfig.json
└── .env
```

## Dashboard Tabs

### 1. Nurse Station 🏥
- **Purpose**: Record patient admissions and ward occupancy
- **Features**:
  - Select ward (ICU, General, Pediatrics, Maternity, Surgery)
  - Enter patient name
  - **Admitted_By validation**: Validates that the Staff ID exists in the system
  - Select triage level (CRITICAL, HIGH, MEDIUM, LOW, NON_URGENT)
  - Add admission notes
- **Validation**: Zod schema ensures all required fields are present and Staff ID is valid

### 2. Lab Tech 🧪
- **Purpose**: Submit laboratory test results with structured data
- **Features**:
  - Test ID and name
  - Test category dropdown (Blood, Imaging, Pathology, Microbiology, Biochemistry)
  - **JSON Editor**: Enter structured result data directly as JSON
  - Status tracking (PENDING, PROCESSING, COMPLETED, REVIEWED, CANCELLED)
  - Test notes
- **Validation**: JSON format is validated in real-time; Zod validates entire submission

### 3. Pharmacy 💊
- **Purpose**: Record medication sales and inventory updates
- **Features**:
  - Drug name input
  - Quantity sold
  - Sale price
  - Sale date/time
  - Automatic total calculation
- **Validation**: Ensures all numeric fields are positive and required fields are filled

## Setup & Running

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
DATABASE_URL=postgres://username:password@localhost:5432/hospital_db
PORT=4000
```

### Running the Application

**Terminal 1 - Backend Server:**
```bash
npm run dev
```
Runs on `http://localhost:4000`

**Terminal 2 - Frontend Development:**
```bash
npm run client:dev
```
Runs on `http://localhost:3000` with hot reload

### Building for Production

**Build Backend:**
```bash
npm run build
npm start
```

**Build Frontend:**
```bash
npm run client:build
```
Output goes to `dist/` folder

## Zod Validation Schemas

All forms use Zod for runtime validation:

### NurseStationSchema
```typescript
{
  ward: string
  admittedBy: number (valid Staff ID) ✓
  patientName: string (required)
  triageLevel: enum
  admissionNotes?: string
}
```

### LabResultSchema
```typescript
{
  testId: string (required)
  testName: string (required)
  testCategory: string
  resultData: object (JSON) ✓
  status: enum
  notes?: string
}
```

### PharmacySalesSchema
```typescript
{
  drugName: string (required)
  quantity: number (positive integer)
  salePrice: number (positive decimal)
  saleDate: string (ISO datetime)
}
```

## API Endpoints

### Staff
- `GET /api/staff` - Fetch all staff members for dropdown validation

### Patients
- `POST /api/patients/admit` - Record new patient admission

### Lab Tests
- `POST /api/lab-tests` - Submit lab test results

### Pharmacy
- `POST /api/pharmacy/sales` - Record pharmacy sale

## Key Features

✅ **Zod Validation** - Real-time form validation with custom error messages
✅ **JSON Editor** - Lab tech can directly input structured JSON results
✅ **Staff ID Validation** - Admitted_By field validates against actual Staff records
✅ **Temporal Awareness** - All records include `createdAt` and `updatedAt` timestamps via Prisma
✅ **Responsive Design** - Tailwind CSS ensures mobile-friendly interface
✅ **Type Safety** - Full TypeScript implementation across frontend and backend
✅ **Error Handling** - Comprehensive validation feedback to users

## Database Schema

The dashboard integrates with these Prisma models:
- **Patient** - Admission records with triage and ward data
- **Staff** - Authorized personnel for validation
- **LabTest** - Test results with JSON data
- **Pharmacy** - Drug inventory and sales records
- **Ward** - Occupancy tracking

All models include `createdAt` and `updatedAt` for temporal tracking.
