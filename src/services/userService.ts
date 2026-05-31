import { queryDatabase } from '../config/database';
import { User } from '../models/userModel';

export const fetchUsers = async (): Promise<User[]> => {
  const result = await queryDatabase('SELECT id, name, email FROM users');
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
  }));
};
