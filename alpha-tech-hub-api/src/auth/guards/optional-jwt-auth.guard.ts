import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but a missing or invalid token is NOT an error: req.user is simply undefined.
 * Used for checkout, so a signed-in customer's order is linked to their account and a guest still works.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: unknown, user: any) {
    return user || undefined;
  }
}
