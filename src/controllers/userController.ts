import { Request, Response } from 'express';
import { fetchUsers } from '../services/userService';

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await fetchUsers();
  res.json(users);
};
