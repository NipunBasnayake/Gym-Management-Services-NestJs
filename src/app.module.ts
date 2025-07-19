import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './security/auth.module';
import { MembersModule } from './member/members.module';
import { NotificationsModule } from './notification/notifications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentModule } from './payment/payment.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (ConfigService: ConfigService) => ({
        type: 'postgres',
        host: ConfigService.get<string>('POSTGRES_HOST'),
        port: ConfigService.get<number>('POSTGRES_PORT'),
        username: ConfigService.get<string>('POSTGRES_USER'),
        password: ConfigService.get<string>('POSTGRES_PASSWORD'),
        database: ConfigService.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: true  // set false this an production deploy...
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    MembersModule,
    NotificationsModule,
    AttendanceModule,
    PaymentModule,
  ],
})
export class AppModule { }