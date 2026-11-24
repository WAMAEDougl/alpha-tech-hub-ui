import { Body, Controller, ForbiddenException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { IsString } from 'class-validator';
import { PaymentsService } from './payments.service';

class StkPushDto {
  @ApiProperty() @IsString() orderNumber: string;
  @ApiProperty({ example: '0712345678' }) @IsString() phone: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private config: ConfigService) {}

  @Post('mpesa/stk')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send the M-Pesa PIN prompt to the customer phone' })
  stkPush(@Body() dto: StkPushDto) {
    return this.payments.initiateStkPush(dto.orderNumber, dto.phone);
  }

  /** The secret in the URL is how we know the call really came from our Safaricom registration. */
  @Post('mpesa/callback/:token')
  @SkipThrottle()
  @ApiOperation({ summary: 'M-Pesa payment callback (Safaricom webhook)' })
  callback(@Param('token') token: string, @Body() body: any) {
    const expected = this.config.get<string>('MPESA_CALLBACK_TOKEN') || '';
    const a = Buffer.from(token); const b = Buffer.from(expected);
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException();
    return this.payments.handleCallback(body);
  }
}
