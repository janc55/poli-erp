import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  clinicId: 'clinic-1',
  email: 'admin@unior.local',
  password: bcrypt.hashSync('Admin123!', 10),
  firstName: 'Admin',
  lastName: 'Test',
  dni: '00000000001',
  phone: '809-555-0101',
  role: 'SUPER_ADMIN',
  isActive: true,
  deletedAt: null,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockUser),
    update: jest.fn().mockResolvedValue({ ...mockUser, lastLogin: new Date() }),
  },
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mocked-jwt-token'),
};

const mockConfig = {
  get: jest.fn((k: string, d?: string) => {
    if (k === 'JWT_SECRET') return 'test-secret';
    if (k === 'JWT_EXPIRES_IN') return d ?? '15m';
    return d;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('returns accessToken and refreshToken for valid credentials', async () => {
      const result = await service.login({
        email: 'admin@unior.local',
        password: 'Admin123!',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@unior.local');
      expect(result.user.role).toBe('SUPER_ADMIN');
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('throws UnauthorizedException for wrong password', async () => {
      await expect(
        service.login({ email: 'admin@unior.local', password: 'WRONG' }),
      ).rejects.toThrow();
    });

    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'Admin123!' }),
      ).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('returns user by id', async () => {
      const result = await service.me('user-1');
      expect(result.id).toBe('user-1');
    });

    it('throws if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.me('missing')).rejects.toThrow();
    });
  });
});
