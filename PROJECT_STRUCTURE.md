# Project Structure Overview

## Complete File Tree

```
Industrial_AI_Infrastructure/
├── 📄 QUICK_START.md                    # ⭐ Start here!
├── 📄 DASHBOARD_README.md               # Full documentation
├── 📄 IMPLEMENTATION_SUMMARY.md          # What was built
│
├── 📦 package.json                      # Dependencies
├── 📦 package-lock.json
│
├── 🔧 tsconfig.json                     # TypeScript config
├── 🔧 tsconfig.client.json              # Client-specific TS
├── 🔧 vite.config.ts                    # Vite build config
├── 🔧 tailwind.config.js                # Tailwind CSS config
├── 🔧 postcss.config.js                 # PostCSS plugins
│
├── prisma/
│   └── schema.prisma                    # Database schema
│
├── src/                                 # Backend
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   └── database.ts
│   ├── controllers/
│   │   ├── healthController.ts
│   │   └── userController.ts
│   ├── models/
│   │   └── userModel.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── health.ts
│   │   ├── user.ts
│   │   ├── patients.ts                 # Clinical routes
│   │   ├── staff.ts                    # Staffing routes
│   │   ├── labTests.ts                 # Lab Tech routes
│   │   └── pharmacy.ts                 # Pharmacy routes
│   └── services/
│       └── userService.ts
│
└── client/                              # Frontend (React)
    ├── index.html
    ├── src/
    │   ├── 📄 App.tsx                  # QueryClientProvider setup
    │   ├── 📄 main.tsx                 # Entry point
    │   ├── 📄 index.css                # Global styles
    │   │
    │   ├── 📁 components/
    │   │   ├── Dashboard.tsx            # ⭐ Main container
    │   │   │
    │   │   ├── 📁 layout/
    │   │   │   └── Layout.tsx           # Sidebar + Nav
    │   │   │
    │   │   ├── 📁 sections/             # 6 Dashboard modules
    │   │   │   ├── ClinicalTab.tsx      # 🏥 Nurse Station
    │   │   │   ├── StaffingTab.tsx      # 👥 Admin
    │   │   │   ├── LabTechTab.tsx       # 🔬 Diagnostics
    │   │   │   ├── PharmacyTab.tsx      # 💊 Inventory
    │   │   │   ├── FacilitiesTab.tsx    # 🏢 Logistics
    │   │   │   └── FinanceTab.tsx       # 💳 Billing
    │   │   │
    │   │   └── 📁 common/
    │   │       └── FormComponents.tsx   # Reusable UI
    │   │           ├── Input
    │   │           ├── Select
    │   │           ├── TextArea
    │   │           ├── Button
    │   │           ├── Alert
    │   │           └── FormField
    │   │
    │   ├── 📁 hooks/
    │   │   └── useApi.ts                # React Query hooks
    │   │       ├── useClinicalEntries
    │   │       ├── useAddClinicalEntry
    │   │       ├── useStaffDirectory
    │   │       ├── useUpdateStaffStatus
    │   │       ├── useLabTests
    │   │       ├── useSubmitLabTest
    │   │       ├── usePharmacyInventory
    │   │       ├── useUpdatePharmacy
    │   │       ├── useFacilitiesResources
    │   │       ├── useUpdateFacilities
    │   │       ├── useFinanceLookup
    │   │       └── useUpdateFinance
    │   │
    │   └── 📁 schemas/
    │       └── validation.ts            # Zod schemas
    │           ├── clinicalSchema
    │           ├── staffingSchema
    │           ├── labTechSchema
    │           ├── pharmacySchema
    │           ├── facilitiesSchema
    │           └── financeSchema
    │
    └── vite.config.ts
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Port 5173)                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │           React App (App.tsx)                │  │
│  │  with QueryClientProvider                   │  │
│  └──────────────────────────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼──────────────────────┐  │
│  │         Dashboard Component                 │  │
│  │  (manages active section state)             │  │
│  └──────────────────────┬──────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼──────────────────────┐  │
│  │          Layout Component                   │  │
│  │  (Sidebar + Content Area)                   │  │
│  └──────────────────────┬──────────────────────┘  │
│                         │                           │
│        ┌────────────────┼────────────────┐         │
│        ▼                ▼                ▼         │
│   Clinical         Staffing            Lab...    │
│   Pharmacy         Facilities          Finance   │
│        │                ▼                ▼         │
│        └────────────────┼────────────────┘         │
│                         │                           │
│        ┌────────────────▼─────────────────┐        │
│        │  React Hook Form                 │        │
│        │  (handles all form state)        │        │
│        └────────────────┬─────────────────┘        │
│                         │                           │
│        ┌────────────────▼─────────────────┐        │
│        │  Zod Validation                  │        │
│        │  (validates on submit)           │        │
│        └────────────────┬─────────────────┘        │
│                         │                           │
│        ┌────────────────▼─────────────────┐        │
│        │  React Query Mutation            │        │
│        │  (sends to backend)              │        │
│        └────────────────┬─────────────────┘        │
│                         │                           │
└─────────────────────────┼──────────────────────────┘
                          │
                    HTTP Requests
                    (axios)
                          │
┌─────────────────────────▼──────────────────────────┐
│              Express Backend (Port 3000)          │
├─────────────────────────────────────────────────────┤
│  Routes:                                            │
│  - POST   /api/patients/admit                      │
│  - GET    /api/staff                               │
│  - PUT    /api/staff/:id                           │
│  - GET/POST /api/lab-tests                         │
│  - GET/POST /api/pharmacy                          │
└─────────────────────────┬──────────────────────────┘
                          │
                     Prisma ORM
                          │
┌─────────────────────────▼──────────────────────────┐
│         PostgreSQL Database                        │
├─────────────────────────────────────────────────────┤
│  Tables:                                            │
│  - patients                                         │
│  - staff                                            │
│  - labs                                             │
│  - pharmacy                                         │
│  - ... (per schema.prisma)                         │
└─────────────────────────────────────────────────────┘
```

## 📊 Data Flow Example: Patient Admission

```
User fills form in ClinicalTab
        ↓
React Hook Form captures values
        ↓
User clicks "Record Admission"
        ↓
Zod validation checks:
  ✓ patientName (min 2 chars)
  ✓ triageLevel (Emergency|Urgent|Non-urgent)
  ✓ wardNumber (1-10)
  ✓ admittedBy (STF-XXXX format) ← Strict regex
  ✓ contactNumber (10+ digits)
        ↓
If valid → Continue
If invalid → Show error messages, stop
        ↓
React Query mutation: useAddClinicalEntry()
        ↓
POST /api/patients/admit
{
  "patientName": "John Doe",
  "triageLevel": "Urgent",
  "wardNumber": 3,
  "admittedBy": "STF-0001",
  "contactNumber": "1234567890",
  "admissionNotes": "..."
}
        ↓
Backend processes request
        ↓
Prisma creates new Patient record
        ↓
Response: {success: true, patientId: 123}
        ↓
onSuccess callback:
  ✓ Show success alert
  ✓ Reset form
  ✓ Invalidate ['clinical'] cache
  ✓ Auto-refetch recent admissions
        ↓
✨ UI updates with new data
   (Pharmacy data stays intact!)
```

## 🔐 Validation Chain

```
┌─────────────────────────────────────────────┐
│  Zod Schema Definition                      │
│  (TypeScript types + runtime validation)    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  React Hook Form                            │
│  (integrates Zod via @hookform/resolvers)   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Form Component                             │
│  (Input, Select, TextArea)                  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  On Form Submit                             │
│  - Trigger Zod validation                   │
│  - Extract typed data                       │
│  - Pass to API mutation                     │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    ✅ Valid            ❌ Invalid
        │                     │
        ▼                     ▼
   Send to API         Show Error
   Show success        Disable submit
   Clear form
```

## 📈 React Query Cache Structure

```
QueryClient
├── clinical
│   ├── data: [...]
│   ├── staleTime: 5m
│   ├── gcTime: 10m
│   └── error: null
│
├── staffing
│   ├── data: [...]
│   ├── isFetching: false
│   └── isLoading: false
│
├── labTech
│   ├── data: [...]
│   └── lastUpdated: timestamp
│
├── pharmacy
│   ├── data: [...]
│   └── (separate from clinical!)
│
├── facilities
│   ├── data: [] (mock if no API)
│   └── fallback: mock_resources
│
└── finance
    ├── [finance, patientId]
    ├── data: {patient_data}
    └── enabled: true (if patientId)
```

## 🎯 Component Hierarchy

```
App
├── QueryClientProvider
│   └── Dashboard
│       └── Layout
│           ├── Sidebar (desktop)
│           │   └── 6 section buttons
│           │
│           ├── TopNav (mobile/tablet)
│           │   └── Horizontal tabs
│           │
│           └── Content Area
│               └── Section Component
│                   ├── ClinicalTab
│                   │   ├── Header
│                   │   ├── WardGrid
│                   │   ├── AdmissionForm
│                   │   │   ├── Input (patientName)
│                   │   │   ├── Input (contact)
│                   │   │   ├── Select (triageLevel)
│                   │   │   ├── Input (admittedBy)
│                   │   │   ├── TextArea (notes)
│                   │   │   └── Button (submit)
│                   │   └── RecentTable
│                   │
│                   ├── StaffingTab
│                   │   ├── SearchBar
│                   │   ├── StaffForm
│                   │   └── StaffDirectory (cards)
│                   │
│                   ├── LabTechTab
│                   │   ├── Form
│                   │   │   ├── Input (patientId)
│                   │   │   ├── Input (testName)
│                   │   │   ├── TextArea (JSON editor)
│                   │   │   └── Button
│                   │   └── TestHistory
│                   │
│                   ├── PharmacyTab
│                   │   ├── Tabs (Sales/Stock/Expiry)
│                   │   ├── Form
│                   │   └── InventoryTable
│                   │
│                   ├── FacilitiesTab
│                   │   ├── Form
│                   │   └── ResourceCards (grid)
│                   │
│                   └── FinanceTab
│                       ├── PatientLookup
│                       ├── BillForm
│                       ├── PaymentSummary (cards)
│                       └── InvoiceTemplate
```

## 📦 Installed Packages

```
Core React
├── react@18.2.0
└── react-dom@18.2.0

Form Management
├── react-hook-form
└── @hookform/resolvers

Validation
└── zod@3.23.5

State Management
└── @tanstack/react-query

Icons
└── lucide-react

Styling
├── tailwindcss@3.3.5
├── postcss@8.4.31
└── autoprefixer@10.4.16

Backend
├── express@4.18.2
├── pg@8.11.1
├── @prisma/client@5.12.0
└── dotenv@16.4.1

Build Tools
├── typescript@5.5.4
├── vite@5.0.4
└── @vitejs/plugin-react@4.2.1

Dev Tools
├── ts-node-dev@2.0.0
└── prisma@5.12.0 (CLI)
```

## 🎨 Tailwind Breakpoints Used

```
Mobile First Approach:
- Default: Mobile (< 640px)
- sm: 640px   (small devices)
- md: 768px   (tablets, sidebar appears)
- lg: 1024px  (desktop)
- xl: 1280px  (large desktop)

Component Examples:
┌─────────────┬──────────┬──────────┬─────────┐
│   Mobile    │   Tablet │ Desktop  │ Large   │
├─────────────┼──────────┼──────────┼─────────┤
│ Hidden sm:  │ Visible  │ Visible  │ Visible │
│ Sidebar     │          │          │         │
├─────────────┼──────────┼──────────┼─────────┤
│ 1 column    │ 2 cols   │ 3-4 cols │ 4+ cols │
│ (grid)      │          │          │         │
└─────────────┴──────────┴──────────┴─────────┘
```

---

**File Structure Version**: 1.0
**Last Updated**: May 2026
**Status**: Production Ready ✅
