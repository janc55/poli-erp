import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class MedicalRecordsService {
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
      isActive: true,
      ...(query.search && {
        OR: [
          { patient: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { dni: { contains: query.search } } },
        ],
      }),
      ...(query.status && { status: query.status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dni: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          diagnoses: { include: { cie10Code: true } },
        },
        orderBy: { visitDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByPatient(clinicId: string, patientId: string) {
    const data = await this.prisma.medicalRecord.findMany({
      where: { patientId, clinicId, isActive: true },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
        diagnoses: { include: { cie10Code: true } },
      },
      orderBy: { visitDate: 'desc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id, clinicId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dni: true } },
        doctor: { select: { id: true, firstName: true, lastName: true } },
        diagnoses: { include: { cie10Code: true } },
        prescriptions: { include: { items: true } },
        labOrders: { include: { items: { include: { examType: true } } } },
      },
    });
    if (!record) throw new NotFoundException('Historia clínica no encontrada');
    return { success: true, data: record };
  }

  async versions(clinicId: string, id: string) {
    await this.findOne(clinicId, id);
    const data = await this.prisma.medicalRecordVersion.findMany({
      where: { medicalRecordId: id },
      include: {
        changedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { version: 'desc' },
    });
    return { success: true, data };
  }

  async create(clinicId: string, doctorId: string, dto: CreateMedicalRecordDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const record = await this.prisma.medicalRecord.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        doctorId,
        appointmentId: dto.appointmentId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : new Date(),
        reason: dto.reason,
        anamnesis: dto.anamnesis,
        personalHistory: dto.personalHistory,
        familyHistory: dto.familyHistory,
        allergies: dto.allergies,
        medications: dto.medications,
        physicalExam: dto.physicalExam,
        vitalSigns: (dto.vitalSigns ?? undefined) as object | undefined,
        treatment: dto.treatment,
        notes: dto.notes,
        diagnoses: dto.diagnoses
          ? {
              create: dto.diagnoses.map((d) => ({
                cie10CodeId: d.cie10CodeId,
                isPrimary: d.isPrimary ?? false,
                notes: d.notes,
              })),
            }
          : undefined,
      },
      include: {
        diagnoses: { include: { cie10Code: true } },
      },
    });

    // Si hay appointmentId, marcar la cita como completada
    if (dto.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: dto.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    await this.audit.log({
      userId: doctorId,
      action: 'CREATE',
      entity: 'MedicalRecord',
      entityId: record.id,
      newData: record,
    });

    return { success: true, data: record };
  }

  async update(clinicId: string, userId: string, id: string, dto: UpdateMedicalRecordDto) {
    const existing = await this.findOne(clinicId, id);

    // Snapshot versión anterior
    const lastVersion = await this.prisma.medicalRecordVersion.findFirst({
      where: { medicalRecordId: id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await this.prisma.medicalRecordVersion.create({
      data: {
        medicalRecordId: id,
        version: nextVersion,
        snapshot: existing.data as object,
        changedById: userId,
        changeReason: 'Actualización',
      },
    });

    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data: {
        reason: dto.reason,
        anamnesis: dto.anamnesis,
        personalHistory: dto.personalHistory,
        familyHistory: dto.familyHistory,
        allergies: dto.allergies,
        medications: dto.medications,
        physicalExam: dto.physicalExam,
        vitalSigns: (dto.vitalSigns ?? undefined) as object | undefined,
        treatment: dto.treatment,
        notes: dto.notes,
      },
    });

    // Reemplazar diagnósticos
    if (dto.diagnoses) {
      await this.prisma.medicalRecordDiagnosis.deleteMany({
        where: { medicalRecordId: id },
      });
      if (dto.diagnoses.length > 0) {
        await this.prisma.medicalRecordDiagnosis.createMany({
          data: dto.diagnoses.map((d) => ({
            medicalRecordId: id,
            cie10CodeId: d.cie10CodeId,
            isPrimary: d.isPrimary ?? false,
            notes: d.notes,
          })),
        });
      }
    }

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'MedicalRecord',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });

    return { success: true, data: updated, version: nextVersion };
  }

  async sign(clinicId: string, userId: string, id: string, signatureUrl: string) {
    const existing = await this.findOne(clinicId, id);
    if (existing.data.signedAt) {
      return { success: false, message: 'Ya firmada', data: existing.data };
    }
    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data: { signedAt: new Date(), signatureUrl },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'MedicalRecord',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivate(clinicId: string, userId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.audit.log({
      userId,
      action: 'DEACTIVATE',
      entity: 'MedicalRecord',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, data: updated };
  }
}
