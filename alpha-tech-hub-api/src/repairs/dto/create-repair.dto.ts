import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRepairDto {
  @ApiProperty() @IsString() customerName: string;
  @ApiProperty() @IsString() customerPhone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() customerEmail?: string;
  @ApiProperty() @IsString() deviceBrand: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceModel?: string;
  @ApiProperty() @IsString() issueDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
}

export class UpdateRepairDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technician?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianNotes?: string;
  @ApiPropertyOptional() @IsOptional() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() finalCost?: number;
}
