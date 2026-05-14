import { z } from 'zod';

export const sessionCreateBodySchema = z.object({
  sport: z.string().trim().min(1).max(120),
  participantsNeeded: z.number().int().min(1).max(10_000),
  scheduledAt: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(10_000),
  skillLevel: z.string().trim().max(80).optional(),
});

export const sessionUpdateBodySchema = z.object({
  sport: z.string().trim().min(1).max(120).optional(),
  participantsNeeded: z.number().int().min(1).max(10_000).optional(),
  scheduledAt: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(10_000).optional(),
  skillLevel: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
});
