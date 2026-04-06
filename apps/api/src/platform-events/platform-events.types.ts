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
  'CHANNEL_UPDATE',
  'CHANNEL_DELETE',
  'CHANNEL_PERMISSION_UPDATE',
  'CATEGORY_UPDATE',
  'CATEGORY_DELETE',
  'CHANNELS_REORDER',
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
    }
  | {
      type: 'CHANNEL_UPDATE';
      serverId: string;
      channelId: string;
      channel: any;
    }
  | {
      type: 'CHANNEL_DELETE';
      serverId: string;
      channelId: string;
    }
  | {
      type: 'CHANNEL_PERMISSION_UPDATE';
      serverId: string;
      channelId: string;
      isPrivate: boolean;
      allowedRoles: any[];
    }
  | {
      type: 'CATEGORY_UPDATE';
      serverId: string;
      categoryId: string;
      category: any;
    }
  | {
      type: 'CATEGORY_DELETE';
      serverId: string;
      categoryId: string;
    }
  | {
      type: 'CHANNELS_REORDER';
      serverId: string;
      positions: { id: string; position: number }[];
    };

export type PlatformEventHandler<T extends PlatformEventType = PlatformEventType> = (
  event: Extract<PlatformEvent, { type: T }>,
) => void;
