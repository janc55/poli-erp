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
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('specialties')
@ApiBearerAuth()
@Controller('specialties')
export class SpecialtiesController {
  constructor(private service: SpecialtiesService) {}

  @Get()
  @RequirePermissions('specialties:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('specialties:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('specialties:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSpecialtyDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('specialties:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('specialties:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, user.id, id);
  }
}