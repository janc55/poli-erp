import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  @Get()
  @RequirePermissions('appointments:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('availability')
  @RequirePermissions('appointments:read')
  availability(
    @CurrentUser() user: AuthUser,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.service.getAvailability(user.clinicId, doctorId, date);
  }

  @Get('waiting-list')
  @RequirePermissions('appointments:read')
  waitingList(@CurrentUser() user: AuthUser) {
    return this.service.getWaitingList(user.clinicId);
  }

  @Get('today')
  @RequirePermissions('appointments:read')
  today(@CurrentUser() user: AuthUser) {
    return this.service.getToday(user.clinicId);
  }

  @Get('doctor/:doctorId')
  @RequirePermissions('appointments:read')
  byDoctor(@CurrentUser() user: AuthUser, @Param('doctorId') doctorId: string) {
    return this.service.byDoctor(user.clinicId, doctorId);
  }

  @Get(':id')
  @RequirePermissions('appointments:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('appointments:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('appointments:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.service.update(user.clinicId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('appointments:write')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.service.cancel(user.clinicId, id, dto.reason);
  }

  @Post(':id/reschedule')
  @RequirePermissions('appointments:write')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.service.reschedule(user.clinicId, id, dto);
  }

  @Post(':id/check-in')
  @RequirePermissions('appointments:write')
  checkIn(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.checkIn(user.clinicId, id);
  }

  @Post(':id/confirm')
  @RequirePermissions('appointments:write')
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.confirm(user.clinicId, id);
  }
}
