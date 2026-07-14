import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BillingStatus,
  PaymentMethod,
} from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CreateBillingDto,
  RegisterPaymentDto,
  UpdateBillingDto,
} from './dto/billing.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class BillingService {
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
          { invoiceNumber: { contains: query.search } },
          { patient: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { lastName: { contains: query.search, mode: 'insensitive' as const } } },
          { patient: { dni: { contains: query.search } } },
        ],
      }),
      ...(query.status && { status: query.status as BillingStatus }),
    };

    const [data, total] = await Promise.all([
      this.prisma.billing.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dni: true } },
          items: true,
          payments: { orderBy: { paidAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.billing.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(clinicId: string, id: string) {
    const billing = await this.prisma.billing.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        appointment: true,
        items: true,
        payments: {
          include: { cashSession: { select: { id: true, openedAt: true } } },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!billing) throw new NotFoundException('Factura no encontrada');

    const paid = billing.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Number(billing.total) - paid;

    return { success: true, data: { ...billing, paid, balance } };
  }

  async findByInvoiceNumber(clinicId: string, number: string) {
    const billing = await this.prisma.billing.findFirst({
      where: { clinicId, invoiceNumber: number },
      include: { items: true, payments: true, patient: true },
    });
    if (!billing) throw new NotFoundException('Factura no encontrada');
    return { success: true, data: billing };
  }

  async create(clinicId: string, userId: string, dto: CreateBillingDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const items = dto.items ?? [];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = Math.max(0, subtotal - discount + tax);

    const invoiceNumber = await this.generateInvoiceNumber(clinicId);

    const billing = await this.prisma.billing.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        invoiceNumber,
        subtotal,
        discount,
        tax,
        total,
        status: total > 0 ? BillingStatus.PENDING : BillingStatus.PAID,
        items: {
          create: items.map((item) => ({
            serviceCatalogItemId: item.serviceCatalogItemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    // Si el appointment se completa, generar factura automática
    if (dto.appointmentId && (await this.shouldMarkCompleted(dto.appointmentId))) {
      // nada extra por ahora
    }

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Billing',
      entityId: billing.id,
      newData: billing,
    });

    return { success: true, data: billing };
  }

  async update(clinicId: string, id: string, dto: UpdateBillingDto) {
    const existing = await this.findOne(clinicId, id);
    if (existing.data.status === BillingStatus.CANCELLED) {
      throw new BadRequestException('No se puede modificar una factura cancelada');
    }

    const items = dto.items ?? existing.data.items.map((i) => ({
      serviceCatalogItemId: i.serviceCatalogItemId ?? undefined,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = dto.discount ?? Number(existing.data.discount);
    const tax = dto.tax ?? Number(existing.data.tax);
    const total = Math.max(0, subtotal - discount + tax);

    // Reemplazar items
    await this.prisma.billingItem.deleteMany({ where: { billingId: id } });

    const updated = await this.prisma.billing.update({
      where: { id },
      data: {
        subtotal,
        discount,
        tax,
        total,
        items: {
          create: items.map((item) => ({
            serviceCatalogItemId: item.serviceCatalogItemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    return { success: true, data: updated };
  }

  async registerPayment(
    clinicId: string,
    userId: string,
    id: string,
    dto: RegisterPaymentDto,
  ) {
    const billing = await this.findOne(clinicId, id);
    if (billing.data.status === BillingStatus.CANCELLED) {
      throw new BadRequestException('No se puede pagar una factura cancelada');
    }
    if (dto.amount > billing.data.balance) {
      throw new BadRequestException('El pago excede el saldo pendiente');
    }

    const payment = await this.prisma.payment.create({
      data: {
        billingId: id,
        cashSessionId: dto.cashSessionId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
    });

    // Actualizar estado
    const newPaid = billing.data.paid + dto.amount;
    let newStatus: BillingStatus = BillingStatus.PENDING;
    if (newPaid >= Number(billing.data.total)) newStatus = BillingStatus.PAID;
    else if (newPaid > 0) newStatus = BillingStatus.PARTIAL;

    const updated = await this.prisma.billing.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.audit.log({
      userId,
      action: 'OTHER',
      entity: 'Payment',
      entityId: payment.id,
      newData: { payment, billingStatus: newStatus },
    });

    return { success: true, data: { payment, billing: updated } };
  }

  async cancel(clinicId: string, userId: string, id: string, reason: string) {
    const billing = await this.findOne(clinicId, id);
    if (billing.data.status === BillingStatus.CANCELLED) {
      throw new BadRequestException('La factura ya está cancelada');
    }
    const updated = await this.prisma.billing.update({
      where: { id },
      data: {
        status: BillingStatus.CANCELLED,
        cancellationReason: reason,
        isActive: false,
        deletedAt: new Date(),
      },
    });
    await this.audit.log({
      userId,
      action: 'CANCEL',
      entity: 'Billing',
      entityId: id,
      oldData: billing.data,
      newData: updated,
    });
    return { success: true, data: updated };
  }

  private async generateInvoiceNumber(clinicId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;
    const last = await this.prisma.billing.findFirst({
      where: { clinicId, invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });
    const lastNumber = last
      ? parseInt(last.invoiceNumber.replace(prefix, ''), 10)
      : 0;
    const next = (lastNumber + 1).toString().padStart(6, '0');
    return `${prefix}${next}`;
  }

  private async shouldMarkCompleted(_appointmentId: string) {
    return false;
  }
}
