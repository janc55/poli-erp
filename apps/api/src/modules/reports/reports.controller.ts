import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports:read')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.service.dashboard(user.clinicId);
  }

  @Get('appointments/by-date')
  @RequirePermissions('reports:read')
  byDate(
    @CurrentUser() user: AuthUser,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.service.byDateRange(
      user.clinicId,
      new Date(start),
      new Date(end),
      groupBy,
    );
  }

  @Get('doctors/productivity')
  @RequirePermissions('reports:read')
  doctorProductivity(
    @CurrentUser() user: AuthUser,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.doctorProductivity(
      user.clinicId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
  }

  @Get('financial')
  @RequirePermissions('reports:read')
  financial(
    @CurrentUser() user: AuthUser,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.service.financial(user.clinicId, new Date(start), new Date(end));
  }

  @Get('clinical')
  @RequirePermissions('reports:read')
  clinical(
    @CurrentUser() user: AuthUser,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.service.clinical(user.clinicId, new Date(start), new Date(end));
  }

  @Get('invoices')
  @RequirePermissions('reports:read')
  invoices(
    @CurrentUser() user: AuthUser,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.invoices(user.clinicId, {
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
    });
  }

  @Get('export/patients')
  @RequirePermissions('reports:export')
  exportPatients() {
    return {
      success: true,
      message: 'Exportar a Excel: ruta configurable - ver SPECS §2.7.5 (Excel, PDF, CSV)',
    };
  }
}
