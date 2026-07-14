import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to /patients', () => {
    return request(app.getHttpServer())
      .get('/api/patients')
      .expect(401);
  });

  it('logs in and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@unior.local', password: 'Admin123!' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('admin@unior.local');
    accessToken = res.body.accessToken;
  });

  it('returns user info when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.email).toBe('admin@unior.local');
  });

  it('returns dashboard metrics when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data).toHaveProperty('appointmentsToday');
  });
});
