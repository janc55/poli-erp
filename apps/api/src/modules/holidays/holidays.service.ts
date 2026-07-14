import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(clinicId: string, year?: number) {
    const start = year ? new Date(Date.UTC(year, 0, 1)) : undefined;
    const end = year ? new Date(Date.UTC(year + 1, 0, 1)) : undefined;

    const data = await this.prisma.holiday.findMany({
      where: {
        OR: [{ clinicId }, { clinicId: null }],
        ...(start && end && { date: { gte: start, lt: end } }),
      },
      orderBy: { date: 'asc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        id,
        OR: [{ clinicId }, { clinicId: null }],
      },
    });
    if (!holiday) throw new NotFoundException('Feriado no encontrado');
    return { success: true, data: holiday };
  }

  async create(actorId: string, dto: CreateHolidayDto) {
    const holiday = await this.prisma.holiday.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
        isRecurring: dto.isRecurring ?? false,
        clinicId: dto.clinicId ?? null,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'Holiday',
      entityId: holiday.id,
      newData: holiday,
    });
    return { success: true, data: holiday };
  }

  async update(clinicId: string, actorId: string, id: string, dto: UpdateHolidayDto) {
    const existing = await this.findOne(clinicId, id);

    const updated = await this.prisma.holiday.update({
      where: { id },
      data: {
        name: dto.name,
        date: dto.date ? new Date(dto.date) : undefined,
        isRecurring: dto.isRecurring,
        clinicId: dto.clinicId === undefined ? undefined : dto.clinicId,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async remove(clinicId: string, actorId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    await this.prisma.holiday.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: 'DELETE',
      entity: 'Holiday',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, message: 'Feriado eliminado' };
  }
}