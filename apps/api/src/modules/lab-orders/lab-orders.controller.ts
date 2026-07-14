import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LabOrdersService } from './lab-orders.service';
import {
  CreateLabOrderDto,
  RecordResultDto,
} from './dto/lab-order.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('lab-orders')
@ApiBearerAuth()
@Controller('lab-orders')
export class LabOrdersController {
  constructor(private service: LabOrdersService) {}

  @Get()
  @RequirePermissions('medical-records:read')
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.clinicId);
  }

  @Get('pending')
  @RequirePermissions('medical-records:read')
  pending(@CurrentUser() user: AuthUser) {
    return this.service.pending(user.clinicId);
  }

  @Get('exam-types')
  @RequirePermissions('medical-records:read')
  examTypes() {
    return this.service.examTypes();
  }

  @Get(':id')
  @RequirePermissions('medical-records:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('medical-records:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLabOrderDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Post(':id/results')
  @RequirePermissions('medical-records:write')
  recordResults(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordResultDto,
  ) {
    return this.service.recordResults(user.clinicId, user.id, id, dto);
  }
}
