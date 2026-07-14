import { Injectable, NotFoundException } from '@nestjs/common';
import { LabOrderStatus } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateLabOrderDto,
  RecordResultDto,
} from './dto/lab-order.dto';

@Injectable()
export class LabOrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(clinicId: string) {
    const data = await this.prisma.labOrder.findMany({
      where: { medicalRecord: { clinicId } },
      include: {
        items: { include: { examType: true } },
        patient: { select: { firstName: true, lastName: true, dni: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data };
  }

  async pending(clinicId: string) {
    const data = await this.prisma.labOrder.findMany({
      where: {
        medicalRecord: { clinicId },
        status: { in: [LabOrderStatus.REQUESTED, LabOrderStatus.IN_PROGRESS] },
      },
      include: {
        items: { include: { examType: true } },
        patient: { select: { firstName: true, lastName: true, dni: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id, medicalRecord: { clinicId } },
      include: {
        items: { include: { examType: true } },
        patient: true,
        doctor: { select: { firstName: true, lastName: true } },
      },
    });
    if (!order) throw new NotFoundException('Orden de laboratorio no encontrada');
    return { success: true, data: order };
  }

  async create(clinicId: string, doctorId: string, dto: CreateLabOrderDto) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: dto.medicalRecordId, clinicId },
    });
    if (!record) throw new NotFoundException('Historia clínica no encontrada');

    const order = await this.prisma.labOrder.create({
      data: {
        medicalRecordId: dto.medicalRecordId,
        patientId: record.patientId,
        doctorId,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            examTypeId: item.examTypeId,
          })),
        },
      },
      include: { items: true },
    });
    await this.audit.log({
      userId: doctorId,
      action: 'CREATE',
      entity: 'LabOrder',
      entityId: order.id,
      newData: order,
    });
    return { success: true, data: order };
  }

  async recordResults(
    clinicId: string,
    userId: string,
    id: string,
    dto: RecordResultDto,
  ) {
    await this.findOne(clinicId, id);
    for (const item of dto.items) {
      await this.prisma.labOrderItem.update({
        where: { id: item.examTypeId },
        data: {
          result: item.result as object | undefined,
          resultNotes: item.resultNotes,
          ...(item.result && { completedAt: new Date() }),
        },
      });
    }
    const allCompleted = await this.prisma.labOrderItem.findMany({
      where: { labOrderId: id },
    });
    const status = allCompleted.every((i) => i.completedAt)
      ? LabOrderStatus.COMPLETED
      : LabOrderStatus.IN_PROGRESS;
    const updated = await this.prisma.labOrder.update({
      where: { id },
      data: { status },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'LabOrder',
      entityId: id,
      newData: { status },
    });
    return { success: true, data: updated };
  }

  // Catálogo de exámenes
  async examTypes() {
    const data = await this.prisma.labExamType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  }

  async createExamType(name: string, code: string, category: string | undefined, price: number) {
    const data = await this.prisma.labExamType.create({
      data: { name, code, category, price },
    });
    return { success: true, data };
  }
}
