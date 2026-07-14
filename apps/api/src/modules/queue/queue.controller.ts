import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QueueStatus } from '@poli-erp/database';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateQueueStatusDto {
  @ApiPropertyOptional({ enum: QueueStatus })
  @IsEnum(QueueStatus)
  status!: QueueStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('queue')
@ApiBearerAuth()
@Controller('queue')
export class QueueController {
  constructor(private service: QueueService) {}

  @Get()
  @RequirePermissions('appointments:read')
  list(@CurrentUser() user: AuthUser, @Query('specialtyId') specialtyId?: string) {
    return this.service.list(user.clinicId, specialtyId);
  }

  @Get('occupancy')
  @RequirePermissions('appointments:read')
  occupancy(@CurrentUser() user: AuthUser) {
    return this.service.roomOccupancy(user.clinicId);
  }

  @Post(':id/call')
  @RequirePermissions('appointments:write')
  call(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.callNext(user.clinicId, id);
  }

  @Post(':id/complete')
  @RequirePermissions('appointments:write')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQueueStatusDto,
  ) {
    return this.service.updateStatus(user.clinicId, id, QueueStatus.DONE, dto.notes);
  }

  @Patch(':id/status')
  @RequirePermissions('appointments:write')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQueueStatusDto,
  ) {
    return this.service.updateStatus(user.clinicId, id, dto.status, dto.notes);
  }

  @Post(':id/no-show')
  @RequirePermissions('appointments:write')
  noShow(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQueueStatusDto,
  ) {
    return this.service.updateStatus(user.clinicId, id, QueueStatus.NO_SHOW, dto.notes);
  }
}
