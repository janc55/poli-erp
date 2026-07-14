import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashSessionStatus } from '@poli-erp/database';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import {
  CloseCashSessionDto,
  OpenCashSessionDto,
} from './dto/cash-session.dto';

@Injectable()
export class CashSessionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async list(clinicId: string) {
    const data = await this.prisma.cashSession.findMany({
      where: { cashRegister: { clinicId } },
      include: {
        cashRegister: true,
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
    return { success: true, data };
  }

  async active(clinicId: string) {
    const data = await this.prisma.cashSession.findMany({
      where: {
        cashRegister: { clinicId },
        status: CashSessionStatus.OPEN,
      },
      include: {
        cashRegister: true,
        openedBy: { select: { firstName: true, lastName: true } },
      },
    });
    return { success: true, data };
  }

  async open(clinicId: string, userId: string, dto: OpenCashSessionDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: dto.cashRegisterId, clinicId, isActive: true },
    });
    if (!register) throw new NotFoundException('Caja no encontrada');

    const existing = await this.prisma.cashSession.findFirst({
      where: { cashRegisterId: dto.cashRegisterId, status: CashSessionStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException('Ya hay una sesión abierta en esta caja');
    }

    const session = await this.prisma.cashSession.create({
      data: {
        cashRegisterId: dto.cashRegisterId,
        openedById: userId,
        openingAmount: dto.openingAmount,
        status: CashSessionStatus.OPEN,
        notes: dto.notes,
      },
      include: { cashRegister: true },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'CashSession',
      entityId: session.id,
      newData: session,
    });

    return { success: true, data: session };
  }

  async close(clinicId: string, userId: string, sessionId: string, dto: CloseCashSessionDto) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        payments: true,
      },
    });
    if (!session || session.cashRegister.clinicId !== clinicId) {
      throw new NotFoundException('Sesión no encontrada');
    }
    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('La sesión ya está cerrada');
    }

    // Calcular esperado: opening + ingresos en efectivo
    const cashPayments = session.payments.filter((p) => p.method === 'CASH');
    const cashReceived = cashPayments.reduce((s, p) => s + Number(p.amount), 0);
    const expected = Number(session.openingAmount) + cashReceived;

    const updated = await this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.CLOSED,
        closedById: userId,
        closingAmount: dto.closingAmount,
        expectedAmount: expected,
        difference: dto.closingAmount - expected,
        closedAt: new Date(),
        notes: dto.notes ?? session.notes,
      },
      include: {
        cashRegister: true,
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'CashSession',
      entityId: sessionId,
      oldData: session,
      newData: updated,
    });

    return { success: true, data: updated };
  }

  async report(clinicId: string, sessionId: string) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
        payments: {
          include: {
            billing: {
              include: { patient: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
    if (!session || session.cashRegister.clinicId !== clinicId) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const summary = {
      opening: Number(session.openingAmount),
      totalByMethod: {
        CASH: 0,
        CARD: 0,
        TRANSFER: 0,
        INSURANCE: 0,
        MIXED: 0,
      } as Record<string, number>,
      paymentCount: session.payments.length,
    };
    for (const payment of session.payments) {
      summary.totalByMethod[payment.method] =
        (summary.totalByMethod[payment.method] ?? 0) + Number(payment.amount);
    }

    return { success: true, data: { ...session, summary } };
  }

  async cashRegisters(clinicId: string) {
    const data = await this.prisma.cashRegister.findMany({
      where: { clinicId, isActive: true },
    });
    return { success: true, data };
  }
}
