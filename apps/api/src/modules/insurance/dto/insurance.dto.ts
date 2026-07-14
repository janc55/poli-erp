import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInsuranceProviderDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateInsuranceProviderDto extends PartialType(CreateInsuranceProviderDto) {}

export class CreateInsuranceAgreementDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 80, description: 'Porcentaje 0-100' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coveragePercent!: number;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  copayAmount?: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInsuranceAgreementDto extends PartialType(CreateInsuranceAgreementDto) {}

export class CreatePatientInsuranceDto {
  @ApiProperty()
  @IsUUID()
  insuranceProviderId!: string;

  @ApiProperty()
  @IsString()
  policyNumber!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class UpdatePatientInsuranceDto extends PartialType(CreatePatientInsuranceDto) {}