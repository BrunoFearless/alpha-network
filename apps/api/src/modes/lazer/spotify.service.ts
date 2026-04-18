import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpotifyService {
  constructor(private prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';
    const scopes = 'user-read-currently-playing user-read-playback-state user-read-email';

    return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
      scopes,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
  }

  async handleCallback(code: string, userId: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.error_description || 'Spotify Auth failed');

    const updateData: any = {
      spotifyEnabled: true,
    };
    if (data.refresh_token) {
      updateData.spotifyRefreshToken = data.refresh_token;
    }

    await (this.prisma.profile.update as any)({
      where: { userId },
      data: updateData,
    });

    return { success: true };
  }

  async getCurrentlyPlaying(userId: string) {
    const profile = (await this.prisma.profile.findUnique({
      where: { userId },
    })) as any;

    if (!profile || !profile.spotifyRefreshToken || !profile.spotifyEnabled) {
      return { isPlaying: false, lastPlayed: profile?.lastPlayedTrack };
    }

    try {
      const accessToken = await this.getFreshAccessToken(profile.spotifyRefreshToken);
      if (!accessToken) return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
      
      let res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 204) {
        res = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      if (res.status === 204 || !res.ok) {
        return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
      }

      let data: any;
      try {
        const text = await res.text();
        if (!text) return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
        data = JSON.parse(text);
      } catch (e) {
        return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
      }

      if (!data || !data.item) {
        return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
      }

      const track = {
        title: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(', '),
        albumArt: data.item.album.images[0]?.url,
        url: data.item.external_urls.spotify,
        timestamp: new Date().toISOString(),
      };

      await (this.prisma.profile.update as any)({
        where: { userId },
        data: { lastPlayedTrack: track },
      });

      return { isPlaying: true, ...track };
    } catch (e) {
      return { isPlaying: false, lastPlayed: profile.lastPlayedTrack };
    }
  }

  private async getFreshAccessToken(refreshToken: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      console.error('Falha ao renovar token Spotify:', data);
      return null;
    }
    return data.access_token;
  }
}
