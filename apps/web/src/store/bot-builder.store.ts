'use client';
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export type BuilderNodeType = 'trigger' | 'condition' | 'action';
export type TriggerEvent = 'MESSAGE_CREATE' | 'MEMBER_JOIN' | 'MEMBER_LEAVE' | 'REACTION_ADD';
export type ConditionKind = 'contains' | 'channel' | 'admin' | 'role' | 'userId';
export type ActionKind = 'reply' | 'sendMessage' | 'deleteMessage' | 'assignRole' | 'mute' | 'wait';

export interface BuilderNode {
  id: string;
  type: BuilderNodeType;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

interface BotBuilderStore {
  // State
  nodes: BuilderNode[];
  edges: Edge[];
  errors: string[];
  validating: boolean;

  // Node operations
  addNode: (type: BuilderNodeType, position: { x: number; y: number }) => void;
  updateNode: (id: string, data: Record<string, any>) => void;
  deleteNode: (id: string) => void;

  // Edge operations
  addEdge: (source: string, target: string) => void;
  deleteEdge: (id: string) => void;

  // Flow operations
  setFlow: (nodes: BuilderNode[], edges: Edge[]) => void;
  clearFlow: () => void;
  validateFlow: () => boolean;
  getFlowJSON: () => { version: 1; nodes: any[] } | null;

  // Errors
  clearErrors: () => void;
}

const defaultTriggerData = (): Record<string, any> => ({
  event: 'MESSAGE_CREATE',
});

const defaultConditionData = (): Record<string, any> => ({
  kind: 'contains',
  value: '',
  channelId: '',
  requireAdmin: false,
  roleId: '',
  userId: '',
});

const defaultActionData = (): Record<string, any> => ({
  kind: 'reply',
  text: '',
  roleId: '',
  durationMs: 3600000, // 1 hora
  delayMs: 1000,
});

export const useBotBuilderStore = create<BotBuilderStore>((set, get) => ({
  nodes: [],
  edges: [],
  errors: [],
  validating: false,

  addNode: (type: BuilderNodeType, position: { x: number; y: number }) => {
    const id = uuid();
    let data: Record<string, any>;

    if (type === 'trigger') {
      data = defaultTriggerData();
    } else if (type === 'condition') {
      data = defaultConditionData();
    } else {
      data = defaultActionData();
    }

    set(state => ({
      nodes: [
        ...state.nodes,
        {
          id,
          type,
          data,
          position,
        },
      ],
    }));
  },

  updateNode: (id: string, data: Record<string, any>) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
  },

  deleteNode: (id: string) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
    }));
  },

  addEdge: (source: string, target: string) => {
    const edgeId = uuid();
    set(state => ({
      edges: [...state.edges, { id: edgeId, source, target }],
    }));
  },

  deleteEdge: (id: string) => {
    set(state => ({
      edges: state.edges.filter(e => e.id !== id),
    }));
  },

  setFlow: (nodes: BuilderNode[], edges: Edge[]) => {
    set({ nodes, edges });
  },

  clearFlow: () => {
    set({ nodes: [], edges: [] });
  },

  validateFlow: () => {
    const state = get();
    const errors: string[] = [];

    // Verificar se há nós
    if (state.nodes.length === 0) {
      errors.push('Fluxo vazio. Adiciona pelo menos um nó.');
      set({ errors, validating: false });
      return false;
    }

    // Verificar se existe trigger
    const hasTrigger = state.nodes.some(n => n.type === 'trigger');
    if (!hasTrigger) {
      errors.push('Falta trigger! Adiciona um nó de trigger no inicio.');
    }

    // Verificar limite de nós
    if (state.nodes.length > 32) {
      errors.push('Máximo 32 nós permitidos.');
    }

    // Verificar dados necessários em cada nó
    state.nodes.forEach(node => {
      if (node.type === 'trigger' && !node.data.event) {
        errors.push(`Trigger ${node.id} precisa de event.`);
      }
      if (node.type === 'condition') {
        if (node.data.kind === 'contains' && !node.data.value) {
          errors.push(`Condition ${node.id}: falta texto.`);
        }
        if (node.data.kind === 'channel' && !node.data.channelId) {
          errors.push(`Condition ${node.id}: falta channelId.`);
        }
        if (node.data.kind === 'role' && !node.data.roleId) {
          errors.push(`Condition ${node.id}: falta roleId.`);
        }
        if (node.data.kind === 'userId' && !node.data.userId) {
          errors.push(`Condition ${node.id}: falta userId.`);
        }
      }
      if (node.type === 'action') {
        if ((node.data.kind === 'reply' || node.data.kind === 'sendMessage') && !node.data.text) {
          errors.push(`Action ${node.id}: falta texto.`);
        }
        if (node.data.kind === 'assignRole' && !node.data.roleId) {
          errors.push(`Action ${node.id}: falta roleId.`);
        }
        if (node.data.kind === 'mute' && !node.data.durationMs) {
          errors.push(`Action ${node.id}: falta duration.`);
        }
      }
    });

    set({ errors, validating: false });
    return errors.length === 0;
  },

  getFlowJSON: () => {
    const state = get();

    if (!state.validateFlow()) {
      return null;
    }

    // Converter nodes para formato do engine
    const convertedNodes = state.nodes.map(n => {
      const base = { id: n.id, type: n.type };

      if (n.type === 'trigger') {
        return { ...base, event: n.data.event };
      }

      if (n.type === 'condition') {
        return { ...base, kind: n.data.kind, ...n.data };
      }

      if (n.type === 'action') {
        return { ...base, kind: n.data.kind, ...n.data };
      }

      return base;
    });

    return {
      version: 1 as const,
      nodes: convertedNodes,
    };
  },

  clearErrors: () => {
    set({ errors: [] });
  },
}));
