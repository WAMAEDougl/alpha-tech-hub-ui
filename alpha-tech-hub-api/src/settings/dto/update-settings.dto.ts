import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsInt, Min, Max } from 'class-validator';
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

  @ApiPropertyOptional() @IsOptional() @IsBoolean() mpesaManualEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() paybillNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tillNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mpesaStkEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() codEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(30) returnWindowDays?: number;
}
