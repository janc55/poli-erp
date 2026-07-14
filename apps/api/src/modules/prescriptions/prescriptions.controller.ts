import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private service: PrescriptionsService) {}

  @Get()
  @RequirePermissions('medical-records:read')
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.clinicId);
  }

  @Get('patient/:patientId')
  @RequirePermissions('medical-records:read')
  byPatient(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Get(':id')
  @RequirePermissions('medical-records:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('medical-records:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePrescriptionDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Post(':id/dispense')
  @RequirePermissions('inventory:write')
  dispense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.dispense(user.clinicId, user.id, id);
  }
}
