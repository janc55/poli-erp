import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class Cie10DiagnosisDto {
  @ApiProperty()
  @IsString()
  cie10CodeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VitalSignsDto {
  @ApiPropertyOptional()
  @IsOptional()
  bloodPressure?: string;
  @ApiPropertyOptional()
  @IsOptional()
  heartRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  temperature?: number;
  @ApiPropertyOptional()
  @IsOptional()
  respiratoryRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  oxygenSaturation?: number;
  @ApiPropertyOptional()
  @IsOptional()
  weight?: number;
  @ApiPropertyOptional()
  @IsOptional()
  height?: number;
  @ApiPropertyOptional()
  @IsOptional()
  bmi?: number;
}

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsString()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anamnesis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalExam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vitalSigns?: VitalSignsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [Cie10DiagnosisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Cie10DiagnosisDto)
  diagnoses?: Cie10DiagnosisDto[];
}

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anamnesis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalExam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vitalSigns?: VitalSignsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [Cie10DiagnosisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Cie10DiagnosisDto)
  diagnoses?: Cie10DiagnosisDto[];
}

export class SignMedicalRecordDto {
  @ApiProperty()
  @IsString()
  signatureUrl!: string;
}
