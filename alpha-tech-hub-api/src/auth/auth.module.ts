import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        // Refuse to boot with a missing/placeholder secret: tokens signed with a
        // guessable secret let anyone forge an admin login.
        if (!secret || secret.length < 32 || secret.startsWith('your-super-secret')) {
          throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
        }
        return { secret, signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '12h') } };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
