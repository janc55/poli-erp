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
import { ServiceCatalogService } from './service-catalog.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service-catalog.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('service-catalog')
@ApiBearerAuth()
@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(private service: ServiceCatalogService) {}

  @Get()
  @RequirePermissions('billing:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get(':id')
  @RequirePermissions('billing:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('billing:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('billing:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.service.update(user.clinicId, user.id, id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('billing:write')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivate(user.clinicId, user.id, id);
  }
}
