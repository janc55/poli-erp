import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuditModule } from './shared/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { BillingModule } from './modules/billing/billing.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { QueueModule } from './modules/queue/queue.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { Cie10Module } from './modules/cie10/cie10.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { CashSessionsModule } from './modules/cash-sessions/cash-sessions.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { LabOrdersModule } from './modules/lab-orders/lab-orders.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { HealthController } from './shared/health/health.controller';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get('RATE_LIMIT_TTL', 60)) * 1000,
          limit: config.get('RATE_LIMIT_MAX', 100),
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    SpecialtiesModule,
    RoomsModule,
    HolidaysModule,
    Cie10Module,
    InsuranceModule,
    PatientsModule,
    AppointmentsModule,
    QueueModule,
    MedicalRecordsModule,
    BillingModule,
    CashSessionsModule,
    DocumentsModule,
    PrescriptionsModule,
    LabOrdersModule,
    ServiceCatalogModule,
    UsersModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
