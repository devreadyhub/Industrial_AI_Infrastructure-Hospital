require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch (e) {
    console.error('Prisma connect error:', e.message || e);
    process.exit(1);
  }

  try {
    const totalStaff = await prisma.staff.count();
    const onDuty = await prisma.staff.count({ where: { currentStatus: 'On-duty' } });
    const totalPatients = await prisma.patient.count();
    const admittedPatients = await prisma.patient.count({ where: { dischargeDate: null } });
    const wards = await prisma.ward.findMany({ select: { wardName: true, capacity: true, currentOccupancy: true } });

    console.log('DB_INSPECT_RESULT');
    console.log(JSON.stringify({
      totalStaff,
      onDuty,
      totalPatients,
      admittedPatients,
      wardsCount: wards.length,
      wards,
    }, null, 2));
  } catch (err) {
    console.error('DB query error:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
