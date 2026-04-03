import { Test } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';

describe('EventBusService', () => {
  it('entrega MESSAGE_CREATE apenas a subscritores desse tipo', async () => {
    const m = await Test.createTestingModule({ providers: [EventBusService] }).compile();
    const bus = m.get(EventBusService);
    const seen: string[] = [];
    const unsub = bus.subscribe('MESSAGE_CREATE', e => {
      if (e.type === 'MESSAGE_CREATE') seen.push(e.messageId);
    });
    bus.publish({
      type: 'MESSAGE_CREATE',
      serverId: 's',
      channelId: 'c',
      messageId: 'm1',
      userId: 'u',
      authorType: 'user',
      content: 'hi',
    });
    bus.publish({
      type: 'MEMBER_JOIN',
      serverId: 's',
      userId: 'u',
    });
    expect(seen).toEqual(['m1']);
    unsub();
    bus.publish({
      type: 'MESSAGE_CREATE',
      serverId: 's',
      channelId: 'c',
      messageId: 'm2',
      userId: 'u',
      authorType: 'user',
      content: 'x',
    });
    expect(seen).toEqual(['m1']);
  });

  it('subscribeAll recebe todos os tipos', async () => {
    const m = await Test.createTestingModule({ providers: [EventBusService] }).compile();
    const bus = m.get(EventBusService);
    const types: string[] = [];
    const off = bus.subscribeAll(e => types.push(e.type));
    bus.publish({ type: 'CHANNEL_CREATE', serverId: 's', channelId: 'c', name: 'geral' });
    bus.publish({ type: 'MEMBER_LEAVE', serverId: 's', userId: 'u', reason: 'kick' });
    off();
    bus.publish({ type: 'MEMBER_JOIN', serverId: 's', userId: 'u' });
    expect(types).toEqual(['CHANNEL_CREATE', 'MEMBER_LEAVE']);
  });

  it('um handler que falha não impede os outros', async () => {
    const m = await Test.createTestingModule({ providers: [EventBusService] }).compile();
    const bus = m.get(EventBusService);
    const ok: number[] = [];
    bus.subscribe('MESSAGE_UPDATE', () => {
      throw new Error('boom');
    });
    bus.subscribe('MESSAGE_UPDATE', () => ok.push(1));
    bus.publish({
      type: 'MESSAGE_UPDATE',
      serverId: 's',
      channelId: 'c',
      messageId: 'm',
      userId: 'u',
      content: 'x',
    });
    expect(ok).toEqual([1]);
  });
});
