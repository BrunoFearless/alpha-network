/** Alinhado com `Bot.builderFlow` / engine na API. */
export type BuilderFlowV1 = {
  version: 1;
  nodes: BuilderNode[];
};

export type BuilderNode =
  | { id: string; type: 'trigger'; event: 'MESSAGE_CREATE' | 'MEMBER_JOIN' | 'MEMBER_LEAVE' | 'REACTION_ADD' }
  | { id: string; type: 'condition'; kind: 'contains'; value: string }
  | { id: string; type: 'condition'; kind: 'channel'; channelId: string }
  | { id: string; type: 'condition'; kind: 'admin'; requireAdmin: boolean }
  | { id: string; type: 'condition'; kind: 'role'; roleId: string }
  | { id: string; type: 'condition'; kind: 'userId'; userId: string }
  | { id: string; type: 'action'; kind: 'reply'; text: string }
  | { id: string; type: 'action'; kind: 'sendMessage'; text: string }
  | { id: string; type: 'action'; kind: 'deleteMessage' }
  | { id: string; type: 'action'; kind: 'assignRole'; roleId: string }
  | { id: string; type: 'action'; kind: 'mute'; durationMs: number }
  | { id: string; type: 'action'; kind: 'wait'; delayMs: number };
