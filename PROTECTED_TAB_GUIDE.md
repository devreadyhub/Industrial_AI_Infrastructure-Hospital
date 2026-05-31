# ProtectedTab Component Documentation

## Overview

The `ProtectedTab` wrapper component enforces role-based access control (RBAC) on tab content in the Hospital Dashboard. It prevents unauthorized users from accessing sensitive information by displaying a locked interface with a blurred background.

---

## Clearance Levels

| Level | Role | Access |
|-------|------|--------|
| 1 | RECEPTION | Visitor management, basic access |
| 2 | PHARMACY | Medication management, Facilities access |
| 3 | CLINICAL | Patient vitals, nursing notes, lab results |
| 4 | DOCTOR | Full clinical access, diagnostics |
| 5 | ADMIN | All access including Billing & system management |

---

## Protected Tabs

The following tabs are currently protected:

### 1. Clinical Tab (Level 3)
- **Required Clearance:** 3 (CLINICAL, DOCTOR, ADMIN)
- **Restricted to:** Nurses, Doctors, Admins
- **Content:** Patient vitals, ward assignments, clinical notes

### 2. Facilities Tab (Level 2)
- **Required Clearance:** 2 (PHARMACY, CLINICAL, DOCTOR, ADMIN)
- **Restricted to:** Pharmacy staff, Clinical staff, Doctors, Admins
- **Content:** Resource management, equipment inventory, maintenance logs

### 3. Billing Tab / Finance (Level 5)
- **Required Clearance:** 5 (ADMIN only)
- **Restricted to:** Administrators only
- **Content:** Patient billing, insurance information, payment status

---

## Component Structure

### AuthContext

Located in `client/src/contexts/AuthContext.tsx`

```typescript
export interface User {
  id: string;
  name: string;
  role: string;
  clearanceLevel: number;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateClearanceLevel: (level: number) => void;
}
```

### ProtectedTab Component

Located in `client/src/components/ProtectedTab.tsx`

```typescript
interface ProtectedTabProps {
  requiredClearance: number;  // Minimum clearance level required
  children: React.ReactNode;  // Content to protect
  tabName?: string;           // Name displayed in unlock message
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { ProtectedTab } from '../components/ProtectedTab';

// Protect Clinical Tab (requires level 3+)
<ProtectedTab requiredClearance={3} tabName="Clinical Tab">
  <ClinicalTab />
</ProtectedTab>

// Protect Facilities Tab (requires level 2+)
<ProtectedTab requiredClearance={2} tabName="Facilities Tab">
  <FacilitiesTab />
</ProtectedTab>

// Protect Billing Tab (requires level 5+)
<ProtectedTab requiredClearance={5} tabName="Billing Tab">
  <FinanceTab />
</ProtectedTab>
```

### In Dashboard Component

The Dashboard component already wraps the tabs:

```typescript
const renderSection = () => {
  switch (currentSection) {
    case 'clinical':
      return (
        <ProtectedTab requiredClearance={3} tabName="Clinical Tab">
          <ClinicalTab />
        </ProtectedTab>
      );
    case 'facilities':
      return (
        <ProtectedTab requiredClearance={2} tabName="Facilities Tab">
          <FacilitiesTab />
        </ProtectedTab>
      );
    case 'finance':
      return (
        <ProtectedTab requiredClearance={5} tabName="Billing Tab">
          <FinanceTab />
        </ProtectedTab>
      );
    // ... other cases
  }
};
```

---

## Visual Behavior

### When User Has Sufficient Clearance

- ✅ Tab content is displayed normally
- ✅ No visual restrictions
- ✅ Full interaction with tab features

### When User's Clearance is Too Low

1. **Blurred Content Layer**
   - Background content is blurred for security
   - Non-interactive (pointer-events: none)
   - Reduced opacity for visual distinction

2. **Overlay with Lock Icon**
   - Large red lock icon (🔒)
   - "Unauthorized Access" heading
   - User's current clearance level displayed
   - Required clearance level displayed
   - Contact administrator message

3. **Dialog Card**
   - Centered white card with shadow
   - Clear explanatory text
   - Side-by-side clearance comparison
   - Professional appearance with helpful messaging

---

## Testing the Protection

### Method 1: Using ProtectedTabDemo Component

A demo component is available to test different clearance levels:

```typescript
import { ProtectedTabDemo } from '../components/ProtectedTabDemo';

// Add to any page to test
<ProtectedTabDemo />
```

This component allows you to:
- Select different clearance levels
- See instant visual feedback
- Navigate between protected tabs
- Test access control behavior

### Method 2: Manual Testing

Edit `client/src/contexts/AuthContext.tsx`:

```typescript
const [user, setUser] = useState<User | null>({
  id: '1',
  name: 'Test User',
  role: 'test',
  clearanceLevel: 1,  // Change this to test different levels
});
```

Then navigate to different tabs to see protection in action.

### Test Scenarios

**Scenario 1:** Reception Staff (Level 1) trying to access Billing
- User Clearance: 1
- Required: 5
- Result: 🔒 Unauthorized Access overlay shown

**Scenario 2:** Nurse (Level 3) trying to access Facilities
- User Clearance: 3
- Required: 2
- Result: ✅ Full access granted (3 ≥ 2)

**Scenario 3:** Doctor (Level 4) trying to access Clinical
- User Clearance: 4
- Required: 3
- Result: ✅ Full access granted (4 ≥ 3)

**Scenario 4:** Admin (Level 5) trying to access Billing
- User Clearance: 5
- Required: 5
- Result: ✅ Full access granted (5 ≥ 5)

---

## Styling

The ProtectedTab component uses Tailwind CSS classes:

- **Blur Effect:** `blur-sm` (4px blur)
- **Lock Icon:** `lucide-react` Library
- **Colors:** Red for lock (`text-red-500`), White for dialog
- **Responsive:** Adapts to all screen sizes
- **Shadow:** `shadow-lg` for depth

---

## Access Control Logic

```typescript
const hasAccess = user.clearanceLevel >= requiredClearance;

if (hasAccess) {
  // Display content normally
  return <>{children}</>;
} else {
  // Display locked interface
  return <LockedOverlay />;
}
```

---

## Integration with Backend

The AuthContext can be integrated with backend authentication:

```typescript
// Example: After successful login
const login = async (credentials: LoginCredentials) => {
  const response = await loginAPI(credentials);
  const user: User = {
    id: response.userId,
    name: response.userName,
    role: response.role,
    clearanceLevel: response.clearanceLevel, // From backend
  };
  setUser(user);
};
```

---

## File Structure

```
client/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx           # Auth context with user & clearance
│   ├── components/
│   │   ├── Dashboard.tsx             # Uses ProtectedTab wrappers
│   │   ├── ProtectedTab.tsx          # Main protection component
│   │   ├── ProtectedTabDemo.tsx      # Testing/demo component
│   │   └── sections/
│   │       ├── ClinicalTab.tsx       # Protected (Level 3)
│   │       ├── FacilitiesTab.tsx     # Protected (Level 2)
│   │       └── FinanceTab.tsx        # Protected (Level 5)
│   └── App.tsx                       # Wrapped with AuthProvider
```

---

## API Reference

### useAuth Hook

```typescript
const { user, login, logout, updateClearanceLevel } = useAuth();

// user: Current user object or null
// login(user): Set new user
// logout(): Clear user
// updateClearanceLevel(level): Update user's clearance
```

### ProtectedTab Props

```typescript
interface ProtectedTabProps {
  requiredClearance: number;      // Min clearance level (1-5)
  children: React.ReactNode;      // Content to render
  tabName?: string;               // Display name in lock message
}
```

---

## Accessibility

The ProtectedTab component includes:

- ✅ Proper semantic HTML
- ✅ Clear visual lock indicators
- ✅ Explanatory text for all users
- ✅ High contrast for readability
- ✅ Clear messaging about required clearance
- ✅ Professional, non-dismissive tone

---

## Security Considerations

⚠️ **Important Notes:**

1. **Client-side Protection Only**
   - This is a UI/UX protection layer
   - Always enforce access control on the backend
   - API endpoints must validate user clearance

2. **Not a Security Measure**
   - Protects user experience, not data
   - Users with developer tools can inspect HTML
   - Backend must have proper authentication

3. **Best Practices**
   - Use with backend role-based access control
   - Validate clearance on all API calls
   - Implement proper session management
   - Use HTTPS for all communications

---

## Future Enhancements

Potential improvements to consider:

1. **Granular Permissions**
   - Different permissions per role
   - Feature-level access control
   - Resource-specific restrictions

2. **Audit Logging**
   - Log access attempts
   - Track unauthorized access attempts
   - Dashboard for security monitoring

3. **Dynamic Clearance Updates**
   - Real-time permission changes
   - Refresh user permissions from backend
   - Handle session expiration

4. **Custom Unlock Messages**
   - Context-specific messages
   - Multilingual support
   - Custom styling per role

5. **Permission Escalation Workflow**
   - Request access button
   - Notification system
   - Approval workflow

---

## Troubleshooting

### Issue: Tab is always locked regardless of clearance

**Solution:** Verify user is within AuthProvider and clearance level is correct.

```typescript
// Check in browser console:
const { user } = useAuth();
console.log(user); // Should show clearanceLevel
```

### Issue: AuthProvider error "must be used within AuthProvider"

**Solution:** Ensure App.tsx wraps Dashboard with AuthProvider:

```typescript
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <AIChatContextProvider>
      <Dashboard />
    </AIChatContextProvider>
  </AuthProvider>
</QueryClientProvider>
```

### Issue: Styling looks incorrect

**Solution:** Verify Tailwind CSS is properly configured and lucide-react is installed:

```bash
npm list tailwindcss lucide-react
```

---

## Support & Maintenance

For questions or issues:

1. Check the troubleshooting section above
2. Review the component source code
3. Test using ProtectedTabDemo component
4. Consult backend authentication implementation

---

**Last Updated:** May 10, 2026  
**Version:** 1.0  
**Status:** Production Ready
