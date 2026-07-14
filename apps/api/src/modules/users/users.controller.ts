import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  AssignSpecialtiesDto,
  CreateUserDto,
  SetSchedulesDto,
  UpdateUserDto,
} from './dto/user.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../../shared/decorators/auth.decorators';
import { Role } from '@poli-erp/database';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('doctors')
  @RequirePermissions('users:read')
  doctors(@CurrentUser() user: AuthUser) {
    return this.service.findDoctors(user.clinicId);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('users:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('users:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, user.id, id);
  }

  @Patch(':id/activate')
  @RequirePermissions('users:write')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.activate(user.clinicId, user.id, id);
  }

  @Post(':id/specialties')
  @RequirePermissions('users:write')
  setSpecialties(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignSpecialtiesDto,
  ) {
    return this.service.setSpecialties(user.clinicId, user.id, id, dto.specialtyIds);
  }

  @Post(':id/schedules')
  @RequirePermissions('users:write')
  setSchedules(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetSchedulesDto,
  ) {
    return this.service.setSchedules(user.clinicId, user.id, id, dto.schedules);
  }
}
