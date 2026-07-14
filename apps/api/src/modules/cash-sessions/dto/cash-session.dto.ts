import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenCashSessionDto {
  @ApiProperty()
  @IsString()
  cashRegisterId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  openingAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  closingAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
