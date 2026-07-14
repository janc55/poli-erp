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
import { InventoryService } from './inventory.service';
import {
  CreateBatchDto,
  CreateMovementDto,
  CreateProductDto,
  CreateSupplierDto,
  UpdateProductDto,
} from './dto/inventory.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  // Products
  @Get('products')
  @RequirePermissions('inventory:read')
  findAllProducts(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAllProducts(user.clinicId, query);
  }

  @Get('products/low-stock')
  @RequirePermissions('inventory:read')
  lowStock(@CurrentUser() user: AuthUser) {
    return this.service.lowStock(user.clinicId);
  }

  @Get('products/expiring')
  @RequirePermissions('inventory:read')
  expiring(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.service.expiringSoon(user.clinicId, days ? parseInt(days, 10) : 30);
  }

  @Get('products/:id')
  @RequirePermissions('inventory:read')
  findProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findProduct(user.clinicId, id);
  }

  @Post('products')
  @RequirePermissions('inventory:write')
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.service.createProduct(user.clinicId, user.id, dto);
  }

  @Put('products/:id')
  @RequirePermissions('inventory:write')
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.updateProduct(user.clinicId, user.id, id, dto);
  }

  @Patch('products/:id/deactivate')
  @RequirePermissions('inventory:write')
  deactivateProduct(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateProduct(user.clinicId, user.id, id);
  }

  // Batches
  @Post('batches')
  @RequirePermissions('inventory:write')
  createBatch(@CurrentUser() user: AuthUser, @Body() dto: CreateBatchDto) {
    return this.service.createBatch(user.clinicId, user.id, dto);
  }

  // Movements
  @Post('movements')
  @RequirePermissions('inventory:write')
  createMovement(@CurrentUser() user: AuthUser, @Body() dto: CreateMovementDto) {
    return this.service.createMovement(user.clinicId, user.id, dto);
  }

  @Get('movements/product/:productId')
  @RequirePermissions('inventory:read')
  listMovements(@CurrentUser() user: AuthUser, @Param('productId') productId: string) {
    return this.service.listMovements(user.clinicId, productId);
  }

  // Suppliers
  @Get('suppliers')
  @RequirePermissions('inventory:read')
  listSuppliers() {
    return this.service.listSuppliers();
  }

  @Post('suppliers')
  @RequirePermissions('inventory:write')
  createSupplier(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(user.id, dto);
  }
}
