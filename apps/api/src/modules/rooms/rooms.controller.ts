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
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private service: RoomsService) {}

  @Get()
  @RequirePermissions('rooms:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('rooms:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('rooms:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('rooms:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('rooms:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, user.id, id);
  }
}