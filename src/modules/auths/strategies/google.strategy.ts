import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleUser } from '../interface/IAuth.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: GoogleStrategy.getRequiredEnvVar(configService, 'GoogleOAuth.clientId'),
      clientSecret: GoogleStrategy.getRequiredEnvVar(configService, 'GoogleOAuth.clientSecret'),
      callbackURL: GoogleStrategy.getRequiredEnvVar(configService, 'GoogleOAuth.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  private static getRequiredEnvVar(configService: ConfigService, key: string): string {
    const value = configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): GoogleUser {
    const { id, displayName, emails } = profile;

    if (!emails?.[0]?.value) {
      throw new UnauthorizedException('No email found in Google profile');
    }

    if (!id || !displayName) {
      throw new UnauthorizedException('Incomplete Google profile data');
    }

    return {
      id,
      name: displayName,
      email: emails[0].value,
      accessToken,
    };
  }
}
