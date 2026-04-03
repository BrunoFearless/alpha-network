/** Formato persistido em `Bot.builderFlow` (builder visual + engine). */
export type BuilderFlowV1 = {
  version: 1;
  nodes: BuilderNode[];
};

export type BuilderNode =
  | { id: string; type: 'trigger'; event: 'MESSAGE_CREATE' | 'MEMBER_JOIN' }
  | { id: string; type: 'condition'; kind: 'contains'; value: string }
  | { id: string; type: 'condition'; kind: 'channel'; channelId: string }
  | { id: string; type: 'action'; kind: 'reply'; text: string };

const MAX_NODES = 32;
const MAX_TEXT = 2000;
const MAX_ID_LEN = 64;

export function parseBuilderFlow(raw: unknown): BuilderFlowV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.nodes)) return null;
  return { version: 1, nodes: o.nodes as BuilderNode[] };
}

/** Validação “sandbox”: só tipos conhecidos e limites — sem código arbitrário. */
export function validateBuilderFlowJson(raw: unknown): string | null {
  const p = parseBuilderFlow(raw);
  if (!p) return 'Fluxo inválido: usa version: 1 e um array nodes.';
  if (p.nodes.length === 0) return 'O fluxo precisa de pelo menos um nó.';
  if (p.nodes.length > MAX_NODES) return `Máximo ${MAX_NODES} nós.`;
  const ids = new Set<string>();
  for (const n of p.nodes) {
    if (!n || typeof n !== 'object') return 'Nó inválido.';
    const node = n as Record<string, unknown>;
    const id = typeof node.id === 'string' ? node.id : '';
    if (!id || id.length > MAX_ID_LEN) return 'Cada nó precisa de id (string, curto).';
    if (ids.has(id)) return `Id duplicado: ${id}.`;
    ids.add(id);
    if (node.type === 'trigger') {
      if (node.event !== 'MESSAGE_CREATE' && node.event !== 'MEMBER_JOIN') return 'Trigger: event desconhecido.';
    } else if (node.type === 'condition') {
      if (node.kind === 'contains') {
        if (typeof node.value !== 'string' || node.value.length > MAX_TEXT) return 'Condição contains: texto demasiado longo.';
      } else if (node.kind === 'channel') {
        if (typeof node.channelId !== 'string' || node.channelId.length > MAX_ID_LEN) return 'Condição canal: channelId inválido.';
      } else return 'Condição: kind desconhecido.';
    } else if (node.type === 'action') {
      if (node.kind !== 'reply') return 'Ação: só reply é suportada.';
      if (typeof (node as { text?: string }).text !== 'string' || (node as { text: string }).text.length > MAX_TEXT) {
        return 'Resposta demasiado longa.';
      }
    } else return 'Tipo de nó desconhecido.';
  }
  return null;
}
