import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import {
  CreateInsuranceAgreementDto,
  CreateInsuranceProviderDto,
  CreatePatientInsuranceDto,
  UpdateInsuranceAgreementDto,
  UpdateInsuranceProviderDto,
  UpdatePatientInsuranceDto,
} from './dto/insurance.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('insurance')
@ApiBearerAuth()
@Controller('insurance')
export class InsuranceController {
  constructor(private service: InsuranceService) {}

  // ─── Providers ──────────────────────────────────────────────────────────

  @Get('providers')
  @RequirePermissions('insurance:read')
  findProviders(@CurrentUser() user: AuthUser) {
    return this.service.findAllProviders(user.clinicId);
  }

  @Post('providers')
  @RequirePermissions('insurance:write')
  createProvider(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInsuranceProviderDto,
  ) {
    return this.service.createProvider(user.clinicId, user.id, dto);
  }

  @Put('providers/:id')
  @RequirePermissions('insurance:write')
  updateProvider(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceProviderDto,
  ) {
    return this.service.updateProvider(user.clinicId, user.id, id, dto);
  }

  @Patch('providers/:id/deactivate')
  @RequirePermissions('insurance:write')
  deactivateProvider(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateProvider(user.clinicId, user.id, id);
  }

  @Get('providers/:id/agreements')
  @RequirePermissions('insurance:read')
  findAgreements(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.findAgreementsByProvider(user.clinicId, id);
  }

  @Post('providers/:id/agreements')
  @RequirePermissions('insurance:write')
  createAgreement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateInsuranceAgreementDto,
  ) {
    return this.service.createAgreement(user.clinicId, user.id, id, dto);
  }

  // ─── Agreements (top-level update) ──────────────────────────────────────

  @Put('agreements/:id')
  @RequirePermissions('insurance:write')
  updateAgreement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceAgreementDto,
  ) {
    return this.service.updateAgreement(user.clinicId, user.id, id, dto);
  }

  // ─── Patient Insurance ──────────────────────────────────────────────────

  @Get('patients/:patientId')
  @RequirePermissions('insurance:read')
  findPatientInsurances(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.findPatientInsurances(user.clinicId, patientId);
  }

  @Post('patients/:patientId')
  @RequirePermissions('insurance:write')
  createPatientInsurance(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePatientInsuranceDto,
  ) {
    return this.service.createPatientInsurance(user.clinicId, user.id, patientId, dto);
  }

  @Put('patient-insurances/:id')
  @RequirePermissions('insurance:write')
  updatePatientInsurance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientInsuranceDto,
  ) {
    return this.service.updatePatientInsurance(user.clinicId, user.id, id, dto);
  }

  @Patch('patient-insurances/:id/deactivate')
  @RequirePermissions('insurance:write')
  deactivatePatientInsurance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.service.deactivatePatientInsurance(user.clinicId, user.id, id);
  }
}