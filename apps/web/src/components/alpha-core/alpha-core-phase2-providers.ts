// ════════════════════════════════════════════════════════════════════════════
// ALPHA CORE — Fase 2: Providers de Capacidades Avançadas
// Geração de imagens, relatórios e código
// ════════════════════════════════════════════════════════════════════════════

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ImageGenerationResult {
  url: string;
  prompt: string;
  style: string;
  provider: string;
}

export interface ReportResult {
  title: string;
  content: string;
  format: 'markdown' | 'json' | 'outline';
  downloadUrl?: string;
}

export interface CodeResult {
  language: string;
  code: string;
  explanation: string;
}

// ── Geração de imagens ─────────────────────────────────────────────────────
//
// OPÇÕES:
// 1. Together AI — API mais barata, suporta SDXL e FLUX
//    Endpoint: https://api.together.xyz/v1/images/generations
//    Modelo recomendado: "black-forest-labs/FLUX.1-schnell"
//
// 2. Replicate — pay-per-use, fácil de integrar
//    Endpoint: https://api.replicate.com/v1/predictions
//
// 3. fal.ai — o mais rápido para FLUX, boa API
//    Endpoint: https://fal.run/fal-ai/flux/schnell
//
// Para a Alpha Network, recomendamos Together AI ou fal.ai.
// A chave deve estar em NEXT_PUBLIC_IMAGE_API_KEY (ou proxy via backend).

const IMAGE_STYLES: Record<string, string> = {
  anime: 'anime style, Studio Ghibli inspired, vibrant colors, detailed illustration',
  realistic: 'photorealistic, 8k, professional photography, dramatic lighting',
  sketch: 'pencil sketch, black and white, clean lines, artistic drawing',
  pixel_art: 'pixel art, 16-bit style, retro game aesthetic',
  watercolor: 'watercolor painting, soft colors, artistic, flowing textures',
};

export async function generateImage(
  prompt: string,
  style: keyof typeof IMAGE_STYLES = 'anime',
  apiKey?: string,
): Promise<ImageGenerationResult> {
  const key = apiKey || process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
  const stylePrompt = IMAGE_STYLES[style] || IMAGE_STYLES.anime;
  const fullPrompt = `${prompt}, ${stylePrompt}, high quality`;

  if (!key) {
    // Demo mode — retorna placeholder
    return {
      url: `https://placehold.co/512x512/${encodeURIComponent('#a78bfa')}/${encodeURIComponent('#1a0a2e')}?text=Alpha+Core+Image`,
      prompt: fullPrompt,
      style,
      provider: 'placeholder',
    };
  }

  // Together AI — FLUX.1-schnell
  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt: fullPrompt,
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha na geração de imagem: ${err}`);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('URL de imagem não recebida.');

  return { url, prompt: fullPrompt, style, provider: 'together-flux' };
}

// ── Geração de relatórios ──────────────────────────────────────────────────
//
// Os relatórios são gerados pela própria Alpha Core (Claude) com um prompt
// específico para produzir markdown estruturado. Depois podem ser convertidos
// para PDF ou DOCX no backend se necessário.

export async function generateReport(
  title: string,
  topic: string,
  format: 'markdown' | 'json' | 'outline' = 'markdown',
  additionalContext?: string,
): Promise<ReportResult> {
  const systemPrompt = `És um especialista em criação de relatórios estruturados e profissionais.
Quando pedido um relatório, geras conteúdo completo, bem organizado e altamente detalhado.
Formato de saída: ${format === 'markdown' ? 'Markdown com cabeçalhos, listas e tabelas quando relevante.' : format === 'json' ? 'JSON estruturado com campos claros.' : 'Esboço hierárquico com níveis de indentação.'}
Sé conciso mas completo. Inclui dados, exemplos e recomendações práticas.`;

  const userPrompt = `Gera um relatório profissional sobre: "${topic}"
Título do relatório: "${title}"
${additionalContext ? `Contexto adicional: ${additionalContext}` : ''}
Inclui: resumo executivo, análise detalhada, pontos-chave, conclusões e recomendações.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) throw new Error('Falha na geração do relatório.');

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  return { title, content, format };
}

// ── Download de relatório como ficheiro ────────────────────────────────────

export function downloadReport(report: ReportResult): void {
  const ext = report.format === 'json' ? 'json' : 'md';
  const mimeType = report.format === 'json' ? 'application/json' : 'text/markdown';
  const blob = new Blob([report.content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Geração de código ──────────────────────────────────────────────────────

export async function generateCode(
  language: string,
  task: string,
  context?: string,
): Promise<CodeResult> {
  const systemPrompt = `És um engenheiro de software de nível sénior. Geras código de produção — limpo, tipado, comentado e sem atalhos. 
Quando geras código, incluis sempre:
1. O código completo e funcional
2. Uma breve explicação do que faz e como usar
3. Exemplos de utilização se relevante
Linguagem solicitada: ${language}
${context ? `Contexto do projecto: ${context}` : ''}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: task }],
    }),
  });

  if (!response.ok) throw new Error('Falha na geração de código.');

  const data = await response.json();
  const fullResponse = data.content?.[0]?.text ?? '';

  // Extrair o bloco de código principal
  const codeMatch = fullResponse.match(/```[\w]*\n([\s\S]*?)```/);
  const code = codeMatch?.[1]?.trim() ?? fullResponse;
  const explanation = fullResponse.replace(/```[\s\S]*?```/g, '').trim();

  return { language, code, explanation };
}

// ── Tool handler para integração no useAlphaCore ───────────────────────────
//
// Quando a Alpha Core decide usar uma tool (image_generation, generate_report,
// generate_code), esta função processa o tool_use e retorna o resultado.

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, any>,
): Promise<{ type: string; result: any; error?: string }> {
  try {
    switch (toolName) {
      case 'generate_image': {
        const result = await generateImage(
          toolInput.prompt,
          toolInput.style ?? 'anime',
        );
        return { type: 'image', result };
      }

      case 'generate_report': {
        const result = await generateReport(
          toolInput.title,
          toolInput.topic,
          toolInput.format ?? 'markdown',
        );
        return { type: 'report', result };
      }

      case 'generate_code': {
        const result = await generateCode(
          toolInput.language,
          toolInput.task,
          toolInput.context,
        );
        return { type: 'code', result };
      }

      default:
        return { type: 'unknown', result: null, error: `Tool desconhecida: ${toolName}` };
    }
  } catch (e: any) {
    return { type: 'error', result: null, error: e.message ?? 'Erro desconhecido' };
  }
}

// ── Configuração de variáveis de ambiente necessárias ─────────────────────
//
// Adiciona ao .env.local do frontend (apps/web):
//
// NEXT_PUBLIC_TOGETHER_API_KEY=     # Para geração de imagens (Together AI)
//                                   # Alternativa: NEXT_PUBLIC_FAL_API_KEY para fal.ai
//
// Nota: Para produção, as chaves de API devem estar no backend (NestJS)
// e o frontend chama um endpoint proxy /api/v1/alpha-core/generate-image
// em vez de chamar a API directamente. Isto protege as chaves.
//
// Endpoint proxy sugerido no NestJS:
// POST /api/v1/alpha-core/image   → chama Together AI / fal.ai
// POST /api/v1/alpha-core/report  → opcional, ou gerado no frontend
// POST /api/v1/alpha-core/code    → opcional
