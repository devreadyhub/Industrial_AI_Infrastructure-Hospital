import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { emitBillingRecordUpdate } from '../services/hospitalEventEmitter';

const prisma = new PrismaClient();
const router = Router();

// Record pharmacy sale
router.post('/sales', async (req: Request, res: Response) => {
  try {
    const { drugName, quantity, salePrice, saleDate } = req.body;

    // Find or create pharmacy entry
    let pharmacy = await prisma.pharmacy.findFirst({ where: { drugName } });
    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.create({
        data: {
          drugName,
          drugCode: drugName.toUpperCase().replace(/ /g, '_'),
          stock: 1000,
          minStockLevel: 100,
          maxStockLevel: 5000,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          unitPrice: new Prisma.Decimal(salePrice),
        },
      });
    }

    // Record sale
    const sale = await prisma.pharmacySales.create({
      data: {
        pharmacyId: pharmacy.id,
        quantity,
        salePrice: new Prisma.Decimal(salePrice),
        saleDate: new Date(saleDate),
      },
    });

    res.json({ success: true, saleId: sale.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

// Create or update billing record
router.post('/billing', async (req: Request, res: Response) => {
  try {
    const { patientId, invoiceNumber, totalAmount, amountCovered, amountDue, paymentStatus, dueDate, notes } = req.body;

    const billingRecord = await prisma.billingRecord.create({
      data: {
        patientId,
        invoiceNumber,
        totalAmount: new Prisma.Decimal(totalAmount),
        amountCovered: new Prisma.Decimal(amountCovered || 0),
        amountDue: new Prisma.Decimal(amountDue),
        paymentStatus,
        dueDate: new Date(dueDate),
        notes,
      },
    });

    // Emit socket event
    emitBillingRecordUpdate(billingRecord, 'system');

    res.json({ success: true, billingId: billingRecord.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create billing record' });
  }
});

// Update billing record
router.put('/billing/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus, amountCovered, paidDate, notes } = req.body;

    const billingRecord = await prisma.billingRecord.update({
      where: { id: parseInt(id) },
      data: {
        paymentStatus,
        amountCovered: amountCovered !== undefined ? new Prisma.Decimal(amountCovered) : undefined,
        paidDate: paidDate ? new Date(paidDate) : undefined,
        notes,
      },
    });

    // Emit socket event
    emitBillingRecordUpdate(billingRecord, 'system');

    res.json({ success: true, billingRecord });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update billing record' });
  }
});

export default router;
