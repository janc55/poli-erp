import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateInsuranceAgreementDto,
  CreateInsuranceProviderDto,
  CreatePatientInsuranceDto,
  UpdateInsuranceAgreementDto,
  UpdateInsuranceProviderDto,
  UpdatePatientInsuranceDto,
} from './dto/insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Providers ───────────────────────────────────────────────────────────

  async findAllProviders(clinicId: string) {
    const data = await this.prisma.insuranceProvider.findMany({
      where: { clinicId, isActive: true },
      include: { agreements: { where: { isActive: true } } },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  }

  async createProvider(clinicId: string, actorId: string, dto: CreateInsuranceProviderDto) {
    const existing = await this.prisma.insuranceProvider.findFirst({
      where: { clinicId, code: dto.code },
    });
    if (existing) throw new ConflictException('Código de aseguradora ya registrado');

    const provider = await this.prisma.insuranceProvider.create({
      data: {
        clinicId,
        name: dto.name,
        code: dto.code,
        phone: dto.phone,
        email: dto.email,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'InsuranceProvider',
      entityId: provider.id,
      newData: provider,
    });
    return { success: true, data: provider };
  }

  async updateProvider(clinicId: string, actorId: string, id: string, dto: UpdateInsuranceProviderDto) {
    const existing = await this.prisma.insuranceProvider.findFirst({
      where: { id, clinicId },
    });
    if (!existing) throw new NotFoundException('Aseguradora no encontrada');

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.insuranceProvider.findFirst({
        where: { clinicId, code: dto.code, NOT: { id } },
      });
      if (dup) throw new ConflictException('Código de aseguradora ya registrado');
    }

    const updated = await this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        phone: dto.phone,
        email: dto.email,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'InsuranceProvider',
      entityId: id,
      oldData: existing,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivateProvider(clinicId: string, actorId: string, id: string) {
    const existing = await this.prisma.insuranceProvider.findFirst({
      where: { id, clinicId },
    });
    if (!existing) throw new NotFoundException('Aseguradora no encontrada');

    await this.prisma.insuranceProvider.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'InsuranceProvider',
      entityId: id,
      oldData: existing,
    });
    return { success: true, message: 'Aseguradora desactivada' };
  }

  // ─── Agreements ──────────────────────────────────────────────────────────

  async findAgreementsByProvider(clinicId: string, providerId: string) {
    await this.assertProviderInClinic(clinicId, providerId);
    const data = await this.prisma.insuranceAgreement.findMany({
      where: { insuranceProviderId: providerId, isActive: true },
      orderBy: { validFrom: 'desc' },
    });
    return { success: true, data };
  }

  async createAgreement(
    clinicId: string,
    actorId: string,
    providerId: string,
    dto: CreateInsuranceAgreementDto,
  ) {
    await this.assertProviderInClinic(clinicId, providerId);

    if (dto.copayAmount && dto.coveragePercent >= 100) {
      throw new BadRequestException(
        'Si hay copago, la cobertura no puede ser 100%',
      );
    }

    const agreement = await this.prisma.insuranceAgreement.create({
      data: {
        insuranceProviderId: providerId,
        name: dto.name,
        coveragePercent: dto.coveragePercent,
        copayAmount: dto.copayAmount ?? null,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'InsuranceAgreement',
      entityId: agreement.id,
      newData: agreement,
    });
    return { success: true, data: agreement };
  }

  async updateAgreement(clinicId: string, actorId: string, id: string, dto: UpdateInsuranceAgreementDto) {
    const existing = await this.findAgreementForClinic(clinicId, id);

    const updated = await this.prisma.insuranceAgreement.update({
      where: { id },
      data: {
        name: dto.name,
        coveragePercent: dto.coveragePercent,
        copayAmount: dto.copayAmount,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        isActive: dto.isActive,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'InsuranceAgreement',
      entityId: id,
      oldData: existing,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  // ─── Patient Insurance ───────────────────────────────────────────────────

  async findPatientInsurances(clinicId: string, patientId: string) {
    await this.assertPatientInClinic(clinicId, patientId);
    const data = await this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
      include: { insuranceProvider: true },
      orderBy: { validFrom: 'desc' },
    });
    return { success: true, data };
  }

  async createPatientInsurance(
    clinicId: string,
    actorId: string,
    patientId: string,
    dto: CreatePatientInsuranceDto,
  ) {
    await this.assertPatientInClinic(clinicId, patientId);
    await this.assertProviderInClinic(clinicId, dto.insuranceProviderId);

    const existing = await this.prisma.patientInsurance.findFirst({
      where: {
        patientId,
        insuranceProviderId: dto.insuranceProviderId,
        policyNumber: dto.policyNumber,
      },
    });
    if (existing) throw new ConflictException('Póliza ya registrada para este paciente');

    const ins = await this.prisma.patientInsurance.create({
      data: {
        patientId,
        insuranceProviderId: dto.insuranceProviderId,
        policyNumber: dto.policyNumber,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
      },
      include: { insuranceProvider: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'PatientInsurance',
      entityId: ins.id,
      newData: ins,
    });
    return { success: true, data: ins };
  }

  async updatePatientInsurance(
    clinicId: string,
    actorId: string,
    id: string,
    dto: UpdatePatientInsuranceDto,
  ) {
    const existing = await this.prisma.patientInsurance.findFirst({
      where: { id, patient: { clinicId } },
      include: { patient: true },
    });
    if (!existing) throw new NotFoundException('Seguro de paciente no encontrado');

    await this.assertProviderInClinic(clinicId, dto.insuranceProviderId ?? existing.insuranceProviderId);

    if (dto.policyNumber && dto.policyNumber !== existing.policyNumber) {
      const dup = await this.prisma.patientInsurance.findFirst({
        where: {
          patientId: existing.patientId,
          insuranceProviderId: dto.insuranceProviderId ?? existing.insuranceProviderId,
          policyNumber: dto.policyNumber,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException('Póliza ya registrada para este paciente');
    }

    const updated = await this.prisma.patientInsurance.update({
      where: { id },
      data: {
        insuranceProviderId: dto.insuranceProviderId,
        policyNumber: dto.policyNumber,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
      include: { insuranceProvider: true },
    });

    await this.audit.log({
      userId: actorId,
      action: 'UPDATE',
      entity: 'PatientInsurance',
      entityId: id,
      oldData: existing,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  async deactivatePatientInsurance(clinicId: string, actorId: string, id: string) {
    const existing = await this.prisma.patientInsurance.findFirst({
      where: { id, patient: { clinicId } },
    });
    if (!existing) throw new NotFoundException('Seguro de paciente no encontrado');

    await this.prisma.patientInsurance.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      userId: actorId,
      action: 'DEACTIVATE',
      entity: 'PatientInsurance',
      entityId: id,
      oldData: existing,
    });
    return { success: true, message: 'Seguro desactivado' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async assertProviderInClinic(clinicId: string, providerId: string) {
    const provider = await this.prisma.insuranceProvider.findFirst({
      where: { id: providerId, clinicId },
    });
    if (!provider) throw new NotFoundException('Aseguradora no encontrada');
  }

  private async assertPatientInClinic(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
  }

  private async findAgreementForClinic(clinicId: string, agreementId: string) {
    const agreement = await this.prisma.insuranceAgreement.findFirst({
      where: {
        id: agreementId,
        insuranceProvider: { clinicId },
      },
      include: { insuranceProvider: true },
    });
    if (!agreement) throw new NotFoundException('Convenio no encontrado');
    return agreement;
  }
}