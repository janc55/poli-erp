import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
  CancelBillingDto,
  CreateBillingDto,
  RegisterPaymentDto,
  UpdateBillingDto,
} from './dto/billing.dto';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}

  @Get()
  @RequirePermissions('billing:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.findAll(user.clinicId, query);
  }

  @Get('invoice/:number')
  @RequirePermissions('billing:read')
  byInvoiceNumber(@CurrentUser() user: AuthUser, @Param('number') number: string) {
    return this.service.findByInvoiceNumber(user.clinicId, number);
  }

  @Get(':id')
  @RequirePermissions('billing:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.clinicId, id);
  }

  @Post()
  @RequirePermissions('billing:write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillingDto) {
    return this.service.create(user.clinicId, user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('billing:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBillingDto,
  ) {
    return this.service.update(user.clinicId, id, dto);
  }

  @Post(':id/pay')
  @RequirePermissions('billing:write')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.service.registerPayment(user.clinicId, user.id, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('billing:write')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBillingDto,
  ) {
    return this.service.cancel(user.clinicId, user.id, id, dto.reason);
  }
}
