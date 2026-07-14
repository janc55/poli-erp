import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Role } from '@poli-erp/database';

export class DoctorScheduleDto {
  @ApiProperty({ description: '0=Dom, 6=Sáb' })
  @IsInt()
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ default: 30 })
  @IsOptional()
  @IsInt()
  slotMinutes?: number;
}

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty()
  @IsString()
  dni!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  specialtyIds?: string[];

  @ApiPropertyOptional({ type: [DoctorScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorScheduleDto)
  schedules?: DoctorScheduleDto[];
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  specialtyIds?: string[];
}

export class AssignSpecialtiesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  specialtyIds!: string[];
}

export class SetSchedulesDto {
  @ApiProperty({ type: [DoctorScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorScheduleDto)
  schedules!: DoctorScheduleDto[];
}
