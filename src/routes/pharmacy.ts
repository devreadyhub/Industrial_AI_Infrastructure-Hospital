import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { emitBillingRecordUpdate } from '../services/hospitalEventEmitter';

const prisma = new PrismaClient();
const router = Router();

// Return current pharmacy inventory
router.get('/', async (_req: Request, res: Response) => {
  try {
    const inventory = await prisma.pharmacy.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pharmacy inventory' });
  }
});

// Record pharmacy sale or stock update
router.post('/sales', async (req: Request, res: Response) => {
  try {
    const {
      drugName,
      drugCode,
      quantity = 0,
      salePrice,
      saleDate,
      stockAdded = 0,
      expiryDate,
      batchNumber,
      supplier,
    } = req.body;

    if (!drugName || !drugCode) {
      return res.status(400).json({ error: 'Drug name and code are required' });
    }

    let pharmacy = await prisma.pharmacy.findUnique({ where: { drugCode } });

    const nextExpiryDate = expiryDate ? new Date(expiryDate) : undefined;
    const nextUnitPrice = salePrice !== undefined ? Number(salePrice) : undefined;

    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.create({
        data: {
          drugName,
          drugCode,
          stock: Math.max(Number(stockAdded) - Number(quantity), 0),
          minStockLevel: 100,
          maxStockLevel: 5000,
          expiryDate: nextExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          unitPrice: Number(nextUnitPrice || 0),
        },
      });
    } else {
      const updatedStock = pharmacy.stock + Number(stockAdded) - Number(quantity);
      pharmacy = await prisma.pharmacy.update({
        where: { drugCode },
        data: {
          drugName,
          stock: Math.max(updatedStock, 0),
          expiryDate: nextExpiryDate || pharmacy.expiryDate,
          unitPrice: nextUnitPrice !== undefined ? Number(nextUnitPrice) : pharmacy.unitPrice,
        },
      });
    }

    let sale = null;
    if (Number(quantity) > 0) {
      sale = await prisma.pharmacySales.create({
        data: {
          pharmacyId: pharmacy.id,
          quantity: Number(quantity),
          salePrice: Number(salePrice || pharmacy.unitPrice),
          saleDate: saleDate ? new Date(saleDate) : new Date(),
        },
      });
    }

    res.json({
      success: true,
      inventory: pharmacy,
      saleId: sale?.id || null,
      batchNumber,
      supplier,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record sale or update inventory' });
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
        totalAmount: Number(totalAmount),
        amountCovered: Number(amountCovered || 0),
        amountDue: Number(amountDue),
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
        amountCovered: amountCovered !== undefined ? Number(amountCovered) : undefined,
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
