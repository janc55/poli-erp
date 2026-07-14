import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class Cie10SeedItemDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class BulkSeedCie10Dto {
  @ApiProperty({ type: [Cie10SeedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Cie10SeedItemDto)
  codes!: Cie10SeedItemDto[];
}