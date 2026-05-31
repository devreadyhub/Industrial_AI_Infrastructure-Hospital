import React, { useEffect, useState } from 'react';
import { Layout } from './layout/Layout';
import { ClinicalTab } from './sections/ClinicalTab';
import { StaffingTab } from './sections/StaffingTab';
import { LabTechTab } from './sections/LabTechTab';
import { PharmacyTab } from './sections/PharmacyTab';
import { FacilitiesTab } from './sections/FacilitiesTab';
import { FinanceTab } from './sections/FinanceTab';
import { VisitorManagement } from './VisitorManagement';
import { ProtectedTab } from './ProtectedTab';
import AdminTab from './AdminTab';
import { EmergencyOverlay } from './EmergencyOverlay';
import { useEmergencyAlerts } from '../hooks/useEmergencyAlerts';

type Section =
  | 'clinical'
  | 'staffing'
  | 'labtech'
  | 'pharmacy'
  | 'facilities'
  | 'finance'
  | 'visitors'
  | 'admin';

export const Dashboard: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<Section>('clinical');
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [emergencyPatientId, setEmergencyPatientId] = useState<number | null>(null);
  const { latestAlert } = useEmergencyAlerts();

  useEffect(() => {
    if (latestAlert) {
      setShowEmergencyOverlay(true);
      setEmergencyPatientId(latestAlert.patientId ?? null);
      setIsEmergencyMode(true);
      setCurrentSection('clinical');
    }
  }, [latestAlert]);

  const renderSection = () => {
    switch (currentSection) {
      case 'clinical':
        return (
          <ProtectedTab requiredClearance={3} tabName="Clinical Tab">
            <ClinicalTab emergencyPatientId={isEmergencyMode ? emergencyPatientId : null} />
          </ProtectedTab>
        );
      case 'staffing':
        return <StaffingTab />;
      case 'labtech':
        return <LabTechTab />;
      case 'pharmacy':
        return <PharmacyTab />;
      case 'facilities':
        return (
          <ProtectedTab requiredClearance={2} tabName="Facilities Tab">
            <FacilitiesTab showEmergencyEquipment={isEmergencyMode} />
          </ProtectedTab>
        );
      case 'finance':
        return (
          <ProtectedTab requiredClearance={5} tabName="Billing Tab">
            <FinanceTab />
          </ProtectedTab>
        );
      case 'visitors':
        return <VisitorManagement />;
      case 'admin':
        return (
          <ProtectedTab requiredClearance={5} tabName="Admin Control Panel">
            <AdminTab />
          </ProtectedTab>
        );
      default:
        return <ClinicalTab emergencyPatientId={isEmergencyMode ? emergencyPatientId : null} />;
    }
  };

  const handleEnterCommandMode = () => {
    setIsEmergencyMode(true);
    setShowEmergencyOverlay(false);
    // Could navigate to clinical tab or facilities tab
    setCurrentSection('clinical');
  };

  const handleDismissEmergency = () => {
    setShowEmergencyOverlay(false);
    setIsEmergencyMode(false);
    setEmergencyPatientId(null);
  };

  return (
    <>
      <Layout currentSection={currentSection} onSectionChange={setCurrentSection}>
        {renderSection()}
      </Layout>

      <EmergencyOverlay
        isVisible={showEmergencyOverlay}
        emergency={latestAlert}
        onDismiss={handleDismissEmergency}
        onEnterCommandMode={handleEnterCommandMode}
      />
    </>
  );
};
