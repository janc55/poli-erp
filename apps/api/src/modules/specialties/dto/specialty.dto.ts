import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialtyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSpecialtyDto extends PartialType(CreateSpecialtyDto) {}

export class QuerySpecialtyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}