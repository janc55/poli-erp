import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LabOrderItemDto {
  @ApiProperty()
  @IsString()
  examTypeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultNotes?: string;
}

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  medicalRecordId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [LabOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabOrderItemDto)
  items!: LabOrderItemDto[];
}

export class RecordResultDto {
  @ApiProperty({ type: [LabOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabOrderItemDto)
  items!: LabOrderItemDto[];
}
