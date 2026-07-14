import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private service: PatientsService) {}

  @Get()
  @RequirePermissions('patients:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('search')
  @RequirePermissions('patients:read')
  search(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.service.search(user.clinicId, q ?? '');
  }

  @Get(':id')
  @RequirePermissions('patients:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('patients:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.service.create(user.clinicId, dto);
  }

  @Put(':id')
  @RequirePermissions('patients:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.service.update(user.clinicId, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('patients:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, id);
  }

  @Get(':id/medical-records')
  @RequirePermissions('medical-records:read')
  medicalRecords(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.medicalRecords(user.clinicId, id);
  }

  @Get(':id/appointments')
  @RequirePermissions('appointments:read')
  appointments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.appointments(user.clinicId, id);
  }

  @Get(':id/billing')
  @RequirePermissions('billing:read')
  billing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.billing(user.clinicId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('patients:read')
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.timeline(user.clinicId, id);
  }
}
