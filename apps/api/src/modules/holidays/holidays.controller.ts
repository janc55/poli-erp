import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('holidays')
@ApiBearerAuth()
@Controller('holidays')
export class HolidaysController {
  constructor(private service: HolidaysService) {}

  @Get()
  @RequirePermissions('holidays:read')
  findAll(@CurrentUser() user: AuthUser, @Query('year') year?: string) {
    const parsed = year ? Number(year) : undefined;
    return this.service.findAll(user.clinicId, parsed);
  }

  @Get(':id')
  @RequirePermissions('holidays:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('holidays:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHolidayDto) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('holidays:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('holidays:write')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.clinicId, user.id, id);
  }
}