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
import { MedicalRecordsService } from './medical-records.service';
import {
  CreateMedicalRecordDto,
  SignMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('medical-records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private service: MedicalRecordsService) {}

  @Get()
  @RequirePermissions('medical-records:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('patient/:patientId')
  @RequirePermissions('medical-records:read')
  findByPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.findByPatient(user.clinicId, patientId);
  }

  @Get(':id')
  @RequirePermissions('medical-records:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Get(':id/versions')
  @RequirePermissions('medical-records:read')
  versions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.versions(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('medical-records:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMedicalRecordDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('medical-records:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Patch(':id/sign')
  @RequirePermissions('medical-records:write')
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SignMedicalRecordDto,
  ) {
    return this.service.sign(user.clinicId, user.id, id, dto.signatureUrl);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('medical-records:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, user.id, id);
  }
}
