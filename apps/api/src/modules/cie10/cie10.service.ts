import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { BulkSeedCie10Dto } from './dto/cie10.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class Cie10Service {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(_clinicId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.Cie10CodeWhereInput = {
      isActive: true,
      ...(query.search && {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.cie10Code.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.cie10Code.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(_clinicId: string, id: string) {
    const code = await this.prisma.cie10Code.findFirst({ where: { id } });
    if (!code) throw new NotFoundException('Código CIE-10 no encontrado');
    return { success: true, data: code };
  }

  async search(_clinicId: string, q: string) {
    const data = await this.prisma.cie10Code.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      },
      take: 20,
      orderBy: { code: 'asc' },
    });
    return { success: true, data };
  }

  async bulkSeed(actorId: string, dto: BulkSeedCie10Dto) {
    const result = await this.prisma.cie10Code.createMany({
      data: dto.codes.map((c) => ({
        code: c.code,
        description: c.description,
        category: c.category,
      })),
      skipDuplicates: true,
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'Cie10Code',
      newData: { count: result.count, received: dto.codes.length },
    });

    return {
      success: true,
      data: { inserted: result.count, skipped: dto.codes.length - result.count },
      message: 'Carga masiva completada',
    };
  }
}