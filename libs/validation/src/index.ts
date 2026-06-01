import { z } from 'zod';

export const idSchema = z.string().uuid();

export function validateUuid(id: string): boolean {
  return idSchema.safeParse(id).success;
}
