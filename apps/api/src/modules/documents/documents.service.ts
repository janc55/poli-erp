import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { RegisterDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listByPatient(patientId: string) {
    const data = await this.prisma.document.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async register(userId: string, dto: RegisterDocumentDto) {
    const doc = await this.prisma.document.create({
      data: {
        patientId: dto.patientId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        type: dto.type,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Document',
      entityId: doc.id,
      newData: doc,
    });
    return { success: true, data: doc };
  }

  async remove(userId: string, id: string) {
    await this.prisma.document.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
    });
    return { success: true, message: 'Documento eliminado' };
  }
}
