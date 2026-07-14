import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateUserDto,
  DoctorScheduleDto,
  UpdateUserDto,
} from './dto/user.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { Role } from '@poli-erp/database';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
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
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { dni: { contains: query.search } },
        ],
      }),
      ...(query.status === 'active' && { isActive: true }),
      ...(query.status === 'inactive' && { isActive: false }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          profile: true,
          doctorSpecialties: { include: { specialty: true } },
        },
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findDoctors(clinicId: string) {
    const data = await this.prisma.user.findMany({
      where: {
        clinicId,
        isActive: true,
        role: { in: [Role.DOCTOR, Role.NURSE] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        doctorSpecialties: { include: { specialty: true } },
        doctorSchedules: { where: { isActive: true } },
      },
      orderBy: { lastName: 'asc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, clinicId },
      include: {
        profile: true,
        doctorSpecialties: { include: { specialty: true } },
        doctorSchedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password: _, ...safe } = user;
    return { success: true, data: safe };
  }

  async create(clinicId: string, actorId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { dni: dto.dni }] },
    });
    if (existing) throw new ConflictException('Email o DNI ya registrados');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        clinicId,
        email: dto.email,
        password: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dni: dto.dni,
        phone: dto.phone,
        role: dto.role ?? Role.RECEPTION,
        profile: {
          create: {
            title: dto.title,
            licenseNumber: dto.licenseNumber,
          },
        },
        ...(dto.specialtyIds?.length && {
          doctorSpecialties: {
            create: dto.specialtyIds.map((sid) => ({ specialtyId: sid })),
          },
        }),
        ...(dto.schedules?.length && {
          doctorSchedules: {
            create: dto.schedules.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              slotMinutes: s.slotMinutes ?? 30,
            })),
          },
        }),
      },
      include: { profile: true },
    });

    const { password: _, ...safe } = user;
    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      newData: safe,
    });
    return { success: true, data: safe };
  }

  async update(clinicId: string, actorId: string, id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(clinicId, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        profile: {
          upsert: {
            create: {
              title: dto.title,
              licenseNumber: dto.licenseNumber,
              biography: dto.biography,
            },
            update: {
              title: dto.title,
              licenseNumber: dto.licenseNumber,
              biography: dto.biography,
            },
          },
        },
      },
      include: { profile: true },
    });

    if (dto.specialtyIds) {
      await this.setSpecialties(clinicId, actorId, id, dto.specialtyIds);
    }

    const { password: _, ...safe } = updated;
    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldData: existing.data,
      newData: safe,
    });
    return { success: true, data: safe };
  }

  async deactivate(clinicId: string, actorId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'User',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, message: 'Usuario desactivado' };
  }

  async activate(clinicId: string, actorId: string, id: string) {
    const updated = await this.prisma.user.update({
      where: { id, clinicId },
      data: { isActive: true, deletedAt: null },
    });
    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      newData: { isActive: true },
    });
    return { success: true, data: { id: updated.id, isActive: updated.isActive } };
  }

  async setSpecialties(clinicId: string, actorId: string, userId: string, specialtyIds: string[]) {
    const user = await this.findOne(clinicId, userId);
    await this.prisma.doctorSpecialty.deleteMany({ where: { doctorId: userId } });
    if (specialtyIds.length) {
      await this.prisma.doctorSpecialty.createMany({
        data: specialtyIds.map((sid) => ({ doctorId: userId, specialtyId: sid })),
      });
    }
    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'User.specialties',
      entityId: userId,
      oldData: user.data.doctorSpecialties,
      newData: { specialtyIds },
    });
    return { success: true, data: { specialtyIds } };
  }

  async setSchedules(clinicId: string, actorId: string, userId: string, schedules: DoctorScheduleDto[]) {
    const user = await this.findOne(clinicId, userId);
    await this.prisma.doctorSchedule.deleteMany({ where: { doctorId: userId } });
    if (schedules.length) {
      await this.prisma.doctorSchedule.createMany({
        data: schedules.map((s) => ({
          doctorId: userId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotMinutes: s.slotMinutes ?? 30,
        })),
      });
    }
    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'User.schedules',
      entityId: userId,
      newData: { schedules },
    });
    return { success: true, data: { count: schedules.length } };
  }
}
