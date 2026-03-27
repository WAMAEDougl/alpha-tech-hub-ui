import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class StkPushDto {
  @ApiProperty({ example: '+254700000000' }) @IsString() phone: string;
}

class CardPaymentDto {
  @ApiProperty() @IsString() cardToken: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mpesa/stk/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate M-Pesa STK Push for an order' })
  stkPush(@Param('orderId') orderId: string, @Body() dto: StkPushDto) {
    return this.paymentsService.initiateStkPush(orderId, dto.phone);
  }

  @Post('mpesa/callback')
  @ApiOperation({ summary: 'M-Pesa payment callback (Safaricom webhook)' })
  mpesaCallback(@Body() body: any) {
    return this.paymentsService.handleMpesaCallback(body);
  }

  @Post('card/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Card payment placeholder' })
  cardPayment(@Param('orderId') orderId: string, @Body() dto: CardPaymentDto) {
    return this.paymentsService.initiateCardPayment(orderId, dto.cardToken);
  }
}
