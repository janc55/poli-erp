import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, AppointmentType, QueueStatus } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueueGateway } from '../queue/queue.gateway';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private queueGateway: QueueGateway,
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
          { patient: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { dni: { contains: query.search } } },
        ],
      }),
      ...(query.status && { status: query.status as AppointmentStatus }),
    };

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dni: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          specialty: true,
          queueEntry: true,
        },
        orderBy: { dateTime: 'asc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(clinicId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        doctor: { select: { id: true, firstName: true, lastName: true, email: true } },
        specialty: true,
        room: true,
        queueEntry: true,
        medicalRecord: { select: { id: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    return { success: true, data: appointment };
  }

  async create(clinicId: string, userId: string, dto: CreateAppointmentDto) {
    // Verificar disponibilidad
    await this.checkSlotAvailability(
      clinicId,
      dto.doctorId,
      dto.dateTime,
      dto.duration ?? 30,
      dto.roomId,
    );

    const appointment = await this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        specialtyId: dto.specialtyId,
        roomId: dto.roomId,
        dateTime: new Date(dto.dateTime),
        duration: dto.duration ?? 30,
        type: dto.type ?? AppointmentType.IN_PERSON,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Appointment',
      entityId: appointment.id,
      newData: appointment,
    });

    return { success: true, data: appointment };
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findOne(clinicId, id);
    if (existing.data.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede modificar una cita cancelada');
    }
    if (dto.dateTime && dto.doctorId) {
      await this.checkSlotAvailability(
        clinicId,
        dto.doctorId,
        dto.dateTime,
        dto.duration ?? existing.data.duration,
        dto.roomId ?? existing.data.roomId ?? undefined,
        id,
      );
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dateTime && { dateTime: new Date(dto.dateTime) }),
      },
    });
    return { success: true, data: updated };
  }

  async cancel(clinicId: string, id: string, reason: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('La cita ya está cancelada');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
      },
    });
    return { success: true, data: updated };
  }

  async reschedule(clinicId: string, id: string, dto: RescheduleAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, clinicId },
    });
    if (!existing) throw new NotFoundException('Cita no encontrada');
    if (existing.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede reprogramar una cita cancelada');
    }

    await this.checkSlotAvailability(
      clinicId,
      existing.doctorId,
      dto.newDateTime,
      existing.duration,
      existing.roomId ?? undefined,
      id,
    );

    const newAppointment = await this.prisma.appointment.create({
      data: {
        clinicId: existing.clinicId,
        patientId: existing.patientId,
        doctorId: existing.doctorId,
        specialtyId: existing.specialtyId,
        roomId: existing.roomId,
        dateTime: new Date(dto.newDateTime),
        duration: existing.duration,
        type: existing.type,
        reason: existing.reason,
        notes: existing.notes,
        rescheduledFromId: existing.id,
      },
    });

    await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED, cancellationReason: `Reprogramada → ${newAppointment.id}` },
    });

    return { success: true, data: newAppointment };
  }

  async checkIn(clinicId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      include: { queueEntry: true },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada');
    if (appointment.queueEntry) {
      throw new BadRequestException('La cita ya tiene check-in registrado');
    }

    const lastTurn = await this.prisma.queueEntry.findFirst({
      where: { specialtyId: appointment.specialtyId },
      orderBy: { turnNumber: 'desc' },
    });

    const turnNumber = (lastTurn?.turnNumber ?? 0) + 1;

    const [updated, queueEntry] = await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CHECKED_IN },
      }),
      this.prisma.queueEntry.create({
        data: {
          appointmentId,
          turnNumber,
          specialtyId: appointment.specialtyId,
          status: QueueStatus.WAITING,
        },
      }),
    ]);

    this.queueGateway.emitQueueUpdate(clinicId, appointment.specialtyId);

    return { success: true, data: { appointment: updated, queueEntry } };
  }

  async confirm(clinicId: string, id: string) {
    const updated = await this.prisma.appointment.update({
      where: { id, clinicId },
      data: { status: AppointmentStatus.CONFIRMED },
    });
    return { success: true, data: updated };
  }

  async getAvailability(clinicId: string, doctorId: string, date: string) {
    if (!doctorId || !date) {
      throw new BadRequestException('doctorId y date son requeridos');
    }
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [schedules, booked, holidays] = await Promise.all([
      this.prisma.doctorSchedule.findMany({
        where: { doctorId, isActive: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          clinicId,
          dateTime: { gte: dayStart, lt: dayEnd },
          status: { not: AppointmentStatus.CANCELLED },
        },
        select: { id: true, dateTime: true, duration: true },
      }),
      this.prisma.holiday.findMany({
        where: {
          date: { gte: dayStart, lt: dayEnd },
          OR: [{ clinicId: null }, { clinicId }],
        },
      }),
    ]);

    const dayOfWeek = dayStart.getDay();
    const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
    const isHoliday = holidays.length > 0;

    return {
      success: true,
      data: {
        date,
        isHoliday,
        doctorId,
        schedules: daySchedules,
        bookedAppointments: booked,
      },
    };
  }

  async getWaitingList(clinicId: string) {
    const data = await this.prisma.queueEntry.findMany({
      where: {
        status: { in: [QueueStatus.WAITING, QueueStatus.IN_CONSULTATION] },
        appointment: { clinicId },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true, dni: true } },
            specialty: true,
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });
    return { success: true, data };
  }

  async getToday(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        dateTime: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
        doctor: { select: { firstName: true, lastName: true } },
        specialty: true,
        queueEntry: true,
      },
      orderBy: { dateTime: 'asc' },
    });

    const summary = {
      total: data.length,
      scheduled: data.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
      confirmed: data.filter((a) => a.status === AppointmentStatus.CONFIRMED).length,
      checkedIn: data.filter((a) => a.status === AppointmentStatus.CHECKED_IN).length,
      inProgress: data.filter((a) => a.status === AppointmentStatus.IN_PROGRESS).length,
      completed: data.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
      cancelled: data.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
      noShow: data.filter((a) => a.status === AppointmentStatus.NO_SHOW).length,
    };

    return { success: true, data, summary };
  }

  async byDoctor(clinicId: string, doctorId: string) {
    const data = await this.prisma.appointment.findMany({
      where: { doctorId, clinicId },
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
        specialty: true,
      },
      orderBy: { dateTime: 'desc' },
      take: 100,
    });
    return { success: true, data };
  }

  private async checkSlotAvailability(
    clinicId: string,
    doctorId: string,
    dateTime: string,
    duration: number,
    roomId?: string,
    excludeAppointmentId?: string,
  ) {
    const start = new Date(dateTime);
    const end = new Date(start.getTime() + duration * 60_000);

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        clinicId,
        doctorId,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        dateTime: { lt: end },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
        // Slot termina después del inicio
        // Como no hay campo endTime, validamos con solapamiento por inicio+duration
      },
    });

    // Validación manual de solapamiento
    if (conflict) {
      const conflictEnd = new Date(conflict.dateTime.getTime() + conflict.duration * 60_000);
      const overlaps = start < conflictEnd && end > conflict.dateTime;
      if (overlaps) {
        throw new ConflictException('El médico ya tiene una cita en ese horario');
      }
    }

    if (roomId) {
      const roomConflict = await this.prisma.appointment.findFirst({
        where: {
          clinicId,
          roomId,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
          dateTime: { lt: end },
          ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
        },
      });
      if (roomConflict) {
        const conflictEnd = new Date(roomConflict.dateTime.getTime() + roomConflict.duration * 60_000);
        const overlaps = start < conflictEnd && end > roomConflict.dateTime;
        if (overlaps) {
          throw new ConflictException('El consultorio ya está ocupado en ese horario');
        }
      }
    }
  }
}
