import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethodDto {
  MPESA_MANUAL = 'MPESA_MANUAL',
  MPESA_STK = 'MPESA_STK',
  CASH = 'CASH',
}

export enum FulfillmentModeDto {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export class OrderItemDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(50) quantity: number;
}

/** Shared by the checkout quote and the order itself, so the customer is never charged a different price. */
export class QuoteDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30)
  @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: FulfillmentModeDto }) @IsEnum(FulfillmentModeDto) fulfillmentMode: FulfillmentModeDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID() deliveryZoneId?: string;
  /** What the customer typed for their town/estate, used to find a zone if none was picked. */
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryArea?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() discountCode?: string;
}

/**
 * Guest or signed-in checkout. Prices, fees and discounts are NEVER accepted from the client:
 * they are recomputed on the server so a customer cannot edit the cart to pay less.
 */
export class CreateOrderDto extends QuoteDto {
  @ApiProperty() @IsString() @MinLength(2) customerName: string;
  @ApiProperty() @IsString() @MinLength(9) customerPhone: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() customerEmail?: string;

  @ApiPropertyOptional()
  @ValidateIf(o => o.fulfillmentMode === FulfillmentModeDto.DELIVERY)
  @IsString() @MinLength(5)
  deliveryAddress?: string;

  @ApiProperty({ enum: PaymentMethodDto }) @IsEnum(PaymentMethodDto) paymentMethod: PaymentMethodDto;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
