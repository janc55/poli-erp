import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CashSessionsService } from './cash-sessions.service';
import {
  CloseCashSessionDto,
  OpenCashSessionDto,
} from './dto/cash-session.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('cash-sessions')
@ApiBearerAuth()
@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private service: CashSessionsService) {}

  @Get()
  @RequirePermissions('billing:read')
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.clinicId);
  }

  @Get('active')
  @RequirePermissions('billing:read')
  active(@CurrentUser() user: AuthUser) {
    return this.service.active(user.clinicId);
  }

  @Get('cash-registers')
  @RequirePermissions('billing:read')
  cashRegisters(@CurrentUser() user: AuthUser) {
    return this.service.cashRegisters(user.clinicId);
  }

  @Post('open')
  @RequirePermissions('billing:write')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenCashSessionDto) {
    return this.service.open(user.clinicId, user.id, dto);
  }

  @Post(':id/close')
  @RequirePermissions('billing:write')
  close(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.service.close(user.clinicId, user.id, id, dto);
  }

  @Get(':id/report')
  @RequirePermissions('billing:read')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.report(user.clinicId, id);
  }
}
