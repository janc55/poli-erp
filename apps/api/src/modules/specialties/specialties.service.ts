import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(clinicId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      clinicId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { code: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.specialty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.specialty.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(clinicId: string, id: string) {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id, clinicId },
    });
    if (!specialty) throw new NotFoundException('Especialidad no encontrada');
    return { success: true, data: specialty };
  }

  async create(clinicId: string, actorId: string, dto: CreateSpecialtyDto) {
    const existing = await this.prisma.specialty.findFirst({
      where: { clinicId, code: dto.code },
    });
    if (existing) throw new ConflictException('Código de especialidad ya registrado');

    const specialty = await this.prisma.specialty.create({
      data: {
        clinicId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'Specialty',
      entityId: specialty.id,
      newData: specialty,
    });
    return { success: true, data: specialty };
  }

  async update(clinicId: string, actorId: string, id: string, dto: UpdateSpecialtyDto) {
    const existing = await this.findOne(clinicId, id);

    if (dto.code && dto.code !== existing.data.code) {
      const dup = await this.prisma.specialty.findFirst({
        where: { clinicId, code: dto.code, NOT: { id } },
      });
      if (dup) throw new ConflictException('Código de especialidad ya registrado');
    }

    const updated = await this.prisma.specialty.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Specialty',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivate(clinicId: string, actorId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    await this.prisma.specialty.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'Specialty',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, message: 'Especialidad desactivada' };
  }
}