import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, QueueStatus } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueueGateway } from './queue.gateway';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private gateway: QueueGateway,
  ) {}

  async list(clinicId: string, specialtyId?: string) {
    const data = await this.prisma.queueEntry.findMany({
      where: {
        appointment: { clinicId },
        ...(specialtyId && { specialtyId }),
        status: { in: [QueueStatus.WAITING, QueueStatus.IN_CONSULTATION] },
      },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, dni: true } },
            doctor: { select: { firstName: true, lastName: true } },
            specialty: true,
          },
        },
      },
      orderBy: [{ turnNumber: 'asc' }, { checkedInAt: 'asc' }],
    });

    // Cálculo de tiempos de espera estimados
    const now = Date.now();
    const enriched = data.map((entry) => {
      const waitingMs = now - entry.checkedInAt.getTime();
      const waitingMinutes = Math.max(0, Math.floor(waitingMs / 60_000));
      return { ...entry, waitingMinutes };
    });

    return { success: true, data: enriched };
  }

  async roomOccupancy(clinicId: string) {
    const rooms = await this.prisma.consultationRoom.findMany({
      where: { clinicId, isActive: true },
      include: {
        appointments: {
          where: {
            status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS] },
          },
          include: {
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const data = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      code: room.code,
      floor: room.floor,
      isOccupied: room.appointments.length > 0,
      current: room.appointments[0] ?? null,
    }));

    return { success: true, data };
  }

  async callNext(clinicId: string, queueEntryId: string) {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: { appointment: true },
    });
    if (!entry || entry.appointment.clinicId !== clinicId) {
      throw new NotFoundException('Turno no encontrado');
    }
    if (entry.status !== QueueStatus.WAITING) {
      return { success: true, data: entry };
    }

    const updated = await this.prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: { status: QueueStatus.IN_CONSULTATION, calledAt: new Date() },
    });
    await this.prisma.appointment.update({
      where: { id: entry.appointmentId },
      data: { status: AppointmentStatus.IN_PROGRESS },
    });

    this.gateway.emitQueueUpdate(clinicId, entry.specialtyId);
    return { success: true, data: updated };
  }

  async updateStatus(clinicId: string, queueEntryId: string, status: QueueStatus, _notes?: string) {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: { appointment: true },
    });
    if (!entry || entry.appointment.clinicId !== clinicId) {
      throw new NotFoundException('Turno no encontrado');
    }

    const updated = await this.prisma.queueEntry.update({
      where: { id: queueEntryId },
      data: {
        status,
        ...(status === QueueStatus.DONE && { completedAt: new Date() }),
      },
    });

    // Sincronizar estado de cita
    let appointmentStatus: AppointmentStatus | undefined;
    if (status === QueueStatus.DONE) appointmentStatus = AppointmentStatus.COMPLETED;
    if (status === QueueStatus.NO_SHOW) appointmentStatus = AppointmentStatus.NO_SHOW;
    if (appointmentStatus) {
      await this.prisma.appointment.update({
        where: { id: entry.appointmentId },
        data: { status: appointmentStatus },
      });
    }

    this.gateway.emitQueueUpdate(clinicId, entry.specialtyId);
    return { success: true, data: updated };
  }
}
