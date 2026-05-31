require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const wards = [
  { wardName: 'Ward 1', capacity: 20, currentOccupancy: 0, department: 'General Medicine' },
  { wardName: 'Ward 2', capacity: 20, currentOccupancy: 0, department: 'Surgery' },
  { wardName: 'Ward 3', capacity: 20, currentOccupancy: 0, department: 'Pediatrics' },
  { wardName: 'ICU', capacity: 12, currentOccupancy: 0, department: 'Critical Care' },
  { wardName: 'ER', capacity: 16, currentOccupancy: 0, department: 'Emergency' },
  { wardName: 'Maternity', capacity: 15, currentOccupancy: 0, department: 'Obstetrics' },
];

const staff = [
  // Administration
  {
    staffCode: 'ADMIN-MAIN-001',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@hospital.local',
    isAdmin: true,
    clearanceLevel: 5,
    role: 'System Admin',
    seniority: 'CHIEF',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Administration',
    licenseNumber: 'ADM-0001',
    certifications: ['HIPAA', 'Security Awareness'],
    currentLocation: 'Main Admin Office',
  },
  {
    staffCode: 'ADMIN-MGR-001',
    firstName: 'Jennifer',
    lastName: 'Thompson',
    email: 'jennifer.thompson@hospital.local',
    isAdmin: false,
    clearanceLevel: 3,
    role: 'Hospital Manager',
    seniority: 'LEAD',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Administration',
    licenseNumber: 'ADM-0003',
    certifications: ['Hospital Management', 'HIPAA'],
    currentLocation: 'Main Office',
  },
  {
    staffCode: 'RC-LISA-001',
    firstName: 'Lisa',
    lastName: 'Miller',
    email: 'lisa.miller@hospital.local',
    role: 'Receptionist',
    seniority: 'JUNIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Morning Shift',
    department: 'Administration',
    licenseNumber: 'ADM-0002',
    certifications: ['Customer Service'],
    currentLocation: 'Front Desk',
  },
  {
    staffCode: 'RC-JAMES-001',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@hospital.local',
    role: 'Receptionist',
    seniority: 'JUNIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Evening Shift',
    department: 'Administration',
    licenseNumber: 'ADM-0004',
    certifications: ['Customer Service'],
    currentLocation: 'Front Desk',
  },
  // Emergency Department
  {
    staffCode: 'DR-SAM-001',
    firstName: 'Sam',
    lastName: 'Ekpo',
    email: 'sam.ekpo@hospital.local',
    role: 'Doctor',
    seniority: 'CONSULTANT',
    currentStatus: 'On-duty',
    shiftAssignment: 'Emergency Shift',
    department: 'Emergency',
    licenseNumber: 'MED-1001',
    certifications: ['ACLS', 'ATLS', 'Advanced Trauma Life Support'],
    currentLocation: 'ER',
  },
  {
    staffCode: 'DR-PETER-001',
    firstName: 'Peter',
    lastName: 'Okonkwo',
    email: 'peter.okonkwo@hospital.local',
    role: 'Doctor',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Emergency Shift',
    department: 'Emergency',
    licenseNumber: 'MED-1010',
    certifications: ['ACLS', 'ATLS'],
    currentLocation: 'ER',
  },
  {
    staffCode: 'NR-EMERG-001',
    firstName: 'Grace',
    lastName: 'Adeyemi',
    email: 'grace.adeyemi@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Emergency Shift',
    department: 'Emergency',
    licenseNumber: 'NUR-2010',
    certifications: ['BLS', 'ACLS', 'Trauma Nursing'],
    currentLocation: 'ER',
  },
  {
    staffCode: 'NR-EMERG-002',
    firstName: 'Chioma',
    lastName: 'Eze',
    email: 'chioma.eze@hospital.local',
    role: 'Nurse',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Emergency Shift',
    department: 'Emergency',
    licenseNumber: 'NUR-2011',
    certifications: ['BLS'],
    currentLocation: 'ER',
  },
  // Surgery Department
  {
    staffCode: 'DR-AISHA-001',
    firstName: 'Aisha',
    lastName: 'Bello',
    email: 'aisha.bello@hospital.local',
    role: 'Doctor',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Surgery Shift',
    department: 'Surgery',
    licenseNumber: 'MED-1002',
    certifications: ['ACLS', 'General Surgery Certification', 'Advanced Surgical Techniques'],
    currentLocation: 'Ward 2',
  },
  {
    staffCode: 'DR-JOHN-001',
    firstName: 'John',
    lastName: 'Okoro',
    email: 'john.okoro@hospital.local',
    role: 'Doctor',
    seniority: 'CONSULTANT',
    currentStatus: 'On-duty',
    shiftAssignment: 'Surgery Shift',
    department: 'Surgery',
    licenseNumber: 'MED-1003',
    certifications: ['ACLS', 'Cardiac Surgery', 'Advanced Surgical Techniques'],
    currentLocation: 'Ward 2',
  },
  {
    staffCode: 'NR-SURG-001',
    firstName: 'Patricia',
    lastName: 'Ndako',
    email: 'patricia.ndako@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Surgery Shift',
    department: 'Surgery',
    licenseNumber: 'NUR-2003',
    certifications: ['BLS', 'Surgical Nursing'],
    currentLocation: 'Ward 2',
  },
  {
    staffCode: 'NR-SURG-002',
    firstName: 'Amara',
    lastName: 'Mbezu',
    email: 'amara.mbezu@hospital.local',
    role: 'Nurse',
    seniority: 'MID_LEVEL',
    currentStatus: 'Off-duty',
    shiftAssignment: 'Night Shift',
    department: 'Surgery',
    licenseNumber: 'NUR-2004',
    certifications: ['BLS'],
    currentLocation: 'Ward 2',
  },
  // General Medicine
  {
    staffCode: 'DR-FATIMA-001',
    firstName: 'Fatima',
    lastName: 'Hassan',
    email: 'fatima.hassan@hospital.local',
    role: 'Doctor',
    seniority: 'LEAD',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'General Medicine',
    licenseNumber: 'MED-1004',
    certifications: ['ACLS', 'Internal Medicine'],
    currentLocation: 'Ward 1',
  },
  {
    staffCode: 'DR-DAVID-001',
    firstName: 'David',
    lastName: 'Mensah',
    email: 'david.mensah@hospital.local',
    role: 'Doctor',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'General Medicine',
    licenseNumber: 'MED-1005',
    certifications: ['ACLS'],
    currentLocation: 'Ward 1',
  },
  {
    staffCode: 'NR-GM-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'General Medicine',
    licenseNumber: 'NUR-2001',
    certifications: ['BLS', 'ACLS'],
    currentLocation: 'Ward 1',
  },
  {
    staffCode: 'NR-GM-002',
    firstName: 'Miguel',
    lastName: 'Santos',
    email: 'miguel.santos@hospital.local',
    role: 'Nurse',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'General Medicine',
    licenseNumber: 'NUR-2002',
    certifications: ['BLS'],
    currentLocation: 'Ward 1',
  },
  // Pediatrics
  {
    staffCode: 'DR-OLUWA-001',
    firstName: 'Oluwaseun',
    lastName: 'Oluwambe',
    email: 'oluwaseun.oluwambe@hospital.local',
    role: 'Doctor',
    seniority: 'LEAD',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Pediatrics',
    licenseNumber: 'MED-1006',
    certifications: ['ACLS', 'Pediatrics', 'PALS'],
    currentLocation: 'Ward 3',
  },
  {
    staffCode: 'NR-PED-001',
    firstName: 'Rachel',
    lastName: 'Ijeoma',
    email: 'rachel.ijeoma@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Pediatrics',
    licenseNumber: 'NUR-2005',
    certifications: ['BLS', 'PALS', 'Pediatric Nursing'],
    currentLocation: 'Ward 3',
  },
  {
    staffCode: 'NR-PED-002',
    firstName: 'Ngozi',
    lastName: 'Okafor',
    email: 'ngozi.okafor@hospital.local',
    role: 'Nurse',
    seniority: 'JUNIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Evening Shift',
    department: 'Pediatrics',
    licenseNumber: 'NUR-2006',
    certifications: ['BLS'],
    currentLocation: 'Ward 3',
  },
  // ICU/Critical Care
  {
    staffCode: 'DR-YUKI-001',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    email: 'yuki.tanaka@hospital.local',
    role: 'Doctor',
    seniority: 'CONSULTANT',
    currentStatus: 'On-duty',
    shiftAssignment: 'ICU Shift',
    department: 'Critical Care',
    licenseNumber: 'MED-1007',
    certifications: ['ACLS', 'Critical Care Medicine'],
    currentLocation: 'ICU',
  },
  {
    staffCode: 'NR-ICU-001',
    firstName: 'Kathy',
    lastName: 'Mensah',
    email: 'kathy.mensah@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'ICU Shift',
    department: 'Critical Care',
    licenseNumber: 'NUR-2007',
    certifications: ['BLS', 'ACLS', 'ICU Nursing'],
    currentLocation: 'ICU',
  },
  {
    staffCode: 'NR-ICU-002',
    firstName: 'Thomas',
    lastName: 'Obi',
    email: 'thomas.obi@hospital.local',
    role: 'Nurse',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Night Shift',
    department: 'Critical Care',
    licenseNumber: 'NUR-2008',
    certifications: ['BLS', 'ACLS'],
    currentLocation: 'ICU',
  },
  // Obstetrics/Maternity
  {
    staffCode: 'DR-MERCY-001',
    firstName: 'Mercy',
    lastName: 'Obinna',
    email: 'mercy.obinna@hospital.local',
    role: 'Doctor',
    seniority: 'LEAD',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Obstetrics',
    licenseNumber: 'MED-1008',
    certifications: ['ACLS', 'Obstetrics & Gynecology'],
    currentLocation: 'Maternity',
  },
  {
    staffCode: 'NR-OB-001',
    firstName: 'Blessing',
    lastName: 'Olatunde',
    email: 'blessing.olatunde@hospital.local',
    role: 'Nurse',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Obstetrics',
    licenseNumber: 'NUR-2009',
    certifications: ['BLS', 'Midwifery'],
    currentLocation: 'Maternity',
  },
  // Support Services
  {
    staffCode: 'RT-KIRA-001',
    firstName: 'Kira',
    lastName: 'Lee',
    email: 'kira.lee@hospital.local',
    role: 'Radiology Technician',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Radiology',
    licenseNumber: 'RAD-3001',
    certifications: ['RadTech Certification', 'CT Scan Operator'],
    currentLocation: 'Radiology Department',
  },
  {
    staffCode: 'PH-EMMA-001',
    firstName: 'Emma',
    lastName: 'Green',
    email: 'emma.green@hospital.local',
    role: 'Pharmacist',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Pharmacy',
    licenseNumber: 'PHA-4001',
    certifications: ['Pharmacy License', 'Clinical Pharmacy'],
    currentLocation: 'Pharmacy',
  },
  {
    staffCode: 'PH-JANET-001',
    firstName: 'Janet',
    lastName: 'Oladele',
    email: 'janet.oladele@hospital.local',
    role: 'Pharmacy Technician',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Evening Shift',
    department: 'Pharmacy',
    licenseNumber: 'PHA-4002',
    certifications: ['Pharmacy Technician Certification'],
    currentLocation: 'Pharmacy',
  },
  {
    staffCode: 'LT-ADE-001',
    firstName: 'Ade',
    lastName: 'Olutayo',
    email: 'ade.olutayo@hospital.local',
    role: 'Lab Technician',
    seniority: 'MID_LEVEL',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Laboratory',
    licenseNumber: 'LAB-5001',
    certifications: ['Lab Safety', 'Phlebotomy'],
    currentLocation: 'Laboratory',
  },
  {
    staffCode: 'LT-BENJAMIN-001',
    firstName: 'Benjamin',
    lastName: 'Amadi',
    email: 'benjamin.amadi@hospital.local',
    role: 'Lab Technician',
    seniority: 'JUNIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Evening Shift',
    department: 'Laboratory',
    licenseNumber: 'LAB-5002',
    certifications: ['Lab Safety'],
    currentLocation: 'Laboratory',
  },
  {
    staffCode: 'FM-CHRIS-001',
    firstName: 'Chris',
    lastName: 'Adams',
    email: 'chris.adams@hospital.local',
    role: 'Facilities Manager',
    seniority: 'SENIOR',
    currentStatus: 'On-duty',
    shiftAssignment: 'Day Shift',
    department: 'Facilities',
    licenseNumber: 'FAC-6001',
    certifications: ['Facility Management', 'Safety Compliance'],
    currentLocation: 'Maintenance Office',
  },
];

const pharmacyItems = [
  { drugName: 'Paracetamol 500mg', drugCode: 'MED-PAR-001', stock: 250, minStockLevel: 50, maxStockLevel: 500, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), unitPrice: 0.5 },
  { drugName: 'Ibuprofen 200mg', drugCode: 'MED-IBU-001', stock: 180, minStockLevel: 50, maxStockLevel: 400, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), unitPrice: 0.75 },
  { drugName: 'Aspirin 75mg', drugCode: 'MED-ASP-001', stock: 320, minStockLevel: 100, maxStockLevel: 600, expiryDate: new Date(Date.now() + 480 * 24 * 60 * 60 * 1000), unitPrice: 0.35 },
  { drugName: 'Insulin Glargine', drugCode: 'MED-INS-001', stock: 15, minStockLevel: 20, maxStockLevel: 100, expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), unitPrice: 12.5 },
  { drugName: 'Metformin 500mg', drugCode: 'MED-MET-001', stock: 420, minStockLevel: 100, maxStockLevel: 800, expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), unitPrice: 1.0 },
  { drugName: 'Amoxicillin 250mg', drugCode: 'MED-AMO-001', stock: 280, minStockLevel: 80, maxStockLevel: 600, expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), unitPrice: 1.2 },
  { drugName: 'Ciprofloxacin 500mg', drugCode: 'MED-CIP-001', stock: 95, minStockLevel: 50, maxStockLevel: 300, expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), unitPrice: 2.5 },
  { drugName: 'Ceftriaxone 1g', drugCode: 'MED-CEF-001', stock: 145, minStockLevel: 50, maxStockLevel: 400, expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), unitPrice: 3.5 },
  { drugName: 'Morphine 10mg', drugCode: 'MED-MOR-001', stock: 28, minStockLevel: 15, maxStockLevel: 80, expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), unitPrice: 8.0 },
  { drugName: 'Omeprazole 20mg', drugCode: 'MED-OME-001', stock: 360, minStockLevel: 100, maxStockLevel: 700, expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000), unitPrice: 1.5 },
  { drugName: 'Atorvastatin 20mg', drugCode: 'MED-ATO-001', stock: 410, minStockLevel: 100, maxStockLevel: 800, expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), unitPrice: 1.8 },
  { drugName: 'Amlodipine 5mg', drugCode: 'MED-AML-001', stock: 320, minStockLevel: 80, maxStockLevel: 700, expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), unitPrice: 1.2 },
  { drugName: 'Lisinopril 10mg', drugCode: 'MED-LIS-001', stock: 275, minStockLevel: 80, maxStockLevel: 600, expiryDate: new Date(Date.now() + 290 * 24 * 60 * 60 * 1000), unitPrice: 1.4 },
  { drugName: 'Normal Saline Solution', drugCode: 'MED-SAL-001', stock: 150, minStockLevel: 50, maxStockLevel: 300, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), unitPrice: 2.5 },
  { drugName: 'Dopamine Infusion', drugCode: 'MED-DOP-001', stock: 42, minStockLevel: 20, maxStockLevel: 120, expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), unitPrice: 5.5 },
  { drugName: 'Epinephrine 1mg', drugCode: 'MED-EPI-001', stock: 55, minStockLevel: 20, maxStockLevel: 150, expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), unitPrice: 6.0 },
  { drugName: 'Metoprolol 50mg', drugCode: 'MED-MET-002', stock: 235, minStockLevel: 60, maxStockLevel: 500, expiryDate: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000), unitPrice: 1.6 },
  { drugName: 'Furosemide 40mg', drugCode: 'MED-FUR-001', stock: 310, minStockLevel: 80, maxStockLevel: 600, expiryDate: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000), unitPrice: 1.3 },
  { drugName: 'Warfarin 5mg', drugCode: 'MED-WAR-001', stock: 185, minStockLevel: 50, maxStockLevel: 400, expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), unitPrice: 2.2 },
  { drugName: 'Vancomycin 500mg', drugCode: 'MED-VAN-001', stock: 78, minStockLevel: 30, maxStockLevel: 200, expiryDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), unitPrice: 15.0 },
];

const patients = [
  // Ward 1 - General Medicine
  { patientCode: 'PT-0001', firstName: 'Mary', lastName: 'Adebayo', email: 'mary.adebayo@example.com', phone: '+2348012345678', dateOfBirth: new Date('1985-03-16'), triageLevel: 'HIGH', wardName: 'Ward 1', admissionNotes: 'Admitted for acute gastroenteritis and being monitored for dehydration.' },
  { patientCode: 'PT-0008', firstName: 'Isaac', lastName: 'Michael', email: 'isaac.michael@example.com', phone: '+254700123456', dateOfBirth: new Date('1955-01-30'), triageLevel: 'MEDIUM', wardName: 'Ward 1', admissionNotes: 'Monitoring elevated blood pressure and medication response.' },
  { patientCode: 'PT-0009', firstName: 'Nina', lastName: 'Ramos', email: 'nina.ramos@example.com', phone: '+584141234567', dateOfBirth: new Date('1998-06-29'), triageLevel: 'LOW', wardName: 'Ward 1', admissionNotes: 'Routine laparoscopic procedure recovery, due for discharge evaluation soon.' },
  { patientCode: 'PT-1001', firstName: 'Ahmed', lastName: 'Suleiman', email: 'ahmed.suleiman@example.com', phone: '+2349876543210', dateOfBirth: new Date('1962-07-22'), triageLevel: 'MEDIUM', wardName: 'Ward 1', admissionNotes: 'Type 2 diabetes management and complication screening.' },
  { patientCode: 'PT-1002', firstName: 'Nkechi', lastName: 'Owusu', email: 'nkechi.owusu@example.com', phone: '+234123987654', dateOfBirth: new Date('1970-11-14'), triageLevel: 'LOW', wardName: 'Ward 1', admissionNotes: 'Routine checkup and chronic disease management.' },
  { patientCode: 'PT-1003', firstName: 'Grace', lastName: 'Nyambura', email: 'grace.nyambura@example.com', phone: '+254711234567', dateOfBirth: new Date('1975-05-08'), triageLevel: 'MEDIUM', wardName: 'Ward 1', admissionNotes: 'Hypertension control and medication optimization.' },
  
  // Ward 2 - Surgery
  { patientCode: 'PT-0002', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+1234567890', dateOfBirth: new Date('1978-11-23'), triageLevel: 'MEDIUM', wardName: 'Ward 2', admissionNotes: 'Admitted after appendectomy; post-operative observation ongoing.' },
  { patientCode: 'PT-0006', firstName: 'Samuel', lastName: 'Owens', email: 'samuel.owens@example.com', phone: '+12025550123', dateOfBirth: new Date('1990-09-18'), triageLevel: 'MEDIUM', wardName: 'Ward 2', admissionNotes: 'Recovering from laparoscopic surgery; vital signs stable.' },
  { patientCode: 'PT-0011', firstName: 'Rita', lastName: 'Bello', email: 'rita.bello@example.com', phone: '+2348123456789', dateOfBirth: new Date('1972-04-12'), triageLevel: 'LOW', wardName: 'Ward 2', admissionNotes: 'Preparing for scheduled elective surgery in the morning.' },
  { patientCode: 'PT-2001', firstName: 'Kwame', lastName: 'Asante', email: 'kwame.asante@example.com', phone: '+233248123456', dateOfBirth: new Date('1968-02-19'), triageLevel: 'MEDIUM', wardName: 'Ward 2', admissionNotes: 'Post-operative care after hernia repair; wound healing progressing well.' },
  { patientCode: 'PT-2002', firstName: 'Zainab', lastName: 'Mohammed', email: 'zainab.mohammed@example.com', phone: '+256774123456', dateOfBirth: new Date('1982-09-03'), triageLevel: 'HIGH', wardName: 'Ward 2', admissionNotes: 'Post-operative monitoring following caesarean section.' },
  
  // Ward 3 - Pediatrics
  { patientCode: 'PT-0003', firstName: 'Amina', lastName: 'Oluwole', email: 'amina.oluwole@example.com', phone: '+2348098765432', dateOfBirth: new Date('2010-07-02'), triageLevel: 'LOW', wardName: 'Ward 3', admissionNotes: 'Pediatric asthma follow-up and medication adjustment.' },
  { patientCode: 'PT-0007', firstName: 'Chiara', lastName: 'Ndiaye', email: 'chiara.ndiaye@example.com', phone: '+221774123456', dateOfBirth: new Date('2012-02-05'), triageLevel: 'HIGH', wardName: 'Ward 3', admissionNotes: 'Pediatric fever with dehydration treatment ongoing.' },
  { patientCode: 'PT-0010', firstName: 'Ethan', lastName: 'Cole', email: 'ethan.cole@example.com', phone: '+14435550123', dateOfBirth: new Date('2015-08-09'), triageLevel: 'MEDIUM', wardName: 'Ward 3', admissionNotes: 'Child with dehydration and mild infection under observation.' },
  { patientCode: 'PT-3001', firstName: 'Blessing', lastName: 'Okoro', email: 'blessing.okoro@example.com', phone: '+2347012345678', dateOfBirth: new Date('2008-12-25'), triageLevel: 'LOW', wardName: 'Ward 3', admissionNotes: 'Pediatric pneumonia recovery with antibiotics.' },
  { patientCode: 'PT-3002', firstName: 'Ajioke', lastName: 'Adeyemi', email: 'ajioke.adeyemi@example.com', phone: '+2349876543215', dateOfBirth: new Date('2009-03-17'), triageLevel: 'MEDIUM', wardName: 'Ward 3', admissionNotes: 'Acute diarrhea with electrolyte management.' },
  
  // ICU - Critical Care
  { patientCode: 'PT-0004', firstName: 'David', lastName: 'Kim', email: 'david.kim@example.com', phone: '+821012345678', dateOfBirth: new Date('1969-12-10'), triageLevel: 'CRITICAL', wardName: 'ICU', admissionNotes: 'Under intensive care for acute myocardial infarction.' },
  { patientCode: 'PT-0012', firstName: 'Samuel', lastName: 'Chen', email: 'samuel.chen@example.com', phone: '+886912345678', dateOfBirth: new Date('1988-10-22'), triageLevel: 'MEDIUM', wardName: 'ICU', admissionNotes: 'Stable ICU patient recovering from severe infection.' },
  { patientCode: 'PT-4001', firstName: 'Robert', lastName: 'Mwangi', email: 'robert.mwangi@example.com', phone: '+254722456789', dateOfBirth: new Date('1951-06-14'), triageLevel: 'CRITICAL', wardName: 'ICU', admissionNotes: 'Post-surgical complication requiring intensive monitoring.' },
  { patientCode: 'PT-4002', firstName: 'Kwasi', lastName: 'Boateng', email: 'kwasi.boateng@example.com', phone: '+233501234567', dateOfBirth: new Date('1960-08-28'), triageLevel: 'HIGH', wardName: 'ICU', admissionNotes: 'Respiratory failure requiring ventilator support.' },
  
  // ER - Emergency
  { patientCode: 'PT-0005', firstName: 'Olivia', lastName: 'Grant', email: 'olivia.grant@example.com', phone: '+14151234567', dateOfBirth: new Date('1980-05-26'), triageLevel: 'HIGH', wardName: 'ER', admissionNotes: 'Presented with severe respiratory distress; stabilised and moved to ER monitoring.' },
  { patientCode: 'PT-5001', firstName: 'Marcus', lastName: 'Johnson', email: 'marcus.johnson@example.com', phone: '+18015551234', dateOfBirth: new Date('1992-01-12'), triageLevel: 'HIGH', wardName: 'ER', admissionNotes: 'Trauma from motor vehicle accident; stable with monitoring.' },
  { patientCode: 'PT-5002', firstName: 'Fatima', lastName: 'Ibrahim', email: 'fatima.ibrahim@example.com', phone: '+212678123456', dateOfBirth: new Date('1987-04-07'), triageLevel: 'MEDIUM', wardName: 'ER', admissionNotes: 'Acute abdominal pain; diagnostic tests in progress.' },
  
  // Maternity
  { patientCode: 'PT-6001', firstName: 'Amira', lastName: 'Hassan', email: 'amira.hassan@example.com', phone: '+971501234567', dateOfBirth: new Date('1990-03-22'), triageLevel: 'LOW', wardName: 'Maternity', admissionNotes: 'Antenatal monitoring; labour expected within 48 hours.' },
  { patientCode: 'PT-6002', firstName: 'Juliana', lastName: 'Fernandes', email: 'juliana.fernandes@example.com', phone: '+5511987654321', dateOfBirth: new Date('1985-07-15'), triageLevel: 'LOW', wardName: 'Maternity', admissionNotes: 'Post-natal recovery progressing well; mother and baby healthy.' },
];

const prescriptions = [
  // Antibiotics
  { dosage: '500mg', frequency: 'Twice a day', duration: 7, quantity: 14, notes: 'Paracetamol for fever management.', patientCode: 'PT-0001', staffCode: 'DR-SAM-001', pharmacyCode: 'MED-PAR-001' },
  { dosage: '250mg', frequency: 'Three times a day', duration: 10, quantity: 30, notes: 'Amoxicillin for bacterial infection.', patientCode: 'PT-0007', staffCode: 'DR-AISHA-001', pharmacyCode: 'MED-AMO-001' },
  { dosage: '500mg', frequency: 'Twice a day', duration: 7, quantity: 14, notes: 'Ciprofloxacin for respiratory infection.', patientCode: 'PT-3001', staffCode: 'DR-OLUWA-001', pharmacyCode: 'MED-CIP-001' },
  { dosage: '1g', frequency: 'Twice a day', duration: 5, quantity: 10, notes: 'Ceftriaxone for severe infection.', patientCode: 'PT-4001', staffCode: 'DR-YUKI-001', pharmacyCode: 'MED-CEF-001' },
  
  // Cardiovascular
  { dosage: '20mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Atorvastatin for cholesterol management.', patientCode: 'PT-1001', staffCode: 'DR-FATIMA-001', pharmacyCode: 'MED-ATO-001' },
  { dosage: '5mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Amlodipine for hypertension.', patientCode: 'PT-1003', staffCode: 'DR-FATIMA-001', pharmacyCode: 'MED-AML-001' },
  { dosage: '10mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Lisinopril for blood pressure control.', patientCode: 'PT-0004', staffCode: 'DR-YUKI-001', pharmacyCode: 'MED-LIS-001' },
  { dosage: '50mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Metoprolol for arrhythmia management.', patientCode: 'PT-0004', staffCode: 'DR-YUKI-001', pharmacyCode: 'MED-MET-002' },
  { dosage: '40mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Furosemide for fluid management.', patientCode: 'PT-0012', staffCode: 'DR-YUKI-001', pharmacyCode: 'MED-FUR-001' },
  
  // Diabetes
  { dosage: '20 units', frequency: 'Once a day at bedtime', duration: 30, quantity: 30, notes: 'Insulin for diabetes management.', patientCode: 'PT-0009', staffCode: 'DR-FATIMA-001', pharmacyCode: 'MED-INS-001' },
  { dosage: '500mg', frequency: 'Twice a day', duration: 30, quantity: 60, notes: 'Metformin for type 2 diabetes.', patientCode: 'PT-1001', staffCode: 'DR-FATIMA-001', pharmacyCode: 'MED-MET-001' },
  
  // GI Medications
  { dosage: '20mg', frequency: 'Once a day', duration: 14, quantity: 14, notes: 'Omeprazole for acid reflux.', patientCode: 'PT-0001', staffCode: 'DR-FATIMA-001', pharmacyCode: 'MED-OME-001' },
  
  // Anticoagulants
  { dosage: '5mg', frequency: 'Once a day', duration: 30, quantity: 30, notes: 'Warfarin for thrombosis prevention.', patientCode: 'PT-0012', staffCode: 'DR-YUKI-001', pharmacyCode: 'MED-WAR-001' },
  
  // Pain Management
  { dosage: '10mg', frequency: 'Every 6 hours as needed', duration: 7, quantity: 28, notes: 'Morphine for post-operative pain.', patientCode: 'PT-0002', staffCode: 'DR-AISHA-001', pharmacyCode: 'MED-MOR-001' },
  { dosage: '200mg', frequency: 'Three times a day', duration: 5, quantity: 15, notes: 'Ibuprofen for pain and inflammation.', patientCode: 'PT-2001', staffCode: 'DR-AISHA-001', pharmacyCode: 'MED-IBU-001' },
];

const labTests = [
  // Hematology
  { testId: 'LT-0001', testName: 'Complete Blood Count', testCategory: 'Hematology', status: 'COMPLETED', resultData: 'Hemoglobin: 13.5 g/dL (normal), WBC: 7.2 x10^3/µL (mildly elevated), Platelets: 220 x10^3/µL', patientCode: 'PT-0004', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 60 * 60 * 1000) },
  { testId: 'LT-0002', testName: 'Blood Smear', testCategory: 'Hematology', status: 'COMPLETED', resultData: 'No abnormal cells detected; normal distribution of RBC and WBC', patientCode: 'PT-0012', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 3 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 90 * 60 * 1000) },
  
  // Imaging
  { testId: 'LT-0003', testName: 'Chest X-Ray', testCategory: 'Imaging', status: 'COMPLETED', resultData: 'Clear lungs; no infiltrates or abnormalities detected.', patientCode: 'PT-0005', staffCode: 'RT-KIRA-001', sampleCollectionDate: new Date(Date.now() - 90 * 60 * 1000), resultDate: new Date(Date.now() - 45 * 60 * 1000) },
  { testId: 'LT-0004', testName: 'Abdominal Ultrasound', testCategory: 'Imaging', status: 'COMPLETED', resultData: 'Normal liver, pancreas, and spleen. No gallstones.', patientCode: 'PT-5002', staffCode: 'RT-KIRA-001', sampleCollectionDate: new Date(Date.now() - 4 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { testId: 'LT-0005', testName: 'CT Scan Brain', testCategory: 'Imaging', status: 'PROCESSING', resultData: 'Scan in progress; will be reviewed by radiologist.', patientCode: 'PT-4002', staffCode: 'RT-KIRA-001', sampleCollectionDate: new Date(Date.now() - 60 * 60 * 1000) },
  
  // Chemistry/Biochemistry
  { testId: 'LT-0006', testName: 'Electrolyte Panel', testCategory: 'Chemistry', status: 'COMPLETED', resultData: 'Sodium: 138 mEq/L (normal), Potassium: 4.1 mEq/L (normal), Chloride: 102 mEq/L (normal)', patientCode: 'PT-0010', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 3 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { testId: 'LT-0007', testName: 'Kidney Function Test', testCategory: 'Chemistry', status: 'COMPLETED', resultData: 'Creatinine: 1.0 mg/dL (normal), BUN: 16 mg/dL (normal)', patientCode: 'PT-1001', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 5 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  { testId: 'LT-0008', testName: 'Liver Function Test', testCategory: 'Chemistry', status: 'COMPLETED', resultData: 'ALT: 32 U/L (normal), AST: 28 U/L (normal), Bilirubin: 0.8 mg/dL (normal)', patientCode: 'PT-0012', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 6 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { testId: 'LT-0009', testName: 'Fasting Blood Glucose', testCategory: 'Chemistry', status: 'COMPLETED', resultData: 'FBS: 95 mg/dL (normal)', patientCode: 'PT-1001', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 8 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 7 * 60 * 60 * 1000) },
  
  // Urinalysis
  { testId: 'LT-0010', testName: 'Urinalysis', testCategory: 'Urinalysis', status: 'COMPLETED', resultData: 'Color: pale yellow (normal), Protein: negative, Glucose: negative, WBC: 0', patientCode: 'PT-0008', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 4 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  { testId: 'LT-0011', testName: 'Urine Culture', testCategory: 'Microbiology', status: 'PENDING', resultData: 'Pending culture results; preliminary screening complete.', patientCode: 'PT-3002', staffCode: 'LT-BENJAMIN-001', sampleCollectionDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  
  // Coagulation Studies
  { testId: 'LT-0012', testName: 'PT/INR', testCategory: 'Coagulation', status: 'COMPLETED', resultData: 'PT: 12.5 seconds (normal), INR: 1.0', patientCode: 'PT-0012', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 60 * 60 * 1000) },
  { testId: 'LT-0013', testName: 'Partial Thromboplastin Time', testCategory: 'Coagulation', status: 'COMPLETED', resultData: 'aPTT: 28 seconds (normal)', patientCode: 'PT-0004', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 3 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  
  // Culture & Sensitivity
  { testId: 'LT-0014', testName: 'Blood Culture', testCategory: 'Microbiology', status: 'PENDING', resultData: 'Incubating; results expected within 48 hours.', patientCode: 'PT-4001', staffCode: 'LT-ADE-001', sampleCollectionDate: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  { testId: 'LT-0015', testName: 'Sputum Culture', testCategory: 'Microbiology', status: 'COMPLETED', resultData: 'No pathogenic organisms detected; normal flora.', patientCode: 'PT-5001', staffCode: 'LT-BENJAMIN-001', sampleCollectionDate: new Date(Date.now() - 5 * 60 * 60 * 1000), resultDate: new Date(Date.now() - 3 * 60 * 60 * 1000) },
];

const billingRecords = [
  // Paid invoices
  { invoiceNumber: 'INV-1001', patientCode: 'PT-0001', totalAmount: 1450.0, amountCovered: 900.0, amountDue: 550.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1002', patientCode: 'PT-0002', totalAmount: 3200.0, amountCovered: 3200.0, amountDue: 0.0, paymentStatus: 'FULLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), paidDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1003', patientCode: 'PT-0003', totalAmount: 850.0, amountCovered: 850.0, amountDue: 0.0, paymentStatus: 'FULLY_PAID', paymentMethod: 'Cash', dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), paidDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1004', patientCode: 'PT-0004', totalAmount: 5600.0, amountCovered: 3000.0, amountDue: 2600.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1005', patientCode: 'PT-0005', totalAmount: 2200.0, amountCovered: 2200.0, amountDue: 0.0, paymentStatus: 'FULLY_PAID', paymentMethod: 'Credit Card', dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  
  // Pending/Overdue invoices
  { invoiceNumber: 'INV-1006', patientCode: 'PT-0006', totalAmount: 1800.0, amountCovered: 600.0, amountDue: 1200.0, paymentStatus: 'PENDING', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1007', patientCode: 'PT-0007', totalAmount: 750.0, amountCovered: 0.0, amountDue: 750.0, paymentStatus: 'PENDING', paymentMethod: 'Cash', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1008', patientCode: 'PT-0008', totalAmount: 1100.0, amountCovered: 550.0, amountDue: 550.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1009', patientCode: 'PT-0009', totalAmount: 920.0, amountCovered: 920.0, amountDue: 0.0, paymentStatus: 'FULLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), paidDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1010', patientCode: 'PT-0010', totalAmount: 680.0, amountCovered: 200.0, amountDue: 480.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Cash', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
  
  // Additional billing for newer patients
  { invoiceNumber: 'INV-1011', patientCode: 'PT-1001', totalAmount: 1350.0, amountCovered: 1000.0, amountDue: 350.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1012', patientCode: 'PT-1002', totalAmount: 550.0, amountCovered: 550.0, amountDue: 0.0, paymentStatus: 'FULLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), paidDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1013', patientCode: 'PT-2001', totalAmount: 4500.0, amountCovered: 2700.0, amountDue: 1800.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1014', patientCode: 'PT-3001', totalAmount: 1200.0, amountCovered: 0.0, amountDue: 1200.0, paymentStatus: 'PENDING', paymentMethod: 'Cash', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
  { invoiceNumber: 'INV-1015', patientCode: 'PT-4001', totalAmount: 8200.0, amountCovered: 5000.0, amountDue: 3200.0, paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'Insurance', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
];

const visitors = [
  { visitorCode: 'VS-0001', firstName: 'John', lastName: 'Smith', phone: '+1234567890', relationship: 'Family', patientCode: 'PT-0003', wardName: 'Ward 3', purpose: 'Support visit', checkedInBy: 'RC-LISA-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0002', firstName: 'Mary', lastName: 'Johnson', phone: '+2348123456789', relationship: 'Family', patientCode: 'PT-0005', wardName: 'ER', purpose: 'Emotional support', checkedInBy: 'RC-LISA-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0003', firstName: 'Robert', lastName: 'Adebayo', phone: '+2348765432109', relationship: 'Spouse', patientCode: 'PT-0001', wardName: 'Ward 1', purpose: 'Visit and support', checkedInBy: 'RC-JAMES-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0004', firstName: 'Angela', lastName: 'Doe', phone: '+1256789012', relationship: 'Sister', patientCode: 'PT-0002', wardName: 'Ward 2', purpose: 'Post-operative support', checkedInBy: 'RC-LISA-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0005', firstName: 'David', lastName: 'Kim', phone: '+821098765432', relationship: 'Son', patientCode: 'PT-0004', wardName: 'ICU', purpose: 'Family visit', checkedInBy: 'RC-JAMES-001', status: 'CHECKED_OUT' },
  { visitorCode: 'VS-0006', firstName: 'Sarah', lastName: 'Mensah', phone: '+233501234567', relationship: 'Mother', patientCode: 'PT-3001', wardName: 'Ward 3', purpose: 'Parent visit', checkedInBy: 'RC-LISA-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0007', firstName: 'James', lastName: 'Chen', phone: '+886912345678', relationship: 'Brother', patientCode: 'PT-0012', wardName: 'ICU', purpose: 'Family support', checkedInBy: 'RC-JAMES-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0008', firstName: 'Mercy', lastName: 'Obi', phone: '+2349876543215', relationship: 'Friend', patientCode: 'PT-1001', wardName: 'Ward 1', purpose: 'Friend visit', checkedInBy: 'RC-LISA-001', status: 'CHECKED_OUT' },
  { visitorCode: 'VS-0009', firstName: 'Nina', lastName: 'Adams', phone: '+14155551234', relationship: 'Contractor', staffCode: 'NR-EMERG-001', purpose: 'Equipment maintenance', checkedInBy: 'RC-JAMES-001', status: 'ACTIVE' },
  { visitorCode: 'VS-0010', firstName: 'Samuel', lastName: 'Gordon', phone: '+442076543210', relationship: 'Consultant', staffCode: 'DR-SAM-001', purpose: 'Specialist consultation', checkedInBy: 'RC-LISA-001', status: 'ACTIVE' },
];

async function main() {
  console.log('Seeding demo data into the hospital database...');

  const wardMap = {};
  for (const ward of wards) {
    let record = await prisma.ward.findFirst({
      where: { wardName: ward.wardName },
    });
    
    if (!record) {
      record = await prisma.ward.create({
        data: ward,
      });
    } else {
      record = await prisma.ward.update({
        where: { id: record.id },
        data: {
          capacity: ward.capacity,
          department: ward.department,
        },
      });
    }
    wardMap[ward.wardName] = record;
  }

  const staffMap = {};
  for (const member of staff) {
    const record = await prisma.staff.upsert({
      where: { staffCode: member.staffCode },
      update: {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        isAdmin: member.isAdmin || false,
        clearanceLevel: member.clearanceLevel || 1,
        role: member.role,
        seniority: member.seniority,
        currentStatus: member.currentStatus,
        shiftAssignment: member.shiftAssignment,
        department: member.department,
        licenseNumber: member.licenseNumber,
        certifications: member.certifications,
        currentLocation: member.currentLocation,
      },
      create: member,
    });
    staffMap[member.staffCode] = record;
  }

  const pharmacyMap = {};
  for (const item of pharmacyItems) {
    const record = await prisma.pharmacy.upsert({
      where: { drugCode: item.drugCode },
      update: {
        stock: item.stock,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        expiryDate: item.expiryDate,
        unitPrice: item.unitPrice,
      },
      create: item,
    });
    pharmacyMap[item.drugCode] = record;
  }

  const patientMap = {};
  for (const patient of patients) {
    const ward = wardMap[patient.wardName];
    if (!ward) {
      throw new Error(`Missing ward for patient ${patient.patientCode}: ${patient.wardName}`);
    }
    const record = await prisma.patient.upsert({
      where: { patientCode: patient.patientCode },
      update: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        triageLevel: patient.triageLevel,
        wardId: ward.id,
        admissionNotes: patient.admissionNotes,
        dischargeDate: null,
      },
      create: {
        patientCode: patient.patientCode,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        triageLevel: patient.triageLevel,
        ward: { connect: { id: ward.id } },
        admissionNotes: patient.admissionNotes,
      },
    });
    patientMap[patient.patientCode] = record;
  }

  for (const prescription of prescriptions) {
    const patient = patientMap[prescription.patientCode];
    const staffMember = staffMap[prescription.staffCode];
    const pharmacyItem = pharmacyMap[prescription.pharmacyCode];
    if (!patient || !staffMember || !pharmacyItem) {
      throw new Error(`Missing relation for prescription ${prescription.patientCode}`);
    }
    const existingPrescription = await prisma.prescription.findFirst({
      where: {
        patientId: patient.id,
        staffId: staffMember.id,
        pharmacyId: pharmacyItem.id,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
      },
    });
    if (!existingPrescription) {
      await prisma.prescription.create({
        data: {
          patient: { connect: { id: patient.id } },
          pharmacy: { connect: { id: pharmacyItem.id } },
          prescribedBy: { connect: { id: staffMember.id } },
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          quantity: prescription.quantity,
          notes: prescription.notes,
        },
      });
    }
  }

  for (const labTest of labTests) {
    const patient = patientMap[labTest.patientCode];
    const staffMember = staffMap[labTest.staffCode];
    if (!patient || !staffMember) {
      throw new Error(`Missing relation for lab test ${labTest.testId}`);
    }
    await prisma.labTest.upsert({
      where: { testId: labTest.testId },
      update: {
        testName: labTest.testName,
        testCategory: labTest.testCategory,
        status: labTest.status,
        resultData: labTest.resultData,
        patientId: patient.id,
        staffId: staffMember.id,
        sampleCollectionDate: labTest.sampleCollectionDate,
        resultDate: labTest.resultDate || null,
      },
      create: {
        testId: labTest.testId,
        testName: labTest.testName,
        testCategory: labTest.testCategory,
        status: labTest.status,
        resultData: labTest.resultData,
        sampleCollectionDate: labTest.sampleCollectionDate,
        resultDate: labTest.resultDate || null,
        patient: { connect: { id: patient.id } },
        performedBy: { connect: { id: staffMember.id } },
      },
    });
  }

  for (const invoice of billingRecords) {
    const patient = patientMap[invoice.patientCode];
    if (!patient) {
      throw new Error(`Missing patient for invoice ${invoice.invoiceNumber}`);
    }
    await prisma.billingRecord.upsert({
      where: { invoiceNumber: invoice.invoiceNumber },
      update: {
        patientId: patient.id,
        totalAmount: invoice.totalAmount,
        amountCovered: invoice.amountCovered,
        amountDue: invoice.amountDue,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate || null,
      },
      create: {
        patient: { connect: { id: patient.id } },
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        amountCovered: invoice.amountCovered,
        amountDue: invoice.amountDue,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate || null,
      },
    });
  }

  for (const visitor of visitors) {
    const patient = visitor.patientCode ? patientMap[visitor.patientCode] : null;
    const staffMember = visitor.staffCode ? staffMap[visitor.staffCode] : null;
    const ward = visitor.wardName ? wardMap[visitor.wardName] : null;

    if (!patient && !staffMember) {
      throw new Error(`Missing relation for visitor ${visitor.visitorCode}: must include patientCode or staffCode`);
    }

    await prisma.visitor.upsert({
      where: { visitorCode: visitor.visitorCode },
      update: {
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        relationship: visitor.relationship,
        patientId: patient?.id || null,
        staffId: staffMember?.id || null,
        wardId: ward?.id || null,
        purpose: visitor.purpose,
        checkedInBy: visitor.checkedInBy,
        status: visitor.status,
      },
      create: {
        visitorCode: visitor.visitorCode,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        relationship: visitor.relationship,
        purpose: visitor.purpose,
        checkedInBy: visitor.checkedInBy,
        status: visitor.status,
        ...(patient ? { patient: { connect: { id: patient.id } } } : {}),
        ...(staffMember ? { staff: { connect: { id: staffMember.id } } } : {}),
        ...(ward ? { ward: { connect: { id: ward.id } } } : {}),
      },
    });
  }

  for (const wardName of Object.keys(wardMap)) {
    const ward = wardMap[wardName];
    const count = await prisma.patient.count({ where: { wardId: ward.id, dischargeDate: null } });
    await prisma.ward.update({ where: { id: ward.id }, data: { currentOccupancy: count } });
  }

  const stats = {
    wards: await prisma.ward.count(),
    staff: await prisma.staff.count(),
    patients: await prisma.patient.count(),
    labTests: await prisma.labTest.count(),
    pharmacyItems: await prisma.pharmacy.count(),
    billingRecords: await prisma.billingRecord.count(),
    visitors: await prisma.visitor.count(),
  };

  console.log('Demo data seed complete. Current counts:', stats);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
