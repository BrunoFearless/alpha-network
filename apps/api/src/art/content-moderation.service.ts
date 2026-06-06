import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as FormDataLib from 'form-data';
import axios from 'axios';

// ── WORD LISTS ────────────────────────────────────────────────────────────────
// Comprehensive multilingual blocked terms (PT / EN / ES)

const SEXUAL_EXPLICIT: string[] = [
  // Portuguese
  'porno', 'pornô', 'pornografia', 'nude', 'nudes', 'nudez', 'desnudo', 'pelado',
  'buceta', 'xota', 'boceta', 'xoxota', 'pepeca', 'cona',
  'caralho', 'pinto', 'rola', 'pau', 'piroca', 'pica',
  'foder', 'trepar', 'transar', 'sexo', 'fazer sexo', 'sexo explicito',
  'gozar', 'gozo', 'ejacul', 'orgasmo', 'punheta', 'cuzao', 'cuzinho',
  'cu de', 'arrombado', 'arrombada', 'chupeta', 'chupar pau', 'mamada',
  'fetiche', 'sadomaso', 'bdsm', 'bondage', 'dominatrix',
  'masturbac', 'masturbar',
  'prostituta', 'prostitut', 'puta', 'putaria', 'putiaria',
  'bordel', 'lupanar', 'escort sexual',
  'pornstar', 'webcam sex', 'leaking nudes',
  'hentai', 'ecchi', 'loli', 'lolicon', 'shotacon',
  'r18', 'nsfw', 'only fans', 'conteudo adulto',
  // English
  'porn', 'xxx', 'pussy', 'vagina', 'vulva', 'cock', 'dick', 'penis',
  'blowjob', 'handjob', 'rimjob', 'sex tape', 'nude leak', 'sex',
  'cum', 'semen', 'ejaculation', 'orgasm', 'masturbat', 'fingering',
  'fucking', 'getting fucked', 'getting laid', 'fuck me', 'fuck you',
  'slut', 'whore', 'hooker', 'stripper', 'striptease',
  'boner', 'erection', 'wet pussy', 'tits', 'boobs', 'nipple',
  'onlyfans', 'xvideos', 'pornhub', 'xhamster', 'redtube', 'youporn',
  'nudist', 'nude beach', 'naked',
  // Spanish
  'porno', 'coño', 'chocho', 'verga', 'polla', 'pene', 'follando', 'culiando',
  'mamahuevo', 'pendejo',
];

const VIOLENCE_GORE: string[] = [
  // Portuguese
  'gore', 'decapita', 'decapitado', 'decapitacao',
  'mutilac', 'mutilado', 'desmembrado', 'desmembramento',
  'massacre', 'genocidio', 'tortura', 'torturado',
  'sangue derramado', 'tripas', 'entranhas', 'cadaver', 'corpo mutilado',
  'suicidio', 'enforcamento', 'enforcado', 'autolesao', 'se cortar',
  'se machucar', 'se matar', 'metodos de suicidio',
  // English
  'beheading', 'beheaded', 'gore content', 'snuff film', 'snuff video',
  'self harm', 'self-harm', 'self mutilation', 'suicide method',
  'hanging body', 'slitting wrists', 'blood and guts',
  'torture porn', 'animal abuse', 'animal cruelty',
  'necrophilia', 'necrophil',
];

const HATE_SPEECH: string[] = [
  // International
  'nazismo', 'nazista', 'nazi', 'neonazi', 'neo-nazi',
  'ku klux klan', 'kkk', 'fascismo', 'fascist', 'fascismo',
  'supremacista', 'white supremacy', 'white power',
  'antissemitismo', 'antisemit', 'holocausto negacao',
  'racismo', 'racista', 'racist', 'racism',
  'xenofobia', 'xenofob', 'xenophob',
  'homofobia', 'homofob', 'homophob',
  'transfobia', 'transfob',
  'matar negros', 'matar gays', 'matar judeus',
  'exterminacao', 'extermination',
  'islamofobia', 'islamophob',
  'discurso de odio', 'hate speech',
];

const DRUGS_ILLEGAL: string[] = [
  'heroina', 'heroin',
  'cocaina', 'cocaine', 'coke dealer', 'comprar cocaina',
  'metanfetamina', 'methamphetamine', 'crystal meth',
  'fentanil', 'fentanyl',
  'crack', 'pasta base',
  'lsd blotter', 'comprar drogas', 'vender drogas', 'trafico de drogas',
  'drug dealer', 'drug trafficking',
];

const CHILD_SAFETY: string[] = [
  'lolicon', 'shotacon', 'underage', 'menores', 'crianca nua',
  'menino pelado', 'menina pelada', 'crianca sexualizada',
  'cp ', ' cp', 'csam', 'child porn', 'child abuse',
  'pedo', 'pedofilia', 'pedofil', 'pedophil',
  'menor de idade nude', 'menor nude',
];

// Combined master list
const ALL_BLOCKED_TERMS: string[] = [
  ...SEXUAL_EXPLICIT,
  ...VIOLENCE_GORE,
  ...HATE_SPEECH,
  ...DRUGS_ILLEGAL,
  ...CHILD_SAFETY,
];

// Category map for detailed error messages
const CATEGORY_MAP: [string[], string][] = [
  [CHILD_SAFETY, 'conteúdo que envolve menores de idade'],
  [SEXUAL_EXPLICIT, 'conteúdo sexual explícito'],
  [VIOLENCE_GORE, 'conteúdo violento ou gore'],
  [HATE_SPEECH, 'discurso de ódio ou extremismo'],
  [DRUGS_ILLEGAL, 'conteúdo relacionado a drogas ilegais'],
];

// ── NORMALIZER ────────────────────────────────────────────────────────────────

function normalizeForMatching(text: string): string {
  let t = text.toLowerCase();

  // Leet speak substitution (covers obfuscation like "p0rn", "s3x", etc.)
  t = t
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/6/g, 'g')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/\|/g, 'l')
    .replace(/!/g, 'i');

  // Remove diacritics / accents
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Replace non-alphanumeric chars with space
  t = t.replace(/[^a-z0-9\s]/g, ' ');

  // Collapse multiple spaces
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}

// ── TEXT MODERATION ───────────────────────────────────────────────────────────

interface TextCheckResult {
  flagged: boolean;
  category?: string;
  matchedTerm?: string;
}

function checkText(text: string): TextCheckResult {
  if (!text) return { flagged: false };

  const normalized = normalizeForMatching(text);
  const paddedNormalized = ` ${normalized} `;

  for (const [list, category] of CATEGORY_MAP) {
    for (const term of list) {
      const normalizedTerm = normalizeForMatching(term);
      
      // Ao adicionar espaços ao redor do texto normalizado e do termo a verificar,
      // garantimos correspondência exata de palavras/frases e evitamos falsos positivos
      // de forma segura e imune a vulnerabilidades de ReDoS.
      if (paddedNormalized.includes(` ${normalizedTerm} `)) {
        return { flagged: true, category, matchedTerm: term };
      }
    }
  }

  return { flagged: false };
}

// ── IMAGE MODERATION ─────────────────────────────────────────────────────────
// Uses Sightengine API when SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET are set.
// Falls back gracefully if not configured.

interface ImageCheckResult {
  flagged: boolean;
  category?: string;
  score?: number;
  skipped?: boolean;
}

async function checkImage(filePath: string): Promise<ImageCheckResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    // Not configured → skip image check but still apply text check
    return { flagged: false, skipped: true };
  }

  try {
    const formData = new FormDataLib();
    formData.append('media', fs.createReadStream(filePath));
    formData.append('models', 'nudity-2.1,gore,violence,weapon,recreational_drug');
    formData.append('api_user', apiUser);
    formData.append('api_secret', apiSecret);

    const response = await axios.post('https://api.sightengine.com/1.0/check.json', formData, {
      headers: formData.getHeaders(),
    });

    const result = response.data;

    // Check nudity (Sightengine 2.1 model)
    // Adjusted to allow "suggestive" (bikini, crop tops, gym wear) like Pinterest.
    if (result.nudity) {
      // 1. Explicit sexual acts or exposed genitals (Strictly block)
      const explicitScore = Math.max(
        result.nudity.sexual_activity || 0,
        result.nudity.sexual_display || 0
      );
      
      // 2. Erotica (exposed breasts, fully exposed buttocks) (Block if very confident)
      const eroticaScore = result.nudity.erotica || 0;

      if (explicitScore > 0.50) {
        return { flagged: true, category: 'nudez explícita ou atos sexuais', score: explicitScore };
      }
      
      if (eroticaScore > 0.85) {
        return { flagged: true, category: 'nudez frontal (erótica)', score: eroticaScore };
      }
      
      // We intentionally IGNORE result.nudity.suggestive to allow bikinis, crop tops, and anime ecchi.
    }

    // Check gore
    if (result.gore?.prob > 0.60) {
      return { flagged: true, category: 'conteúdo gore/violência gráfica', score: result.gore.prob };
    }

    // Check violence
    if (result.violence?.prob > 0.75) {
      return { flagged: true, category: 'conteúdo violento', score: result.violence.prob };
    }

    // Check recreational drugs
    if (result.recreational_drug?.prob > 0.65) {
      return { flagged: true, category: 'conteúdo relacionado a drogas', score: result.recreational_drug.prob };
    }

    return { flagged: false };
  } catch (error: any) {
    console.warn('[ContentModeration] Image check failed, skipping:', error?.response?.data || error.message);
    return { flagged: false, skipped: true };
  }
}

// ── SERVICE ───────────────────────────────────────────────────────────────────

export interface ModerationInput {
  title: string;
  description?: string;
  tags?: string;
  imagePaths?: string[]; // Paths to uploaded image files to scan
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class ContentModerationService {
  /**
   * Full moderation check — text + images.
   * Throws BadRequestException if content is blocked.
   */
  async enforce(input: ModerationInput): Promise<void> {
    const result = await this.check(input);
    if (!result.allowed) {
      throw new BadRequestException(result.reason);
    }
  }

  /**
   * Full moderation check — returns a result without throwing.
   */
  async check(input: ModerationInput): Promise<ModerationResult> {
    // 1. Text checks (title, description, tags)
    const textsToCheck = [
      input.title,
      input.description || '',
      input.tags || '',
    ];

    for (const text of textsToCheck) {
      const result = checkText(text);
      if (result.flagged) {
        return {
          allowed: false,
          reason: `Publicação rejeitada: o conteúdo contém ${result.category}. Este tipo de conteúdo não é permitido na Alpha Art. Se acreditas que isto é um engano, contacta o suporte.`,
        };
      }
    }

    // 2. Image analysis (if files provided and API is configured)
    if (input.imagePaths && input.imagePaths.length > 0) {
      for (const filePath of input.imagePaths) {
        if (!fs.existsSync(filePath)) continue;

        const imageResult = await checkImage(filePath);
        if (imageResult.flagged) {
          return {
            allowed: false,
            reason: `Publicação rejeitada: a imagem foi identificada como contendo ${imageResult.category} (confiança: ${Math.round((imageResult.score || 0) * 100)}%). Este tipo de conteúdo não é permitido na Alpha Art.`,
          };
        }
      }
    }

    return { allowed: true };
  }
}
