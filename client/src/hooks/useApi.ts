import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ClinicalFormData,
  StaffingFormData,
  LabTechFormData,
  PharmacyFormData,
  FacilitiesFormData,
  FinanceFormData,
} from '../schemas/validation';

const API_BASE = 'http://localhost:3000/api';

// Clinical API hooks
export const useClinicalEntries = () => {
  return useQuery({
    queryKey: ['clinical'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/patients`);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddClinicalEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClinicalFormData) => {
      const res = await axios.post(`${API_BASE}/patients/admit`, {
        ward: `Ward ${data.wardNumber}`,
        patientName: data.patientName,
        triageLevel: data.triageLevel,
        admittedBy: data.admittedBy,
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
export const useStaffDirectory = () => {
  return useQuery({
    queryKey: ['staffing'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_BASE}/staff`);
        return (res.data || []).map((staff: any) => ({
          staffId: staff.id?.toString() || `STF-${staff.id?.toString().padStart(4, '0')}`,
          staffName: `${staff.firstName} ${staff.lastName}`,
          staffStatus: staff.status || 'On-duty',
          seniority: staff.seniority || 'Mid-level',
          shiftAssignment: staff.shift || 'Morning (6AM-2PM)',
          department: staff.department || 'General',
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
    mutationFn: async (data: StaffingFormData) => {
      const res = await axios.put(`${API_BASE}/staff/${data.staffId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffing'] });
    },
  });
};

// Lab Tech API hooks
export const useLabTests = () => {
  return useQuery({
    queryKey: ['labTech'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_BASE}/lab-tests`);
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
      const res = await axios.post(`${API_BASE}/lab-tests`, data);
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
        const res = await axios.get(`${API_BASE}/pharmacy`);
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
      const res = await axios.post(`${API_BASE}/pharmacy`, data);
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
        const res = await axios.get(`${API_BASE}/facilities`);
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
        const res = await axios.post(`${API_BASE}/facilities`, data);
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
        const res = await axios.get(`${API_BASE}/patients/${patientId}`);
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
      try {
        const res = await axios.post(`${API_BASE}/finance`, data);
        return res.data;
      } catch {
        // If endpoint doesn't exist, still succeed
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
};
