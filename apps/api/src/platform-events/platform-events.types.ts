/**
 * Contratos da FASE 1 — sistema de eventos da plataforma (Discord-like).
 * O bus distribui estes payloads a subscritores (in-memory; futuro: Redis/Kafka).
 */

export const PLATFORM_EVENT_TYPES = [
  'MESSAGE_CREATE',
  'MESSAGE_UPDATE',
  'MEMBER_JOIN',
  'MEMBER_LEAVE',
  'CHANNEL_CREATE',
] as const;

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number];

export type PlatformEvent =
  | {
      type: 'MESSAGE_CREATE';
      serverId: string;
      channelId: string;
      messageId: string;
      userId: string;
      authorType: 'user' | 'bot';
      content: string;
    }
  | {
      type: 'MESSAGE_UPDATE';
      serverId: string;
      channelId: string;
      messageId: string;
      userId: string;
      content: string;
    }
  | {
      type: 'MEMBER_JOIN';
      serverId: string;
      userId: string;
    }
  | {
      type: 'MEMBER_LEAVE';
      serverId: string;
      userId: string;
      reason: 'kick' | 'ban' | 'leave';
    }
  | {
      type: 'CHANNEL_CREATE';
      serverId: string;
      channelId: string;
      name: string;
    };

export type PlatformEventHandler<T extends PlatformEventType = PlatformEventType> = (
  event: Extract<PlatformEvent, { type: T }>,
) => void;
