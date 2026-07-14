import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class RoomsService {
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
          { floor: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.consultationRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.consultationRoom.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(clinicId: string, id: string) {
    const room = await this.prisma.consultationRoom.findFirst({
      where: { id, clinicId },
    });
    if (!room) throw new NotFoundException('Consultorio no encontrado');
    return { success: true, data: room };
  }

  async create(clinicId: string, actorId: string, dto: CreateRoomDto) {
    const existing = await this.prisma.consultationRoom.findFirst({
      where: { clinicId, code: dto.code },
    });
    if (existing) throw new ConflictException('Código de consultorio ya registrado');

    const room = await this.prisma.consultationRoom.create({
      data: {
        clinicId,
        name: dto.name,
        code: dto.code,
        floor: dto.floor,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'ConsultationRoom',
      entityId: room.id,
      newData: room,
    });
    return { success: true, data: room };
  }

  async update(clinicId: string, actorId: string, id: string, dto: UpdateRoomDto) {
    const existing = await this.findOne(clinicId, id);

    if (dto.code && dto.code !== existing.data.code) {
      const dup = await this.prisma.consultationRoom.findFirst({
        where: { clinicId, code: dto.code, NOT: { id } },
      });
      if (dup) throw new ConflictException('Código de consultorio ya registrado');
    }

    const updated = await this.prisma.consultationRoom.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        floor: dto.floor,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'ConsultationRoom',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivate(clinicId: string, actorId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    await this.prisma.consultationRoom.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'ConsultationRoom',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, message: 'Consultorio desactivado' };
  }
}