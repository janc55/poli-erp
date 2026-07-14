import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiPropertyOptional({ description: 'Autogenerado si vacío' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: [
    'MEDICATION_GENERIC',
    'MEDICATION_BRAND',
    'MEDICATION_CONTROLLED',
    'MEDICAL_SUPPLY',
    'EQUIPMENT',
    'OFFICE_SUPPLY',
  ] })
  category!: 'MEDICATION_GENERIC' | 'MEDICATION_BRAND' | 'MEDICATION_CONTROLLED' | 'MEDICAL_SUPPLY' | 'EQUIPMENT' | 'OFFICE_SUPPLY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  presentation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  concentration?: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsPositive()
  purchasePrice!: number;

  @ApiProperty()
  @IsPositive()
  salePrice!: number;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  minStock!: number;

  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

export class CreateSupplierDto {
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
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateMovementDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'] })
  type!: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';

  @ApiProperty()
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateBatchDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  batch!: string;

  @ApiProperty()
  @IsString()
  expiryDate!: string;

  @ApiProperty()
  @IsInt()
  quantity!: number;
}
