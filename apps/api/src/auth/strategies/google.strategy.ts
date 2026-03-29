import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID:     config.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL:  config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3001/api/v1/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    // Estes dados chegam ao AuthService.googleLogin()
    const user = {
      googleId:    profile.id,
      email:       profile.emails?.[0]?.value,
      displayName: profile.displayName,
      avatarUrl:   profile.photos?.[0]?.value ?? null,
    };

    if (!user.email) {
      return done(new Error('Conta Google sem email associado.'), undefined);
    }

    done(null, user);
  }
}
