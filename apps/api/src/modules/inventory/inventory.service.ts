import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateBatchDto,
  CreateMovementDto,
  CreateProductDto,
  CreateSupplierDto,
  UpdateProductDto,
} from './dto/inventory.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Products ─────────────────────────────────────────────

  async findAllProducts(clinicId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      clinicId,
      isActive: true,
      ...(query.search && {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' as const } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { supplier: true, batches: { take: 5 } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findProduct(clinicId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, clinicId },
      include: {
        supplier: true,
        batches: { orderBy: { expiryDate: 'asc' } },
        movements: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return { success: true, data: product };
  }

  async lowStock(clinicId: string) {
    const products = await this.prisma.product.findMany({
      where: { clinicId, isActive: true },
      include: { supplier: true },
    });
    const data = products.filter((p) => p.stock <= p.minStock);
    return { success: true, data };
  }

  async expiringSoon(clinicId: string, days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const batches = await this.prisma.productBatch.findMany({
      where: {
        expiryDate: { lte: future, gte: new Date() },
        product: { clinicId, isActive: true },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
    return { success: true, data: batches };
  }

  async createProduct(clinicId: string, userId: string, dto: CreateProductDto) {
    let code = dto.code;
    if (!code) {
      const count = await this.prisma.product.count({ where: { clinicId } });
      code = `P-${(count + 1).toString().padStart(5, '0')}`;
    }
    const product = await this.prisma.product.create({
      data: {
        clinicId,
        code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        supplierId: dto.supplierId,
        manufacturer: dto.manufacturer,
        presentation: dto.presentation,
        concentration: dto.concentration,
        unit: dto.unit,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        stock: dto.stock,
        minStock: dto.minStock,
        maxStock: dto.maxStock ?? 1000,
        location: dto.location,
      },
    });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      newData: product,
    });
    return { success: true, data: product };
  }

  async updateProduct(clinicId: string, userId: string, id: string, dto: UpdateProductDto) {
    await this.findProduct(clinicId, id);
    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivateProduct(clinicId: string, userId: string, id: string) {
    await this.findProduct(clinicId, id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId,
      action: 'DEACTIVATE',
      entity: 'Product',
      entityId: id,
    });
    return { success: true, message: 'Producto desactivado' };
  }

  // ─── Batches ──────────────────────────────────────────────

  async createBatch(clinicId: string, userId: string, dto: CreateBatchDto) {
    await this.findProduct(clinicId, dto.productId);
    const batch = await this.prisma.productBatch.create({
      data: {
        productId: dto.productId,
        batch: dto.batch,
        expiryDate: new Date(dto.expiryDate),
        quantity: dto.quantity,
      },
    });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'ProductBatch',
      entityId: batch.id,
      newData: batch,
    });
    return { success: true, data: batch };
  }

  // ─── Movements ────────────────────────────────────────────

  async createMovement(clinicId: string, userId: string, dto: CreateMovementDto) {
    const product = await this.findProduct(clinicId, dto.productId);
    const p = product.data;

    let newStock = p.stock;
    if (dto.type === InventoryMovementType.IN) newStock += dto.quantity;
    else if (dto.type === InventoryMovementType.OUT) newStock -= dto.quantity;
    else if (dto.type === InventoryMovementType.ADJUSTMENT) newStock = dto.quantity;
    else if (dto.type === InventoryMovementType.RETURN) newStock += dto.quantity;

    if (newStock < 0) {
      throw new ConflictException('Stock insuficiente');
    }

    const [movement, productUpdated] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: {
          productId: dto.productId,
          batchId: dto.batchId,
          userId,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          reference: dto.reference,
        },
      }),
      this.prisma.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      }),
    ]);

    if (dto.batchId) {
      const batch = await this.prisma.productBatch.findUnique({
        where: { id: dto.batchId },
      });
      if (batch) {
        const newBatchStock = dto.type === InventoryMovementType.IN
          ? batch.quantity + dto.quantity
          : dto.type === InventoryMovementType.OUT
            ? batch.quantity - dto.quantity
            : dto.quantity;
        await this.prisma.productBatch.update({
          where: { id: dto.batchId },
          data: { quantity: newBatchStock },
        });
      }
    }

    await this.audit.log({
      userId,
      action: 'OTHER',
      entity: 'InventoryMovement',
      entityId: movement.id,
      newData: movement,
    });

    return { success: true, data: { movement, product: productUpdated } };
  }

  async listMovements(clinicId: string, productId: string) {
    await this.findProduct(clinicId, productId);
    const data = await this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data };
  }

  // ─── Suppliers ────────────────────────────────────────────

  async listSuppliers() {
    const data = await this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  }

  async createSupplier(userId: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({ data: dto });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      newData: supplier,
    });
    return { success: true, data: supplier };
  }
}
