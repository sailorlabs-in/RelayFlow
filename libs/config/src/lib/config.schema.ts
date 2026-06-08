import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database Configurations
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('relayflow'),

  // Redis Configurations
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Auth JWT Configurations
  JWT_SECRET: z.string().default('relayflow-super-secret-key-12345'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Vibe Message Configurations
  VIBE_APP_ID: z.string().optional(),
  VIBE_SECRET_KEY: z.string().optional(),

  // SMTP Configurations
  SMTP_HOST: z.string().default('smtp.zoho.in'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .preprocess(
      (val) => val === 'true' || val === true || val === '465' || val === 465,
      z.boolean(),
    )
    .default(true),
  SMTP_USER: z.string().default('service@sailorlabs.in'),
  SMTP_PASS: z.string().default('Z69DGFnj4HRh'),

  // Frontend Configurations
  FRONTEND_URL: z.string().default('http://localhost:4000'),
});

export type Environment = z.infer<typeof environmentSchema>;
