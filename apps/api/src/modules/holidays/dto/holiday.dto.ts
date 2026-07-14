import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateHolidayDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'null = feriado nacional' })
  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class QueryHolidayDto {
  @ApiPropertyOptional({ description: 'Filtrar por año, ej. 2026' })
  @IsOptional()
  @Type(() => Number)
  year?: number;
}