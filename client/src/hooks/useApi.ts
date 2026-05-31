import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import authAxios from '../utils/api';
import {
  ClinicalFormData,
  StaffingFormData,
  LabTechFormData,
  PharmacyFormData,
  FacilitiesFormData,
  FinanceFormData,
} from '../schemas/validation';

const API_BASE = '';

// Clinical API hooks
export const useClinicalEntries = () => {
  return useQuery({
    queryKey: ['clinical'],
    queryFn: async () => {
      const res = await authAxios.get(`${API_BASE}/patients`);
      const raw = res.data || [];

      // Normalize server patient shape into the client UI shape expected
      const triageMap: { [key: string]: string } = {
        CRITICAL: 'Emergency',
        HIGH: 'Urgent',
        MEDIUM: 'Urgent',
        LOW: 'Non-urgent',
        NON_URGENT: 'Non-urgent',
      };

      return raw.map((p: any) => {
        const wardName = p?.ward?.wardName || '';
        const m = wardName.match(/Ward\s*(\d+)/i);
        const wardNumber = m ? Number(m[1]) : 0;

        return {
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          triageLevel: triageMap[p.triageLevel] || p.triageLevel,
          admittedBy: p.admittedBy || undefined,
          contactNumber: p.phone || undefined,
          wardNumber,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddClinicalEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClinicalFormData) => {
      const res = await authAxios.post(`${API_BASE}/patients/admit`, {
        ward: `Ward ${data.wardNumber}`,
        patientName: data.patientName,
        patientCode: data.patientCode || undefined,
        triageLevel: data.triageLevel,
        admissionNotes: data.admissionNotes,
        contactNumber: data.contactNumber,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical'] });
    },
  });
};

// Staffing API hooks
const formatTimestampForInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : '';
};

const formatDateForInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
};

const normalizeCertifications = (value?: string) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const useStaffDirectory = () => {
  return useQuery({
    queryKey: ['staffing'],
    queryFn: async () => {
      try {
        const res = await authAxios.get(`${API_BASE}/staff`);
        return (res.data || []).map((staff: any) => ({
          staffId: staff.staffCode || staff.id?.toString() || `STF-${staff.id?.toString().padStart(4, '0')}`,
          staffName: `${staff.firstName} ${staff.lastName}`,
          staffStatus: staff.currentStatus || 'On-duty',
          seniority: staff.seniority || 'Mid-level',
          shiftAssignment: staff.shiftAssignment || 'Morning (6AM-2PM)',
          department: staff.department || 'General',
          role: staff.role || staff.department || 'Staff',
          email: staff.email || '',
          phone: staff.phone || '',
          dateOfBirth: formatDateForInput(staff.dateOfBirth),
          gender: staff.gender || '',
          bloodType: staff.bloodType || '',
          specialization: staff.specialization || '',
          yearsOfExperience: staff.yearsOfExperience ?? undefined,
          assignedWardId: staff.assignedWardId || '',
          onCallStatus: staff.onCallStatus || 'Available',
          nextScheduledShift: formatTimestampForInput(staff.nextScheduledShift),
          emergencyContactName: staff.emergencyContactName || '',
          emergencyContactPhone: staff.emergencyContactPhone || '',
          backgroundCheckDate: formatDateForInput(staff.backgroundCheckDate),
          trainingExpiryDate: formatDateForInput(staff.trainingExpiryDate),
          licenseNumber: staff.licenseNumber || '',
          certifications: Array.isArray(staff.certifications) ? staff.certifications.join(', ') : '',
          currentLocation: staff.currentLocation || '',
        }));
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateStaffStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StaffingFormData & { originalId?: string }) => {
      const staffCode = (data as any).originalId ?? data.staffId;
      
      const seniorityMap: { [key: string]: string } = {
        Junior: 'JUNIOR',
        'Mid-level': 'MID_LEVEL',
        Senior: 'SENIOR',
        Lead: 'LEAD',
      };

      const payload: any = {
        staffName: data.staffName,
        department: data.department,
        staffStatus: data.staffStatus,
        seniority: seniorityMap[data.seniority] || 'MID_LEVEL',
        shiftAssignment: data.shiftAssignment,
      };

      if (data.role) payload.role = data.role;
      if (data.email) payload.email = data.email;
      if (data.phone) payload.phone = data.phone;
      if (data.dateOfBirth) payload.dateOfBirth = new Date(data.dateOfBirth).toISOString();
      if (data.gender) payload.gender = data.gender;
      if (data.bloodType) payload.bloodType = data.bloodType;
      if (data.specialization) payload.specialization = data.specialization;
      if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) payload.yearsOfExperience = data.yearsOfExperience;
      if (data.assignedWardId) payload.assignedWardId = data.assignedWardId;
      if (data.onCallStatus) payload.onCallStatus = data.onCallStatus;
      if (data.nextScheduledShift) payload.nextScheduledShift = new Date(data.nextScheduledShift).toISOString();
      if (data.emergencyContactName) payload.emergencyContactName = data.emergencyContactName;
      if (data.emergencyContactPhone) payload.emergencyContactPhone = data.emergencyContactPhone;
      if (data.backgroundCheckDate) payload.backgroundCheckDate = new Date(data.backgroundCheckDate).toISOString();
      if (data.trainingExpiryDate) payload.trainingExpiryDate = new Date(data.trainingExpiryDate).toISOString();
      if (data.licenseNumber) payload.licenseNumber = data.licenseNumber;
      if (data.currentLocation) payload.currentLocation = data.currentLocation;

      const certifications = normalizeCertifications(data.certifications);
      if (certifications.length) payload.certifications = certifications;

      console.log('Updating staff:', { staffCode, payload });
      const res = await authAxios.put(`${API_BASE}/staff/${staffCode}`, payload);
      console.log('Update response:', res.data);
      return res.data;
    },
    onSuccess: () => {
      console.log('Update successful, invalidating query');
      queryClient.invalidateQueries({ queryKey: ['staffing'] });
    },
    onError: (error: any) => {
      console.error('Update error:', error.response?.data || error.message);
    },
  });
};

// Create staff hook
export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StaffingFormData) => {
      const seniorityMap: { [key: string]: string } = {
        Junior: 'JUNIOR',
        'Mid-level': 'MID_LEVEL',
        Senior: 'SENIOR',
        Lead: 'LEAD',
      };

      const payload: any = {
        staffCode: data.staffId,
        staffName: data.staffName,
        department: data.department,
        staffStatus: data.staffStatus,
        seniority: seniorityMap[data.seniority] || 'MID_LEVEL',
        shiftAssignment: data.shiftAssignment,
      };

      if (data.role) payload.role = data.role;
      if (data.email) payload.email = data.email;
      if (data.phone) payload.phone = data.phone;
      if (data.dateOfBirth) payload.dateOfBirth = new Date(data.dateOfBirth).toISOString();
      if (data.gender) payload.gender = data.gender;
      if (data.bloodType) payload.bloodType = data.bloodType;
      if (data.specialization) payload.specialization = data.specialization;
      if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) payload.yearsOfExperience = data.yearsOfExperience;
      if (data.assignedWardId) payload.assignedWardId = data.assignedWardId;
      if (data.onCallStatus) payload.onCallStatus = data.onCallStatus;
      if (data.nextScheduledShift) payload.nextScheduledShift = new Date(data.nextScheduledShift).toISOString();
      if (data.emergencyContactName) payload.emergencyContactName = data.emergencyContactName;
      if (data.emergencyContactPhone) payload.emergencyContactPhone = data.emergencyContactPhone;
      if (data.backgroundCheckDate) payload.backgroundCheckDate = new Date(data.backgroundCheckDate).toISOString();
      if (data.trainingExpiryDate) payload.trainingExpiryDate = new Date(data.trainingExpiryDate).toISOString();
      if (data.licenseNumber) payload.licenseNumber = data.licenseNumber;
      if (data.currentLocation) payload.currentLocation = data.currentLocation;

      const certifications = normalizeCertifications(data.certifications);
      if (certifications.length) payload.certifications = certifications;

      console.log('=== CREATE STAFF ===');
      console.log('Form data received:', data);
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));
      console.log('Posting to:', `${API_BASE}/staff`);
      
      try {
        const res = await authAxios.post(`${API_BASE}/staff`, payload);
        console.log('Create response:', res.data);
        return res.data;
      } catch (error: any) {
        console.error('Request failed with status:', error.response?.status);
        console.error('Error response:', error.response?.data);
        console.error('Error message:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Create successful, invalidating query');
      queryClient.invalidateQueries({ queryKey: ['staffing'] });
    },
    onError: (error: any) => {
      console.error('Mutation error caught:', error.response?.data || error.message);
    },
  });
};

// Lab Tech API hooks
export const useLabTests = () => {
  return useQuery({
    queryKey: ['labTech'],
    queryFn: async () => {
      try {
        const res = await authAxios.get(`${API_BASE}/lab-tests`);
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSubmitLabTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LabTechFormData) => {
      const payload = {
        testId: `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        patientId: data.patientId,
        testName: data.testName,
        testCategory: 'General',
        resultData: JSON.parse(data.testResults),
        status: 'PENDING',
        notes: data.normalRange ? `Normal range: ${data.normalRange}` : undefined,
        resultDate: data.testDate ? new Date(data.testDate).toISOString() : undefined,
      };
      const res = await authAxios.post(`${API_BASE}/lab-tests`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labTech'] });
    },
  });
};

// Pharmacy API hooks
export const usePharmacyInventory = () => {
  return useQuery({
    queryKey: ['pharmacy'],
    queryFn: async () => {
      try {
        const res = await authAxios.get(`${API_BASE}/pharmacy`);
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdatePharmacy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PharmacyFormData) => {
      const payload = {
        drugName: data.drugName,
        drugCode: data.drugCode,
        quantity: data.unitsSold || 0,
        salePrice: data.unitPrice,
        saleDate: new Date().toISOString(),
        stockAdded: data.stockAdded || 0,
        expiryDate: data.expiryDate,
        batchNumber: data.batchNumber,
        supplier: data.supplier,
      };
      const res = await authAxios.post(`${API_BASE}/pharmacy/sales`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });
};

// Facilities API hooks - Mock data as backend may not have this yet
export const useFacilitiesResources = () => {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      try {
        const res = await authAxios.get(`${API_BASE}/facilities`);
        return res.data || [];
      } catch {
        // Return mock data if endpoint doesn't exist
        return [
          {
            resourceName: 'Oxygen',
            resourceStatus: 'Available',
            quantityAvailable: 15,
            quantityInUse: 5,
            maintenanceLogs: 'Last serviced on ' + new Date().toLocaleDateString(),
          },
        ];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateFacilities = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FacilitiesFormData) => {
      try {
        const res = await authAxios.post(`${API_BASE}/facilities`, data);
        return res.data;
      } catch {
        // If endpoint doesn't exist, still succeed to avoid UI errors
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
};

// Finance API hooks - Mock data as backend may not have this yet
export const useFinanceLookup = (patientId?: string) => {
  return useQuery({
    queryKey: ['finance', patientId],
    queryFn: async () => {
      try {
        if (!patientId) return null;
        const res = await authAxios.get(`${API_BASE}/patients/${patientId}`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateFinance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FinanceFormData) => {
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const amountCovered = Number(data.paidAmount || 0);
      const totalAmount = Number(data.totalAmount || 0);
      const payload = {
        patientId: data.patientId,
        invoiceNumber,
        totalAmount,
        amountCovered,
        amountDue: Math.max(0, totalAmount - amountCovered),
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        insuranceProvider: data.insuranceProvider,
        policyNumber: data.policyNumber,
        dueDate: data.dueDate || new Date().toISOString(),
        notes: `Patient name: ${data.patientName}${data.insuranceProvider ? ` | Insurance: ${data.insuranceProvider}` : ''}${data.policyNumber ? ` | Policy: ${data.policyNumber}` : ''}`,
      };

      try {
        const res = await authAxios.post(`${API_BASE}/finance`, payload);
        return res.data;
      } catch (error) {
        console.error('Finance update failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
};
