import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMeta => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return {
      ip: (req.ip ?? req.headers['x-forwarded-for']?.toString() ?? '') || 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    };
  },
);
