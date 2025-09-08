import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AttendanceScan } from './attendance/attendance-scan.entity';

// Note: Do not call config() here; let ConfigModule handle it in app.module.ts
export default new DataSource({
  type: 'postgres',
  host: process.env.PG_HOST, 
  port: 5433, 
  username: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  entities: [AttendanceScan],
  migrations: ['src/migrations/*.ts'],
  synchronize: true, 
  logging: true, 
});