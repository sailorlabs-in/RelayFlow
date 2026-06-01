import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('✔ Initializing Database connection pool...');
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    this.logger.log('✔ Database connection pool initialized successfully.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('✔ Closing Database connection pool...');
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
    this.logger.log('✔ Database connection pool closed.');
  }

  /**
   * Performs a simple SELECT 1 query to verify database connection health.
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('❌ Database health check failed', error);
      return false;
    }
  }

  /**
   * Retrieves the raw underlying DataSource instance.
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
