# Socket.io Real-Time Hospital Updates Setup

## Overview
This implementation enables real-time bidirectional communication between the backend and frontend using Socket.io. When `BillingRecord` or `LabTest` records are updated, the system automatically emits `GLOBAL_HOSPITAL_UPDATE` events. The frontend automatically listens and updates the AI Chat context window.

## Backend Components

### 1. Socket.io Service (`src/services/socketService.ts`)
- **Purpose**: Initializes and manages Socket.io connections
- **Key Functions**:
  - `initializeSocketIO(httpServer)`: Sets up Socket.io server with CORS
  - `getSocketIO()`: Retrieves the singleton Socket.io instance
  - `emitGlobalHospitalUpdate(update)`: Broadcasts updates to all connected clients in the `hospital-updates` room

### 2. Hospital Event Emitter (`src/services/hospitalEventEmitter.ts`)
- **Purpose**: Provides event emission utilities for hospital data changes
- **Functions**:
  - `emitLabTestUpdate(labTest, updatedBy)`: Emits when a LabTest is created or updated
  - `emitBillingRecordUpdate(billingRecord, updatedBy)`: Emits when a BillingRecord is created or updated

### 3. Updated Routes
- **Lab Tests** (`src/routes/labTests.ts`):
  - `POST /api/lab-tests/` - Create new lab test (emits update)
  - `PUT /api/lab-tests/:id` - Update lab test status (emits update)

- **Pharmacy/Billing** (`src/routes/pharmacy.ts`):
  - `POST /api/pharmacy/billing` - Create billing record (emits update)
  - `PUT /api/pharmacy/billing/:id` - Update billing record (emits update)

### 4. Server Setup (`src/server.ts`)
- Uses `http.createServer()` instead of Express directly to enable Socket.io
- Initializes Socket.io on server startup

## Frontend Components

### 1. useHospitalUpdates Hook (`client/src/hooks/useHospitalUpdates.ts`)
- **Purpose**: Subscribes to real-time hospital updates via Socket.io
- **Features**:
  - Automatically connects/disconnects on mount/unmount
  - Auto-joins the `hospital-updates` room
  - Provides connection status and latest update
  - Supports custom update handlers

```typescript
const { isConnected, latestUpdate, joinUpdates, leaveUpdates } = useHospitalUpdates({
  enabled: true,
  onUpdate: (update) => console.log('New update:', update),
  autoJoinUpdates: true,
});
```

### 2. useAIChatContext Hook & Provider (`client/src/hooks/useAIChatContext.tsx`)
- **Purpose**: Manages AI Chat context and automatically incorporates hospital updates
- **Features**:
  - Maintains chat message history
  - Automatically adds system notes when hospital updates arrive
  - Provides context summary of recent messages
  - Integrates with useHospitalUpdates for real-time updates

```typescript
const { messages, addMessage, contextSummary, addSystemNote, clearMessages } = useAIChatContext();
```

### 3. AIChatWindow Component (`client/src/components/AIChatWindow.tsx`)
- **Purpose**: Displays AI Chat interface with real-time updates
- **Features**:
  - Shows connection status
  - Displays recent hospital updates
  - Sends messages to AI agent with context
  - Shows system event notifications
  - Debug view of context summary

### 4. App Wrapper (`client/src/App.tsx`)
- Wraps the application with `AIChatContextProvider`
- Enables context functionality throughout the app

## Event Flow

```
Backend (Data Change)
    ↓
Route Handler (labTests.ts or pharmacy.ts)
    ↓
Prisma Database Update
    ↓
Event Emitter (hospitalEventEmitter.ts)
    ↓
Socket.io Server (socketService.ts)
    ↓
Broadcasting to 'hospital-updates' room
    ↓
Frontend (Socket.io Client)
    ↓
useHospitalUpdates Hook
    ↓
AIChatContext Provider
    ↓
Automatic System Message Addition
    ↓
Context Summary Updated
    ↓
AIChatWindow Component Re-renders
```

## Usage

### On Backend
When creating or updating records, the system automatically emits events:

```typescript
// Lab Test Update
const labTest = await prisma.labTest.update({...});
emitLabTestUpdate(labTest, 'doctor_name');

// Billing Record Update
const billing = await prisma.billingRecord.update({...});
emitBillingRecordUpdate(billing, 'admin_name');
```

### On Frontend
Use the hook in any component:

```typescript
import { useHospitalUpdates } from '../hooks/useHospitalUpdates';
import { useAIChatContext } from '../hooks/useAIChatContext';

export const MyComponent = () => {
  const { isConnected, latestUpdate } = useHospitalUpdates();
  const { contextSummary, messages } = useAIChatContext();

  // Your component code
};
```

## Update Event Structure

### LAB_TEST_UPDATED
```json
{
  "eventType": "LAB_TEST_UPDATED",
  "timestamp": "2026-05-10T12:00:00Z",
  "data": {
    "id": 1,
    "testId": "LT001",
    "testName": "Blood Test",
    "testCategory": "Blood",
    "status": "COMPLETED",
    "patientId": 5,
    "staffId": 2,
    "resultDate": "2026-05-10T12:00:00Z",
    "notes": "Normal results"
  },
  "updatedBy": "Dr. Smith"
}
```

### BILLING_RECORD_UPDATED
```json
{
  "eventType": "BILLING_RECORD_UPDATED",
  "timestamp": "2026-05-10T12:00:00Z",
  "data": {
    "id": 1,
    "invoiceNumber": "INV-001",
    "patientId": 5,
    "totalAmount": 1500,
    "amountDue": 300,
    "paymentStatus": "PARTIALLY_PAID",
    "paidDate": "2026-05-10T12:00:00Z",
    "dueDate": "2026-06-10T00:00:00Z",
    "notes": "Insurance covered 70%"
  },
  "updatedBy": "Admin"
}
```

## Environment Variables

Ensure `.env` includes (if not already configured):
```
DATABASE_URL=postgresql://...
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama-3
```

On frontend, optionally set:
```
REACT_APP_API_URL=http://localhost:4000
```

## Testing the Setup

### 1. Start Backend
```bash
npm run dev
```

### 2. Start Frontend
```bash
npm run client:dev
```

### 3. Test Events
Send a request to create/update a lab test:
```bash
curl -X POST http://localhost:4000/api/lab-tests \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "LT001",
    "testName": "Blood Test",
    "testCategory": "Blood",
    "resultData": {},
    "status": "COMPLETED",
    "notes": "Normal results"
  }'
```

Or create a billing record:
```bash
curl -X POST http://localhost:4000/api/pharmacy/billing \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "invoiceNumber": "INV-001",
    "totalAmount": 1500,
    "amountDue": 300,
    "paymentStatus": "PENDING",
    "dueDate": "2026-06-10"
  }'
```

The frontend should automatically receive and display the update in the AI Chat context.

## Notes

- The system uses Socket.io rooms (`hospital-updates`) to manage client subscriptions efficiently
- Updates are automatically added as system messages to the AI Chat context
- The context window maintains the last 10 messages for the AI agent to reference
- Connection status is visually indicated in the AIChatWindow component
- All timestamps use ISO 8601 format for consistency
