import * as path from 'path';

import { DataSource, type DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Core database options configuration
export const dbOptions: DataSourceOptions = {
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'relayflow',
      }),

  // Check env variable for synchronization (development/testing)
  synchronize: process.env.DB_SYNCHRONIZE === 'true',

  // Run migrations automatically on startup
  migrationsRun: true,

  // Custom naming strategy for clean PostgreSQL snake_case naming
  namingStrategy: new SnakeNamingStrategy(),

  // Load dynamic compiled TS/JS objects inside the monorepo scope
  entities: [path.join(__dirname, 'entities/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, 'subscribers/**/*.{ts,js}')],

  logging: process.env.DB_LOGGING === 'true',
};

const dataSource = new DataSource(dbOptions);
export default dataSource;
