import { Request, Response } from 'express';

interface Visitor {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  relationship: string;
  patientId: number;
  wardId: number;
  checkInTime: Date;
  checkOutTime?: Date;
  purpose?: string;
  checkedInBy: string;
  status: 'ACTIVE' | 'CHECKED_OUT' | 'ARCHIVED';
}

export const getVisitors = async (req: Request, res: Response) => {
  try {
    // Mock data for demo purposes
    const mockVisitors = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Smith',
        phone: '555-0101',
        email: 'john.smith@email.com',
        relationship: 'Family',
        patientId: 1,
        patientName: 'Jane Doe',
        wardId: 1,
        wardName: 'W1',
        checkInTime: new Date().toISOString(),
        purpose: 'Family visit',
        checkedInBy: 'Security Staff',
        status: 'ACTIVE' as const,
      },
      {
        id: 2,
        firstName: 'Mary',
        lastName: 'Johnson',
        phone: '555-0102',
        relationship: 'Friend',
        patientId: 2,
        patientName: 'Bob Wilson',
        wardId: 2,
        wardName: 'W2',
        checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        purpose: 'Support visit',
        checkedInBy: 'Security Staff',
        status: 'ACTIVE' as const,
      },
    ];

    res.json(mockVisitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ message: 'Failed to fetch visitors' });
  }
};

export const checkInVisitor = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      relationship,
      patientId,
      purpose,
      checkedInBy,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !relationship || !patientId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Mock patient lookup to get ward info
    const mockPatient = {
      id: patientId,
      wardId: Math.floor(Math.random() * 10) + 1,
      wardName: `W${Math.floor(Math.random() * 10) + 1}`,
      firstName: 'Mock',
      lastName: 'Patient',
    };

    // Create mock visitor record
    const newVisitor = {
      id: Date.now(), // Simple ID generation for demo
      firstName,
      lastName,
      phone,
      email,
      relationship,
      patientId: parseInt(patientId),
      patientName: `${mockPatient.firstName} ${mockPatient.lastName}`,
      wardId: mockPatient.wardId,
      wardName: mockPatient.wardName,
      checkInTime: new Date().toISOString(),
      purpose,
      checkedInBy: checkedInBy || 'Security Staff',
      status: 'ACTIVE' as const,
    };

    res.status(201).json(newVisitor);
  } catch (error) {
    console.error('Error checking in visitor:', error);
    res.status(500).json({ message: 'Failed to check in visitor' });
  }
};

export const checkOutVisitor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Mock checkout - in real implementation, this would update the database
    const checkOutTime = new Date().toISOString();

    // Schedule archival after 24 hours (in real implementation, this would be a background job)
    setTimeout(() => {
      console.log(`Visitor ${id} would be archived now`);
      // archiveVisitor(id);
    }, 24 * 60 * 60 * 1000); // 24 hours

    res.json({
      id: parseInt(id),
      checkOutTime,
      status: 'CHECKED_OUT',
      message: 'Visitor checked out successfully. Will be archived in 24 hours.',
    });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    res.status(500).json({ message: 'Failed to check out visitor' });
  }
};

export const getPatients = async (req: Request, res: Response) => {
  try {
    // Mock patient data for visitor check-in
    const mockPatients = [
      {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        ward: { id: 1, wardName: 'W1' },
      },
      {
        id: 2,
        firstName: 'Bob',
        lastName: 'Wilson',
        ward: { id: 2, wardName: 'W2' },
      },
      {
        id: 3,
        firstName: 'Alice',
        lastName: 'Brown',
        ward: { id: 3, wardName: 'W3' },
      },
      {
        id: 4,
        firstName: 'Charlie',
        lastName: 'Davis',
        ward: { id: 1, wardName: 'W1' },
      },
    ];

    res.json(mockPatients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Failed to fetch patients' });
  }
};
