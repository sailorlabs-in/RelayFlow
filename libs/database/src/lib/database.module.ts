import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseService } from './database.service';
import { dbOptions } from './datasource';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dbOptions,
      autoLoadEntities: true, // Seamless local feature loading support
    }),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}
