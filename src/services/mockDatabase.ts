// Mock database service for demo purposes when PostgreSQL is not available
export class MockDatabaseService {
  static async query(text: string, params?: any[]): Promise<any> {
    console.log('Mock DB Query:', text, params);

    // Return mock data based on common queries
    if (text.includes('patient') && text.includes('count')) {
      return {
        rows: [{ count: 42 }],
        rowCount: 1,
      };
    }

    if (text.includes('ward') && text.includes('capacity')) {
      return {
        rows: [
          { ward_name: 'W1', capacity: 20, occupied: 15 },
          { ward_name: 'W2', capacity: 25, occupied: 18 },
        ],
        rowCount: 2,
      };
    }

    if (text.includes('staff') && text.includes('count')) {
      return {
        rows: [{ count: 156 }],
        rowCount: 1,
      };
    }

    if (text.includes('lab_test')) {
      return {
        rows: [
          { test_name: 'Blood Count', status: 'completed', result: 'Normal' },
          { test_name: 'X-Ray', status: 'pending', result: null },
        ],
        rowCount: 2,
      };
    }

    // Default mock response
    return {
      rows: [{ result: 'Mock data - database not connected' }],
      rowCount: 1,
    };
  }
}
