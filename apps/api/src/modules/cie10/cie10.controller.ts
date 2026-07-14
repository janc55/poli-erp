import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Cie10Service } from './cie10.service';
import { BulkSeedCie10Dto } from './dto/cie10.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('cie10')
@ApiBearerAuth()
@Controller('cie10')
export class Cie10Controller {
  constructor(private service: Cie10Service) {}

  @Get()
  @RequirePermissions('cie10:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('search')
  @RequirePermissions('cie10:read')
  search(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.service.search(user.clinicId, q ?? '');
  }

  @Get(':id')
  @RequirePermissions('cie10:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('cie10:write')
  bulkSeed(@CurrentUser() user: AuthUser, @Body() dto: BulkSeedCie10Dto) {
    return this.service.bulkSeed(user.id, dto);
  }
}