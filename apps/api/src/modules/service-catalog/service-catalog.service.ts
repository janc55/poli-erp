import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service-catalog.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(clinicId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
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
      this.prisma.serviceCatalogItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.serviceCatalogItem.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(clinicId: string, id: string) {
    const item = await this.prisma.serviceCatalogItem.findFirst({
      where: { id, clinicId },
    });
    if (!item) throw new NotFoundException('Servicio no encontrado');
    return { success: true, data: item };
  }

  async create(clinicId: string, actorId: string, dto: CreateServiceDto) {
    const existing = await this.prisma.serviceCatalogItem.findFirst({
      where: { clinicId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Código ${dto.code} ya registrado`);
    }
    const item = await this.prisma.serviceCatalogItem.create({
      data: {
        clinicId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        price: dto.price,
      },
    });
    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'ServiceCatalogItem',
      entityId: item.id,
      newData: item,
    });
    return { success: true, data: item };
  }

  async update(clinicId: string, actorId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(clinicId, id);
    const updated = await this.prisma.serviceCatalogItem.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'ServiceCatalogItem',
      entityId: id,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivate(clinicId: string, actorId: string, id: string) {
    await this.findOne(clinicId, id);
    await this.prisma.serviceCatalogItem.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'ServiceCatalogItem',
      entityId: id,
    });
    return { success: true, message: 'Servicio desactivado' };
  }
}
