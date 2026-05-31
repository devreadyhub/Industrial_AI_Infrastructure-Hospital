import { PrismaClient } from '@prisma/client';
import {
  broadcastEmergencyAlert,
  EmergencyPayload,
  notifyEmergencyStaff,
} from './socketService';
import { logAuditEvent } from './auditService';

const prisma = new PrismaClient();

export interface EmergencyTriggerRequest {
  incidentType: string;
  location: string;
  description?: string;
  patientId?: number;
  triggeredByStaffId?: number;
}

export class EmergencyService {
  static async triggerEmergency(request: EmergencyTriggerRequest): Promise<EmergencyPayload> {
    const { incidentType, location, description, patientId, triggeredByStaffId } = request;

    // Determine priority
    let priority: 'HIGH' | 'CRITICAL' | 'CODE_BLUE' = 'HIGH';
    if (incidentType.toLowerCase().includes('code blue')) {
      priority = 'CODE_BLUE';
    } else if (incidentType.toLowerCase().includes('fire') || incidentType.toLowerCase().includes('active shooter')) {
      priority = 'CRITICAL';
    }

    // Create emergency record
    const emergency = await prisma.emergency.create({
      data: {
        incidentType,
        location,
        priority,
        description,
        patientId,
        staffId: triggeredByStaffId,
        status: 'ACTIVE',
      },
    });

    // For Code Blue, find nearest ACLS-certified doctor
    let respondingStaff: any[] = [];
    if (priority === 'CODE_BLUE') {
      respondingStaff = await this.findNearestACLSDoctor(location);
    }

    // Assign responders
    for (const staff of respondingStaff) {
      await prisma.staffEmergency.create({
        data: {
          staffId: staff.id,
          emergencyId: emergency.id,
          role: staff.role || 'Responder',
        },
      });
    }

    // Prepare payload
    const payload: EmergencyPayload = {
      incidentType,
      location,
      priority,
      description,
      patientId,
      requiredActions: this.getRequiredActions(incidentType, priority),
      triggeredBy: triggeredByStaffId ? `Staff ID: ${triggeredByStaffId}` : 'System',
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all clients
    broadcastEmergencyAlert(payload);

    // Log audit event
    await logAuditEvent({
      interactionType: 'emergency_trigger',
      actionType: 'EMERGENCY_DISPATCH',
      userPrompt: `Emergency triggered: ${incidentType} at ${location}`,
      systemResponse: `Emergency dispatched with priority ${priority}`,
      rawOutput: JSON.stringify(payload),
      finalOutput: `Alert broadcasted to all connected clients`,
      // accessStatus: 'SUCCESS',
      status: 'SUCCESS',
      userId: triggeredByStaffId,
      userRole: 'staff',
    });

    return payload;
  }

  private static async findNearestACLSDoctor(location: string): Promise<any[]> {
    // Find doctors with ACLS certification who are on duty
    const doctors = await prisma.staff.findMany({
      where: {
        role: {
          contains: 'Doctor',
          mode: 'insensitive',
        },
        certifications: {
          has: 'ACLS',
        },
        shiftAssignment: 'ON_DUTY',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentLocation: true,
        phone: true,
      },
    });

    // For simplicity, return all matching doctors
    // In a real system, you'd calculate distance based on location
    return doctors.slice(0, 3); // Limit to 3 responders
  }

  private static getRequiredActions(incidentType: string, priority: string): string[] {
    const actions: string[] = [];

    if (priority === 'CODE_BLUE') {
      actions.push('Initiate CPR if indicated');
      actions.push('Call for defibrillator');
      actions.push('Administer emergency medications');
      actions.push('Prepare for intubation');
    } else if (incidentType.toLowerCase().includes('fire')) {
      actions.push('Evacuate patients and staff');
      actions.push('Activate fire suppression systems');
      actions.push('Contact fire department');
      actions.push('Secure oxygen sources');
    } else {
      actions.push('Assess situation');
      actions.push('Ensure patient safety');
      actions.push('Contact appropriate emergency services');
      actions.push('Follow hospital emergency protocols');
    }

    return actions;
  }

  static async resolveEmergency(emergencyId: number, actionsTaken: string, resolvedByStaffId?: number): Promise<void> {
    await prisma.emergency.update({
      where: { id: emergencyId },
      data: {
        status: 'RESOLVED',
        actionsTaken,
        resolvedAt: new Date(),
        staffId: resolvedByStaffId,
      },
    });

    // Log resolution
    await logAuditEvent({
      interactionType: 'emergency_resolution',
      actionType: 'EMERGENCY_RESOLVED',
      userPrompt: `Emergency ${emergencyId} resolved`,
      systemResponse: `Actions taken: ${actionsTaken}`,
      rawOutput: actionsTaken,
      finalOutput: 'Emergency marked as resolved',
      accessStatus: 'SUCCESS',
      status: 'SUCCESS',
      userId: resolvedByStaffId,
      userRole: 'staff',
    });
  }

  static async getActiveEmergencies(): Promise<any[]> {
    return await prisma.emergency.findMany({
      where: { status: 'ACTIVE' },
      include: {
        triggeredBy: {
          select: { firstName: true, lastName: true },
        },
        responders: {
          include: {
            staff: {
              select: { firstName: true, lastName: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}