import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  BillingStatus,
  QueueStatus,
} from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dashboard(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      appointmentsToday,
      patientsToday,
      waitingQueue,
      pendingBilling,
      todayRevenue,
      activeDoctors,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: { clinicId, dateTime: { gte: today, lt: tomorrow } },
      }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          dateTime: { gte: today, lt: tomorrow },
          status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.queueEntry.count({
        where: {
          status: QueueStatus.WAITING,
          appointment: { clinicId },
        },
      }),
      this.prisma.billing.count({
        where: { clinicId, status: BillingStatus.PENDING, isActive: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          billing: { clinicId },
          paidAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      this.prisma.user.count({
        where: {
          clinicId,
          isActive: true,
          role: { in: ['DOCTOR', 'NURSE'] },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        appointmentsToday,
        patientsToday,
        waitingQueue,
        pendingBilling,
        todayRevenue: Number(todayRevenue._sum.amount ?? 0),
        activeDoctors,
      },
    };
  }

  async byDateRange(
    clinicId: string,
    start: Date,
    end: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        dateTime: { gte: start, lt: end },
      },
      select: {
        dateTime: true,
        status: true,
        doctor: { select: { id: true, firstName: true, lastName: true } },
        specialty: { select: { name: true } },
      },
    });

    const buckets = new Map<string, { total: number; completed: number; cancelled: number; noShow: number }>();
    for (const a of appointments) {
      const key = this.formatKey(a.dateTime, groupBy);
      const b = buckets.get(key) ?? { total: 0, completed: 0, cancelled: 0, noShow: 0 };
      b.total++;
      if (a.status === AppointmentStatus.COMPLETED) b.completed++;
      if (a.status === AppointmentStatus.CANCELLED) b.cancelled++;
      if (a.status === AppointmentStatus.NO_SHOW) b.noShow++;
      buckets.set(key, b);
    }

    return {
      success: true,
      data: Array.from(buckets, ([key, value]) => ({ key, ...value })),
    };
  }

  async doctorProductivity(clinicId: string, start?: Date, end?: Date) {
    const where = {
      clinicId,
      ...(start && end && { dateTime: { gte: start, lt: end } }),
    };
    const data = await this.prisma.appointment.groupBy({
      by: ['doctorId'],
      where,
      _count: { _all: true },
    });
    const enriched = await Promise.all(
      data.map(async (d) => {
        const doctor = await this.prisma.user.findUnique({
          where: { id: d.doctorId },
          select: { firstName: true, lastName: true },
        });
        const completed = await this.prisma.appointment.count({
          where: { ...where, doctorId: d.doctorId, status: AppointmentStatus.COMPLETED },
        });
        return {
          doctorId: d.doctorId,
          doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : '',
          total: d._count._all,
          completed,
        };
      }),
    );
    return { success: true, data: enriched.sort((a, b) => b.total - a.total) };
  }

  async financial(clinicId: string, start: Date, end: Date) {
    const [revenue, byMethod] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          billing: { clinicId },
          paidAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: {
          billing: { clinicId },
          paidAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const pending = await this.prisma.billing.aggregate({
      where: {
        clinicId,
        isActive: true,
        status: { in: [BillingStatus.PENDING, BillingStatus.PARTIAL] },
        createdAt: { gte: start, lt: end },
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    return {
      success: true,
      data: {
        totalRevenue: Number(revenue._sum.amount ?? 0),
        paymentCount: revenue._count._all,
        pendingAmount: Number(pending._sum.total ?? 0),
        pendingCount: pending._count._all,
        byMethod: byMethod.map((m) => ({
          method: m.method,
          total: Number(m._sum.amount ?? 0),
          count: m._count._all,
        })),
      },
    };
  }

  async clinical(clinicId: string, start: Date, end: Date) {
    const topDiagnoses = await this.prisma.medicalRecordDiagnosis.groupBy({
      by: ['cie10CodeId'],
      where: {
        medicalRecord: {
          clinicId,
          visitDate: { gte: start, lt: end },
          isActive: true,
        },
      },
      _count: { _all: true },
      orderBy: { _count: { cie10CodeId: 'desc' } },
      take: 20,
    });
    const enriched = await Promise.all(
      topDiagnoses.map(async (d) => {
        const code = await this.prisma.cie10Code.findUnique({
          where: { id: d.cie10CodeId },
        });
        return {
          code: code?.code,
          description: code?.description,
          count: d._count._all,
        };
      }),
    );
    return { success: true, data: enriched };
  }

  async invoices(clinicId: string, query: { start?: Date; end?: Date }) {
    const where = {
      clinicId,
      isActive: true,
      ...(query.start && query.end && { createdAt: { gte: query.start, lt: query.end } }),
    };
    const data = await this.prisma.billing.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { success: true, data };
  }

  private formatKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    if (groupBy === 'day') return `${y}-${m}-${d}`;
    if (groupBy === 'month') return `${y}-${m}`;
    const week = Math.ceil(((date.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + 1) / 7);
    return `${y}-W${week.toString().padStart(2, '0')}`;
  }
}
