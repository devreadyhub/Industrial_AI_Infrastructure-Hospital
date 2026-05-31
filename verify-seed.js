const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  console.log('=== DATABASE VERIFICATION ===\n');

  // Check wards
  const wards = await prisma.ward.findMany({ orderBy: { wardName: 'asc' } });
  console.log('WARDS:');
  for (const ward of wards) {
    console.log(`  ${ward.wardName}: ${ward.currentOccupancy}/${ward.capacity} (${ward.department})`);
  }

  // Check staff
  console.log('\nSTAFF BY DEPARTMENT:');
  const staffByDept = await prisma.staff.groupBy({
    by: ['department'],
    _count: { id: true },
  });
  for (const dept of staffByDept) {
    console.log(`  ${dept.department}: ${dept._count.id} staff`);
  }

  // Check for Dr. Sam Ekpo
  console.log('\nSPECIFIC STAFF CHECK:');
  const samEkpo = await prisma.staff.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Sam', mode: 'insensitive' } },
        { lastName: { contains: 'Ekpo', mode: 'insensitive' } },
      ],
    },
  });
  if (samEkpo.length > 0) {
    samEkpo.forEach((s) => {
      console.log(`  ✓ ${s.staffCode}: ${s.firstName} ${s.lastName} (${s.role}) - ${s.department}, ${s.currentStatus}`);
    });
  } else {
    console.log('  ✗ No staff named Sam Ekpo found');
  }

  // Check patients by ward
  console.log('\nPATIENTS BY WARD:');
  for (const ward of wards) {
    const patientCount = await prisma.patient.count({
      where: { wardId: ward.id, dischargeDate: null },
    });
    console.log(`  ${ward.wardName}: ${patientCount} patients`);
  }

  // Check totals
  console.log('\nTOTALS:');
  const stats = {
    patients: await prisma.patient.count({ where: { dischargeDate: null } }),
    staff: await prisma.staff.count(),
    labTests: await prisma.labTest.count(),
    pharmacy: await prisma.pharmacy.count(),
    billing: await prisma.billingRecord.count(),
  };
  console.log(`  Admitted patients: ${stats.patients}`);
  console.log(`  Staff members: ${stats.staff}`);
  console.log(`  Lab tests: ${stats.labTests}`);
  console.log(`  Pharmacy items: ${stats.pharmacy}`);
  console.log(`  Billing records: ${stats.billing}`);

  console.log('\n✓ Verification complete!');
  await prisma.$disconnect();
}

verify().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
