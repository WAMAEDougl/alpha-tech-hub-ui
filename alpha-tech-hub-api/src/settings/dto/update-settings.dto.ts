import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  companyName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  logoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  address?: string;
}
