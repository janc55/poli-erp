import { Injectable, NotFoundException } from '@nestjs/common';
import { PrescriptionStatus, Prisma } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreatePrescriptionDto } from './dto/prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(clinicId: string) {
    const data = await this.prisma.prescription.findMany({
      where: { medicalRecord: { clinicId } },
      include: {
        patient: { select: { firstName: true, lastName: true, dni: true } },
        doctor: { select: { firstName: true, lastName: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, data };
  }

  async findByPatient(patientId: string) {
    const data = await this.prisma.prescription.findMany({
      where: { patientId },
      include: {
        items: true,
        doctor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, medicalRecord: { clinicId } },
      include: {
        items: { include: { product: true } },
        patient: true,
        doctor: { select: { firstName: true, lastName: true } },
      },
    });
    if (!rx) throw new NotFoundException('Receta no encontrada');
    return { success: true, data: rx };
  }

  async create(clinicId: string, doctorId: string, dto: CreatePrescriptionDto) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: dto.medicalRecordId, clinicId },
    });
    if (!record) throw new NotFoundException('Historia clínica no encontrada');

    const qrCode = `RX-${Date.now()}-${record.patientId.slice(0, 6)}`;
    const prescription = await this.prisma.prescription.create({
      data: {
        medicalRecordId: dto.medicalRecordId,
        patientId: record.patientId,
        doctorId,
        qrCode,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      userId: doctorId,
      action: 'CREATE',
      entity: 'Prescription',
      entityId: prescription.id,
      newData: prescription,
    });

    return { success: true, data: prescription };
  }

  async dispense(clinicId: string, userId: string, id: string) {
    const rx = await this.findOne(clinicId, id);
    if (rx.data.status === PrescriptionStatus.DISPENSED) {
      return { success: false, message: 'Receta ya dispensada', data: rx.data };
    }
    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.DISPENSED },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Prescription',
      entityId: id,
      newData: { status: PrescriptionStatus.DISPENSED },
    });
    return { success: true, data: updated };
  }
}
