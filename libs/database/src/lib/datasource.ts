import * as path from 'path';

import { DataSource, type DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Core database options configuration
export const dbOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'relayflow',
  
  // Production-grade safety rule: Always disable synchronize
  synchronize: false,
  
  // Custom naming strategy for clean PostgreSQL snake_case naming
  namingStrategy: new SnakeNamingStrategy(),
  
  // Load dynamic compiled TS/JS objects inside the monorepo scope
  entities: [path.join(__dirname, 'entities/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, 'subscribers/**/*.{ts,js}')],
  
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dbOptions);
export default dataSource;
