export type BotTriggerHit = {
  botId: string;
  botName: string;
  content: string;
  messageType: 'text' | 'image' | 'embed';
  imageUrl?: string | null;
  embedJson?: Record<string, unknown> | null;
};
