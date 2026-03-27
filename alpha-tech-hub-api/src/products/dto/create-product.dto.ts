import { IsString, IsNumber, IsOptional, IsArray, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() sku: string;
  @ApiProperty() @IsString() brand: string;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) stock: number;
  @ApiPropertyOptional() @IsOptional() @IsString() summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() specs?: { label: string; value: string }[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() rating?: number;
}
