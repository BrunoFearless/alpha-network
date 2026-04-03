/** Alinhado com `Bot.builderFlow` / engine na API. */
export type BuilderFlowV1 = {
  version: 1;
  nodes: BuilderNode[];
};

export type BuilderNode =
  | { id: string; type: 'trigger'; event: 'MESSAGE_CREATE' | 'MEMBER_JOIN' }
  | { id: string; type: 'condition'; kind: 'contains'; value: string }
  | { id: string; type: 'condition'; kind: 'channel'; channelId: string }
  | { id: string; type: 'action'; kind: 'reply'; text: string };
