import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const extractStaffNameFromQuestion = (question: string): string | null => {
  const patterns = [
    /\b(?:do we have|is there|any|find|show me|lookup|search for)\s+(?:a\s+)?(?:staff|staff member|doctor|physician|employee)\s+(?:named|called)?\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\b/i,
    /\b(?:is|are|do|does)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:a\s+)?(?:staff|staff member|doctor|physician|employee)\b/i,
    /\b(?:what|which)\s+(?:duty|shift|department|role|position|status)\s+(?:is|does)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:in|on|at)?\b/i,
  ];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

export const extractPatientNameFromQuestion = (question: string): string | null => {
  const patterns = [
    /\b(?:do we have|is there|any|find|show me|lookup|search for)\s+(?:a\s+)?patient\s+(?:named|called)?\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\b/i,
    /\bpatient\s+(?:named|called)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\b/i,
    /\b(?:is|are|do|does)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:a\s+)?patient\b/i,
  ];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

export const extractStaffDetailFieldFromQuestion = (question: string): 'shiftAssignment' | 'department' | 'role' | 'currentStatus' | null => {
  const lower = question.toLowerCase();
  if (/\b(?:duty|shift|shift assignment)\b/i.test(lower)) return 'shiftAssignment';
  if (/\b(?:department|unit)\b/i.test(lower)) return 'department';
  if (/\b(?:role|position|title)\b/i.test(lower)) return 'role';
  if (/\b(?:status|on duty|off duty|available|present|working)\b/i.test(lower)) return 'currentStatus';
  return null;
};

export const extractPatientDetailFieldFromQuestion = (question: string): 'wardId' | 'admissionDate' | 'dischargeDate' | 'triageLevel' | null => {
  const lower = question.toLowerCase();
  if (/\b(?:ward|unit)\b/i.test(lower)) return 'wardId';
  if (/\b(?:admission date|admitted|admission)\b/i.test(lower)) return 'admissionDate';
  if (/\b(?:discharge date|discharged|discharge)\b/i.test(lower)) return 'dischargeDate';
  if (/\b(?:triage|severity)\b/i.test(lower)) return 'triageLevel';
  return null;
};

const getStartOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setMilliseconds(0);
  return today;
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

const formatDateTime = (value?: Date | string | null): string => {
  if (!value) {
    return 'unknown';
  }
  return new Date(value).toLocaleString();
};

export const answerQuestionFromDatabase = async (question: string): Promise<string | null> => {
  const lowerQuestion = question.toLowerCase();

  try {
    if (/\b(hi|hello|hey|good morning|good afternoon|good evening|greetings|what's up|whats up|how are you)\b/i.test(lowerQuestion)) {
      return 'Hello! I am your hospital operations assistant. I can help with staff counts, ward occupancy, lab status, pharmacy availability, and billing summaries. What would you like to know today?';
    }

    // Search for specific ward patients (e.g., "how many patients in ward 2", "patients in W2")
    const wardMatch = lowerQuestion.match(/(?:ward|w)\s*(\d+|icu|er|ims)/i);
    if (wardMatch && /(patient|occupancy|admit)/i.test(lowerQuestion)) {
      const wardIdentifier = wardMatch[1].toUpperCase();
      const wards = await prisma.ward.findMany();
      let targetWard = wards.find((w) => {
        const wardNum = w.wardName.match(/\d+/);
        return wardNum && wardNum[0] === wardIdentifier;
      }) || wards.find((w) => w.wardName.toUpperCase().includes(wardIdentifier));

      if (targetWard) {
        const patientCount = await prisma.patient.count({
          where: { wardId: targetWard.id, dischargeDate: null },
        });
        const fillPercent = targetWard.capacity > 0 ? Math.round((patientCount / targetWard.capacity) * 100) : 0;
        return `${targetWard.wardName} (${targetWard.department}): ${patientCount}/${targetWard.capacity} patients admitted (${fillPercent}% occupancy).`;
      }
      return `Ward information not found. Please specify a valid ward name.`;
    }

    // Staff code search
    const staffCodeMatch = question.match(/\b([A-Z]{2,}-[A-Z0-9-]{3,})\b/i);
    if (staffCodeMatch && /\bstaff\b|\bdoctor\b|\bemployee\b|\bmember\b|\bcode\b/i.test(lowerQuestion)) {
      const normalizedCode = staffCodeMatch[1].toUpperCase();
      const staff = await prisma.staff.findUnique({ where: { staffCode: normalizedCode } });
      if (staff) {
        const position = staff.role || 'staff member';
        const status = staff.currentStatus || 'status unavailable';
        const department = staff.department ? ` in the ${staff.department} department` : '';
        return `Yes, ${normalizedCode} is a staff member. ${staff.firstName} ${staff.lastName} serves as ${position}${department} and is currently ${status}.`;
      }
      return `I couldn't find a staff record for ${normalizedCode} in the hospital database. Please check the staff code and try again.`;
    }

    // Doctor/staff name and detail search
    const doctorNameMatch = lowerQuestion.match(/\b(?:dr\.?\s+|doctor\s+)([a-zA-Z]+)(?:\s+([a-zA-Z]+))?/i);
    const staffStatusMatch = lowerQuestion.match(/\b(?:is|are|do|does)\s+(?:we\s+)?([A-Za-z]+)(?:\s+([A-Za-z]+))\s+(?:on\s+duty|available|working|present|here)\b/i);
    const staffName = extractStaffNameFromQuestion(question);
    const patientName = extractPatientNameFromQuestion(question);
    const staffDetailField = extractStaffDetailFieldFromQuestion(question);
    const patientDetailField = extractPatientDetailFieldFromQuestion(question);

    const searchByName = async (name: string, entity: 'staff' | 'patient') => {
      const nameParts = name.trim().split(/\s+/).filter(Boolean);
      const orConditions = nameParts.flatMap((token) => [
        { firstName: { contains: token, mode: 'insensitive' as any } },
        { lastName: { contains: token, mode: 'insensitive' as any } },
      ]);

      if (entity === 'staff') {
        return await prisma.staff.findMany({ where: { OR: orConditions } });
      }

      return await prisma.patient.findMany({ where: { OR: orConditions } });
    };

    const formatStaffResponse = (staffList: any[], name: string, detailField?: string) => {
      if (detailField) {
        const detailLines = staffList.map((staff) => {
          let value = 'Unknown';
          if (detailField === 'shiftAssignment') {
            value = staff.shiftAssignment || staff.currentStatus || 'Unknown';
          } else if (detailField === 'department') {
            value = staff.department || 'Unknown';
          } else if (detailField === 'role') {
            value = staff.role || 'Unknown';
          } else if (detailField === 'currentStatus') {
            value = staff.currentStatus || 'Unknown';
          }
          return `${staff.firstName} ${staff.lastName}: ${value}`;
        });
        return `Staff detail for ${name}:
${detailLines.join('\n')}`;
      }

      const staffLines = staffList.map((staff) => {
        const status = staff.currentStatus || 'Unknown status';
        const department = staff.department || 'Unknown department';
        return `${staff.firstName} ${staff.lastName} (${staff.role}) - ${department}, ${status}`;
      });
      return `Yes. Found ${staffList.length} staff member(s) matching your query:\n${staffLines.join('\n')}`;
    };

    const formatPatientResponse = (patientList: any[], name: string, detailField?: string) => {
      if (detailField) {
        const detailLines = patientList.map((patient) => {
          let value = 'Unknown';
          if (detailField === 'wardId') {
            value = patient.wardId?.toString() || 'Unknown';
          } else if (detailField === 'admissionDate') {
            value = formatDateTime(patient.admissionDate);
          } else if (detailField === 'dischargeDate') {
            value = patient.dischargeDate ? formatDateTime(patient.dischargeDate) : 'Not discharged';
          } else if (detailField === 'triageLevel') {
            value = patient.triageLevel || 'Unknown';
          }
          return `${patient.firstName} ${patient.lastName}: ${value}`;
        });
        return `Patient detail for ${name}:
${detailLines.join('\n')}`;
      }

      const patientLines = patientList.map((patient) => {
        const admissionDate = formatDateTime(patient.admissionDate);
        const dischargeDate = patient.dischargeDate ? `, discharged on ${formatDateTime(patient.dischargeDate)}` : '';
        return `${patient.firstName} ${patient.lastName} (${patient.patientCode || 'No code'}) admitted on ${admissionDate}${dischargeDate}`;
      });
      return `Yes. Found ${patientList.length} patient record(s) matching your query:\n${patientLines.join('\n')}`;
    };

    const staffSearchName = doctorNameMatch
      ? [doctorNameMatch[1], doctorNameMatch[2]].filter(Boolean).join(' ')
      : staffStatusMatch
      ? [staffStatusMatch[1], staffStatusMatch[2]].filter(Boolean).join(' ')
      : staffName || null;

    if (staffSearchName) {
      const matchingStaff = await searchByName(staffSearchName, 'staff');
      if (matchingStaff.length > 0) {
        return formatStaffResponse(matchingStaff, staffSearchName, staffDetailField ?? undefined);
      }
      return `No staff member named '${staffSearchName}' was found in the hospital database.`;
    }

    if (patientName) {
      const matchingPatients = await searchByName(patientName, 'patient');
      if (matchingPatients.length > 0) {
        return formatPatientResponse(matchingPatients, patientName, patientDetailField ?? undefined);
      }
      return `No patient named '${patientName}' was found in the hospital database.`;
    }

    // Shift breakdown request
    if (/\b(?:let me|get|show me|show)\s+(?:the\s+)?shift\b|\bshift\b/i.test(lowerQuestion)) {
      const shiftBreakdown = await prisma.staff.groupBy({
        by: ['shiftAssignment'],
        _count: { id: true },
      });
      if (shiftBreakdown.length === 0) {
        return 'Shift information is unavailable in the hospital database.';
      }
      const shiftLines = shiftBreakdown.map((s) => `${s.shiftAssignment || 'Unassigned'}: ${s._count.id} staff`);
      return `Staff breakdown by shift:\n${shiftLines.join('\n')}`;
    }

    // Total patient count
    if (/(how many patients|patient count|census|admitted|total admitted)/i.test(lowerQuestion)) {
      const admitted = await prisma.patient.count({ where: { dischargeDate: null } });
      const admissionsToday = await prisma.patient.count({
        where: {
          admissionDate: { gte: getStartOfToday() },
        },
      });
      return `There are currently ${admitted} patients admitted to the hospital. Today, ${admissionsToday} new patients have been admitted.`;
    }

    // Ward capacity/occupancy report
    if (/(ward\s*capacity|beds|occupancy|ward\s*occupancy|current\s*occupancy|wards\s*count|ward\s*count|ward\s*status|all wards)/i.test(lowerQuestion)) {
      const wards = await prisma.ward.findMany({ orderBy: { wardName: 'asc' } });
      if (wards.length === 0) {
        return 'Ward occupancy data is unavailable in the database at the moment.';
      }
      const wardSummaries = wards.map((ward) => {
        const fillPercent = ward.capacity > 0 ? Math.round((ward.currentOccupancy / ward.capacity) * 100) : 0;
        return `${ward.wardName} (${ward.department}): ${ward.currentOccupancy}/${ward.capacity} occupied (${fillPercent}%).`;
      });
      return `Current ward occupancy is:\n${wardSummaries.join('\n')}`;
    }

    // Doctor / physician count request
    if (/(how\s+many\s+(?:doctors|physicians)|number\s+of\s+(?:doctors|physicians)|total\s+(?:doctors|physicians)|do\s+we\s+have\s+(?:doctors|physicians)|doctor\s+count|physician\s+count)/i.test(lowerQuestion)) {
      const providers = await prisma.staff.findMany({
        where: {
          OR: [
            { role: { contains: 'doctor', mode: 'insensitive' as any } },
            { role: { contains: 'physician', mode: 'insensitive' as any } },
          ],
        },
      });
      const totalProviders = providers.length;
      const doctorCount = providers.filter((s) => /doctor/i.test(s.role || '')).length;
      const physicianCount = providers.filter((s) => /physician/i.test(s.role || '')).length;
      if (totalProviders === 0) {
        return 'There are currently no doctors or physicians recorded in the hospital database.';
      }
      const roleSummary = [];
      if (doctorCount > 0) roleSummary.push(`${doctorCount} doctor${doctorCount === 1 ? '' : 's'}`);
      if (physicianCount > 0) roleSummary.push(`${physicianCount} physician${physicianCount === 1 ? '' : 's'}`);
      return `There are currently ${totalProviders} provider${totalProviders === 1 ? '' : 's'} recorded in the hospital database (${roleSummary.join(', ')}).`;
    }

    // Oxygen / vital sign queries not available in the schema
    if (/\b(oxygen|spo2|o2|oxygen\s+saturation|oxygen\s+level|respiratory)\b/i.test(lowerQuestion)) {
      return 'The hospital database does not contain oxygen level or SpO2 vital sign information.';
    }

    // Department breakdown
    if (/(department|shift.*breakdown|breakdown|by department|per department)/i.test(lowerQuestion)) {
      const staffByDept = await prisma.staff.groupBy({
        by: ['department'],
        _count: { id: true },
        orderBy: { department: 'asc' },
      });

      const shiftBreakdown = await prisma.staff.groupBy({
        by: ['shiftAssignment'],
        _count: { id: true },
      });

      if (staffByDept.length === 0) {
        return 'Department breakdown data is unavailable.';
      }

      const deptLines = staffByDept.map((d) => `${d.department || 'Unassigned'}: ${d._count.id} staff`);
      const shiftLines = shiftBreakdown.map((s) => `${s.shiftAssignment || 'Unassigned'}: ${s._count.id} staff`);

      return `Staff breakdown by department:\n${deptLines.join('\n')}\n\nStaff breakdown by shift:\n${shiftLines.join('\n')}`;
    }

    // Staff count
    if (/(how\s+many\s+staff|number\s+of\s+staff|total\s+staff|staff\s+do\s+we\s+have|staff\s*count|on\s*duty|staffing|staff\s+members)/i.test(lowerQuestion)) {
      const totalStaff = await prisma.staff.count();
      const onDutyCount = await prisma.staff.count({ where: { currentStatus: 'On-duty' } });
      const offDutyCount = await prisma.staff.count({ where: { currentStatus: { not: 'On-duty' } } });
      const roleCounts = await prisma.staff.groupBy({
        by: ['role'],
        _count: { role: true },
        orderBy: { _count: { role: 'desc' } },
      });
      const roleSummary = roleCounts.map((row) => `${row._count.role} ${row.role}`).join(', ');

      return `There are currently ${onDutyCount} staff members on duty out of ${totalStaff} total staff (${offDutyCount} off-duty). The roster includes: ${roleSummary}. I can also provide a department or shift breakdown if you like.`;
    }

    // Lab tests
    if (/(lab test|lab results|tests pending|lab status|laboratory)/i.test(lowerQuestion)) {
      const results = await prisma.labTest.groupBy({
        by: ['status'],
        _count: { id: true },
      });
      if (results.length === 0) {
        return 'No lab test records found in the database.';
      }
      const summary = results.map((row) => `${row._count.id} ${row.status.toLowerCase()}`).join(', ');
      return `Lab test status summary: ${summary}.`;
    }

    // Visitor count
    if (/(visitor|visitors|visiting)/i.test(lowerQuestion)) {
      const totalVisitors = await prisma.visitor.count();
      const activeVisitors = await prisma.visitor.count({ where: { status: 'ACTIVE' } });
      return `There are currently ${activeVisitors} active visitors and ${totalVisitors} visitor records in the hospital system.`;
    }

    // Admissions and discharges
    if (/(admissions|discharges|new patient)/i.test(lowerQuestion)) {
      const admissionsToday = await prisma.patient.count({ where: { admissionDate: { gte: getStartOfToday() } } });
      const dischargesToday = await prisma.patient.count({
        where: {
          dischargeDate: { gte: getStartOfToday() },
        },
      });
      return `Today, ${admissionsToday} patients were admitted and ${dischargesToday} patients were discharged.`;
    }

    // Pharmacy inventory
    if (/(pharmacy|medication|inventory|stock|drug)/i.test(lowerQuestion)) {
      const allPharmacyItems = await prisma.pharmacy.findMany({ orderBy: { stock: 'asc' } });
      if (allPharmacyItems.length === 0) {
        return 'No pharmacy inventory records found in the database.';
      }
      const lowStock = allPharmacyItems.filter((item) => item.stock <= item.minStockLevel);

      if (lowStock.length === 0) {
        return `Pharmacy has ${allPharmacyItems.length} medications in stock. All inventory levels are sufficient for essential medications. No critical stock shortages were detected.`;
      }

      const lowItems = lowStock.slice(0, 5).map((item) => `${item.drugName}: ${item.stock} units (min: ${item.minStockLevel})`).join(', ');
      return `Pharmacy inventory alert: ${lowStock.length} medicines are at or below minimum stock levels. Critical items: ${lowItems}.`;
    }

    // Billing
    if (/(billing|invoice|payment)/i.test(lowerQuestion)) {
      const today = getStartOfToday();
      const summary = await prisma.billingRecord.aggregate({
        _sum: { totalAmount: true, amountDue: true },
        _count: { id: true },
        where: { createdAt: { gte: today } },
      });
      const totalAmount = summary._sum.totalAmount ?? 0;
      const totalDue = summary._sum.amountDue ?? 0;
      const invoiceCount = summary._count.id;
      return `Today there are ${invoiceCount} new billing records with a total amount of ${formatCurrency(totalAmount)} and ${formatCurrency(totalDue)} still due.`;
    }

    return null;
  } catch (error) {
    console.error('[OperationalDataService] Database answer fallback failed:', error);
    return null;
  }
};
