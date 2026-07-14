import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class PatientsService {
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
          { dni: { contains: query.search, mode: 'insensitive' as const } },
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.sortBy && {
        orderBy: { [query.sortBy]: query.sortOrder ?? 'asc' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async search(clinicId: string, q: string) {
    if (!q?.trim()) return { success: true, data: [] };
    const data = await this.prisma.patient.findMany({
      where: {
        clinicId,
        isActive: true,
        OR: [
          { dni: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { lastName: 'asc' },
    });
    return { success: true, data };
  }

  async findOne(clinicId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        notificationPreferences: true,
        patientInsurances: { include: { insuranceProvider: true } },
      },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return { success: true, data: patient };
  }

  async create(clinicId: string, dto: CreatePatientDto) {
    const existing = await this.prisma.patient.findFirst({
      where: { clinicId, dni: dto.dni },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un paciente con DNI ${dto.dni}`);
    }
    const patient = await this.prisma.patient.create({
      data: {
        clinicId,
        ...dto,
        birthDate: new Date(dto.birthDate),
        notificationPreferences: { create: {} },
      },
    });
    return { success: true, data: patient };
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto) {
    const existing = await this.findOne(clinicId, id);
    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
      },
    });
    await this.audit.log({
      userId: '',
      action: 'UPDATE',
      entity: 'Patient',
      entityId: id,
      oldData: existing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivate(clinicId: string, id: string) {
    const existing = await this.findOne(clinicId, id);
    await this.prisma.patient.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.audit.log({
      userId: '',
      action: 'DEACTIVATE',
      entity: 'Patient',
      entityId: id,
      oldData: existing.data,
    });
    return { success: true, message: 'Paciente desactivado' };
  }

  async medicalRecords(clinicId: string, patientId: string) {
    await this.findOne(clinicId, patientId);
    const data = await this.prisma.medicalRecord.findMany({
      where: { patientId, isActive: true },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
        diagnoses: { include: { cie10Code: true } },
      },
      orderBy: { visitDate: 'desc' },
    });
    return { success: true, data };
  }

  async appointments(clinicId: string, patientId: string) {
    await this.findOne(clinicId, patientId);
    const data = await this.prisma.appointment.findMany({
      where: { patientId, clinicId },
      include: {
        doctor: { select: { firstName: true, lastName: true } },
        specialty: true,
      },
      orderBy: { dateTime: 'desc' },
    });
    return { success: true, data };
  }

  async billing(clinicId: string, patientId: string) {
    await this.findOne(clinicId, patientId);
    const data = await this.prisma.billing.findMany({
      where: { patientId, clinicId },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async timeline(clinicId: string, patientId: string) {
    await this.findOne(clinicId, patientId);

    const [appointments, records, billings] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId, clinicId },
        select: {
          id: true,
          dateTime: true,
          status: true,
          doctor: { select: { firstName: true, lastName: true } },
          specialty: { select: { name: true } },
        },
        orderBy: { dateTime: 'desc' },
        take: 50,
      }),
      this.prisma.medicalRecord.findMany({
        where: { patientId, isActive: true },
        select: {
          id: true,
          visitDate: true,
          reason: true,
          doctor: { select: { firstName: true, lastName: true } },
        },
        orderBy: { visitDate: 'desc' },
        take: 50,
      }),
      this.prisma.billing.findMany({
        where: { patientId, clinicId },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      success: true,
      data: {
        appointments,
        medicalRecords: records,
        billings,
      },
    };
  }
}
