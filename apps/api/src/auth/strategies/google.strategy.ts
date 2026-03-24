import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientID     = config.get<string>('GOOGLE_CLIENT_ID')     || 'PLACEHOLDER';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'PLACEHOLDER';
    const callbackURL  = config.get<string>('GOOGLE_CALLBACK_URL')  || 'http://localhost:3001/api/v1/auth/google/callback';

    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'] });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const user = {
      email: profile.emails[0].value,
      name:  profile.displayName,
      photo: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}