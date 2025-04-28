/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface RequestWithUser extends Request {
  user: JwtPayload;
}

interface CookieData {
  'next-auth.session-token'?: string;
  jwt?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // bypass auth if BYPASS_AUTH is true and mode is development
      if (
        this.configService.get('BYPASS_AUTH') === 'true' &&
        this.configService.get('NODE_ENV') === 'development'
      ) {
        return true;
      }
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const token = this.extractTokenFromCookie(request);

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      if (!payload?.sub || !payload?.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    const cookies = request.cookies as CookieData;
    if (!cookies) return undefined;

    return cookies['next-auth.session-token'] || cookies.jwt;
  }
}
