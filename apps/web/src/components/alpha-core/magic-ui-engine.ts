/**
 * Magic UI Engine
 * Permite que a Alpha controle a interface através de comandos especiais
 */

export interface MagicUIAction {
  type: 'SET_THEME' | 'NAVIGATE' | 'TOGGLE_SIDEBAR' | 'SHOW_TOAST';
  payload: any;
}

export const parseMagicUI = (text: string): { cleanText: string, actions: MagicUIAction[] } => {
  const actions: MagicUIAction[] = [];
  const regex = /\[MAGIC_UI:([A-Z_]+):([\s\S]*?)\]/g;
  
  let match;
  let cleanText = text;
  
  while ((match = regex.exec(text)) !== null) {
    try {
      const type = match[1] as MagicUIAction['type'];
      let jsonStr = match[2].trim();
      
      // Tenta normalizar o JSON se vier mal formatado
      if (!jsonStr.startsWith('{')) jsonStr = `{${jsonStr}}`;
      jsonStr = jsonStr.replace(/'/g, '"'); // Troca aspas simples por duplas
      
      const payload = JSON.parse(jsonStr);
      actions.push({ type, payload });
      
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.error('Erro ao processar Magic UI command:', e);
    }
  }
  
  return { cleanText: cleanText.trim(), actions };
};

export const executeMagicUI = (action: MagicUIAction, handlers: any) => {
  console.log('[MagicUI] Executing:', action.type, action.payload);
  
  switch (action.type) {
    case 'SET_THEME':
      if (handlers.setTheme) handlers.setTheme(action.payload);
      break;
    case 'NAVIGATE':
      if (handlers.navigate) handlers.navigate(action.payload.path);
      break;
    case 'TOGGLE_SIDEBAR':
      if (handlers.toggleSidebar) handlers.toggleSidebar(action.payload.open);
      break;
    case 'SHOW_TOAST':
      if (handlers.showToast) handlers.showToast(action.payload.message);
      break;
    default:
      console.warn('Comando Magic UI desconhecido:', action.type);
  }
};
