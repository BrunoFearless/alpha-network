import { Injectable, BadRequestException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffprobeStatic from 'ffprobe-static';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

// Configura o ffprobe utilizando a versão estática
ffmpeg.setFfprobePath(ffprobeStatic.path);

const ffprobe = promisify(ffmpeg.ffprobe) as unknown as (file: string) => Promise<ffmpeg.FfprobeData>;

@Injectable()
export class MediaService {
  /**
   * Valida o tipo MIME e, se for um vídeo, verifica se a sua duração respeita o limite definido.
   * Guarda o ficheiro no disco e devolve o URL final.
   * Em caso de falha (ex: vídeo longo), elimina o ficheiro gerado.
   */
  async saveValidatedMedia(
    file: Express.Multer.File,
    targetFolder: string,
    options: {
      maxFileSizeMb: number;
      allowedMimes: string[];
      maxVideoDurationSecs?: number; // Ex: 5 segundos
    }
  ): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Ficheiro em falta.');
    }
    
    const maxBytes = options.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(`Ficheiro demasiado grande (máx. ${options.maxFileSizeMb}MB).`);
    }

    if (!options.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de ficheiro não permitido.');
    }

    const isVideo = file.mimetype.startsWith('video/');

    const ext = (file.originalname.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? '').slice(0, 8) || (isVideo ? '.mp4' : '.jpg');
    const name = `${randomUUID()}${ext}`;
    const dir = join(process.cwd(), 'uploads', targetFolder);
    
    await mkdir(dir, { recursive: true });
    
    const filePath = join(dir, name);
    await writeFile(filePath, file.buffer);

    // Se for vídeo, tem um max duration, verificar usando ffprobe
    if (isVideo && options.maxVideoDurationSecs) {
      try {
        const metadata = await ffprobe(filePath);
        const duration = metadata.format.duration;
        
        if (duration === undefined || duration > options.maxVideoDurationSecs) {
          // Apagar o ficheiro que foi escrito, já que excede o tempo limite
          await unlink(filePath).catch(() => {});
          throw new BadRequestException(`O vídeo excede a duração permitida (máx. ${options.maxVideoDurationSecs}s).`);
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        
        // Em caso de erro de parse, também falhamos seguro e limpamos
        await unlink(filePath).catch(() => {});
        throw new BadRequestException('Ficheiro de vídeo inválido ou corrompido.');
      }
    }

    const origin = process.env.API_PUBLIC_ORIGIN ?? `http://localhost:${process.env.API_PORT ?? 3001}`;
    const url = `${origin.replace(/\/$/, '')}/uploads/${targetFolder}/${name}`;

    return url;
  }
}
