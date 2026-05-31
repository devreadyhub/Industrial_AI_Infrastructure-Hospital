import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      invoiceNumber,
      totalAmount,
      amountCovered,
      amountDue,
      paymentStatus,
      paymentMethod,
      insuranceProvider,
      policyNumber,
      dueDate,
      notes,
    } = req.body;

    if (!patientId || !invoiceNumber || totalAmount === undefined || amountDue === undefined) {
      return res.status(400).json({ error: 'Missing required billing fields' });
    }

    let patientIdValue = Number(patientId);
    if (Number.isNaN(patientIdValue)) {
      const patient = await prisma.patient.findUnique({ where: { patientCode: String(patientId) } });
      patientIdValue = patient?.id ?? 0;
    }

    if (!patientIdValue) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }

    const paymentStatusMap: Record<string, string> = {
      Paid: 'FULLY_PAID',
      Partial: 'PARTIALLY_PAID',
      Outstanding: 'PENDING',
      PENDING: 'PENDING',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      FULLY_PAID: 'FULLY_PAID',
      OVERDUE: 'OVERDUE',
      CANCELLED: 'CANCELLED',
    };

    const billingRecord = await prisma.billingRecord.create({
      data: {
        patientId: patientIdValue,
        invoiceNumber,
        insuranceProvider: insuranceProvider || undefined,
        totalAmount: Number(totalAmount),
        amountCovered: Number(amountCovered || 0),
        amountDue: Number(amountDue),
        paymentStatus: (paymentStatusMap[paymentStatus] || 'PENDING') as any,
        paymentMethod: paymentMethod || undefined,
        dueDate: new Date(dueDate),
        notes: notes || undefined,
      },
    });

    res.json({ success: true, billingId: billingRecord.id });
  } catch (error) {
    console.error('Finance route error:', error);
    res.status(500).json({ error: 'Failed to create financial record' });
  }
});

export default router;
