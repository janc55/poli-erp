import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';

const mockPatient = {
  id: 'p-1',
  clinicId: 'clinic-1',
  dni: '00112345678',
  firstName: 'Juan',
  lastName: 'Pérez',
  birthDate: new Date('1990-05-15'),
  gender: 'MALE',
  phone: '809-555-0001',
  email: null,
  allergies: null,
  chronicDiseases: null,
  isActive: true,
  notificationPreferences: null,
  patientInsurances: [],
};

const mockPrisma = {
  patient: {
    findFirst: jest.fn().mockResolvedValue(mockPatient),
    findUnique: jest.fn().mockResolvedValue(mockPatient),
    findMany: jest.fn().mockResolvedValue([mockPatient]),
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn().mockResolvedValue(mockPatient),
    update: jest.fn().mockResolvedValue(mockPatient),
  },
};

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated patients', async () => {
      const result = await service.findAll('clinic-1', { page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPatient]);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.patient.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns patient by id', async () => {
      const result = await service.findOne('clinic-1', 'p-1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('p-1');
    });

    it('throws NotFound if not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('clinic-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a new patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValueOnce(null);
      const result = await service.create('clinic-1', {
        dni: '00199999999',
        firstName: 'Ana',
        lastName: 'Gómez',
        birthDate: '1995-03-20',
        gender: 'FEMALE',
        phone: '809-555-1234',
      });
      expect(result.success).toBe(true);
      expect(mockPrisma.patient.create).toHaveBeenCalled();
    });

    it('throws Conflict if DNI already exists', async () => {
      await expect(
        service.create('clinic-1', {
          dni: '00112345678',
          firstName: 'X',
          lastName: 'Y',
          birthDate: '1990-01-01',
          gender: 'MALE',
          phone: '809-555-0000',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('soft-deletes patient', async () => {
      const result = await service.deactivate('clinic-1', 'p-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });
});
