import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArtService {
  constructor(private prisma: PrismaService) {}

  // ── ARTWORKS ───────────────────────────────────────────────

  async createArt(authorId: string, data: { title: string; description?: string; imageUrl: string; imageUrls?: string; category: string; tags?: string; width?: number; height?: number; musicTrackId?: string }) {
    return this.prisma.alphaArt.create({
      data: {
        authorId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        imageUrls: data.imageUrls,
        category: data.category,
        tags: data.tags,
        width: data.width,
        height: data.height,
        musicTrackId: data.musicTrackId,
      },
    });
  }

  async updateArt(artId: string, userId: string, data: { title?: string; description?: string; category?: string; tags?: string; imageUrl?: string; musicTrackId?: string }) {
    const art = await this.prisma.alphaArt.findUnique({ where: { id: artId } });
    if (!art) throw new NotFoundException('Art not found');
    if (art.authorId !== userId) throw new ForbiddenException();

    return this.prisma.alphaArt.update({
      where: { id: artId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        imageUrl: data.imageUrl,
        musicTrackId: data.musicTrackId,
      },
    });
  }

  async deleteArt(artId: string, userId: string) {
    const art = await this.prisma.alphaArt.findUnique({ where: { id: artId } });
    if (!art) throw new NotFoundException();
    if (art.authorId !== userId) throw new ForbiddenException();

    return this.prisma.alphaArt.delete({ where: { id: artId } });
  }

  async getArts(query: { category?: string; search?: string; page?: number; limit?: number; requesterId?: string; authorId?: string }) {
    const { category, search, page = 1, limit = 40, requesterId, authorId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (authorId) where.authorId = authorId;
    if (category && category !== 'Para Ti') where.category = category;
    if (search) {
      // Divide a frase em palavras-chave (ignorando palavras muito curtas)
      const keywords = search.split(/\s+/).filter(word => word.length > 1);

      // Para cada palavra-chave, gera condições OR em todos os campos relevantes.
      // O resultado final é também um OR: qualquer arte que corresponda a QUALQUER palavra aparece.
      const keywordConditions = keywords.flatMap(kw => [
        { title: { contains: kw, mode: 'insensitive' as const } },
        { description: { contains: kw, mode: 'insensitive' as const } },
        { category: { contains: kw, mode: 'insensitive' as const } },
        { tags: { contains: kw, mode: 'insensitive' as const } },
      ]);

      where.OR = keywordConditions;
    }

    const [arts, total] = await Promise.all([
      this.prisma.alphaArt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
          _count: { select: { likes: true, comments: true } },
          likes: requesterId ? { where: { userId: requesterId } } : false,
          saves: requesterId ? { where: { userId: requesterId } } : false,
          musicTrack: true,
        },
      }),
      this.prisma.alphaArt.count({ where }),
    ]);

    return {
      arts: arts.map(a => {
        let imageUrls: string[] | undefined;
        if (a.imageUrls) { try { imageUrls = JSON.parse(a.imageUrls); } catch { imageUrls = undefined; } }
        return { ...a, imageUrls, liked: a.likes?.length > 0, likes: undefined, saved: a.saves?.length > 0, saves: undefined };
      }),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getArt(id: string, userId?: string) {
    const art = await this.prisma.alphaArt.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId } } : false,
        saves: userId ? { where: { userId } } : false,
        musicTrack: true,
      },
    });
    if (!art) throw new NotFoundException();
    let imageUrls: string[] | undefined;
    if (art.imageUrls) { try { imageUrls = JSON.parse(art.imageUrls); } catch { imageUrls = undefined; } }
    return { ...art, imageUrls, liked: art.likes?.length > 0, likes: undefined, saved: art.saves?.length > 0, saves: undefined };
  }

  async likeArt(artId: string, userId: string) {
    const existing = await this.prisma.alphaArtLike.findUnique({
      where: { artId_userId: { artId, userId } },
    });

    if (existing) {
      await this.prisma.alphaArtLike.delete({ where: { id: existing.id } });
      return { liked: false };
    } else {
      await this.prisma.alphaArtLike.create({ data: { artId, userId } });
      return { liked: true };
    }
  }

  async toggleSaveArt(artId: string, userId: string) {
    const existing = await this.prisma.alphaArtSave.findUnique({
      where: { artId_userId: { artId, userId } },
    });

    if (existing) {
      await this.prisma.alphaArtSave.delete({ where: { id: existing.id } });
      return { saved: false };
    } else {
      await this.prisma.alphaArtSave.create({ data: { artId, userId } });
      return { saved: true };
    }
  }

  async getSavedArts(userId: string) {
    const saves = await this.prisma.alphaArtSave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        art: {
          include: {
            author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId } },
            saves: { where: { userId } },
          }
        }
      }
    });

    return saves.map(s => ({
      ...s.art,
      liked: s.art.likes?.length > 0,
      likes: undefined,
      saved: true,
      saves: undefined
    }));
  }

  async addComment(artId: string, userId: string, content: string) {
    return this.prisma.alphaArtComment.create({
      data: { artId, authorId: userId, content }
    });
  }

  saveArtUpload(userId: string, file: Express.Multer.File): { url: string; filePath: string } {
    const dir = path.normalize(path.join(process.cwd(), 'uploads', 'art'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const fileName = `${userId}-${Date.now()}${ext}`;
    const filePath = path.normalize(path.join(dir, fileName));
    
    if (!filePath.startsWith(dir)) throw new BadRequestException('Invalid file path');
    
    fs.writeFileSync(filePath, file.buffer);
    return { url: `/uploads/art/${fileName}`, filePath };
  }

  // ── COLLECTIONS ───────────────────────────────────────────

  saveCollectionCoverUpload(userId: string, file: Express.Multer.File) {
    const dir = path.normalize(path.join(process.cwd(), 'uploads', 'art-collections'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const fileName = `${userId}-${Date.now()}${ext}`;
    const filePath = path.normalize(path.join(dir, fileName));
    
    if (!filePath.startsWith(dir)) throw new BadRequestException('Invalid file path');
    
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/art-collections/${fileName}`;
  }

  async createCollection(authorId: string, data: { title: string; description?: string; isPublic: boolean; coverUrl?: string; parentId?: string; isGroup?: boolean }) {
    return this.prisma.alphaArtCollection.create({
      data: {
        authorId,
        title: data.title,
        description: data.description,
        isPublic: data.isPublic,
        coverUrl: data.coverUrl,
        parentId: data.parentId || null,
        isGroup: data.isGroup ?? false,
      },
    });
  }

  async updateCollection(id: string, userId: string, data: { title?: string; description?: string; isPublic?: boolean; coverUrl?: string | null; parentId?: string | null; isGroup?: boolean }) {
    console.log(`[ArtService] updateCollection searching for ID: ${id}`);
    const col = await this.prisma.alphaArtCollection.findUnique({ where: { id } });
    if (!col) {
      console.error(`[ArtService] updateCollection: Collection NOT FOUND for ID: ${id}`);
      throw new NotFoundException('Collection not found');
    }
    if (col.authorId !== userId) throw new ForbiddenException();

    return this.prisma.alphaArtCollection.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isPublic: data.isPublic,
        coverUrl: data.coverUrl,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        isGroup: data.isGroup !== undefined ? data.isGroup : undefined,
      },
    });
  }

  async updateCollectionViewMode(id: string, userId: string, viewMode: string) {
    const col = await this.prisma.alphaArtCollection.findUnique({ 
      where: { id },
      include: { collaborators: true }
    });
    if (!col) throw new NotFoundException('Collection not found');
    
    const isOwner = col.authorId === userId;
    const isCollab = col.collaborators.some(c => c.userId === userId);
    if (!isOwner && !isCollab) throw new ForbiddenException();

    return this.prisma.alphaArtCollection.update({
      where: { id },
      data: { viewMode },
    });
  }

  async updateCollectionLayout(id: string, userId: string, layout: { artId: string; positionX: number; positionY: number; width?: number; height?: number; zIndex?: number }[]) {
    console.log(`[ArtService] updateCollectionLayout for collection ID: ${id}, user: ${userId}, items count: ${layout.length}`);
    const col = await this.prisma.alphaArtCollection.findUnique({ 
      where: { id },
      include: { collaborators: true }
    });
    if (!col) throw new NotFoundException('Collection not found');

    const isOwner = col.authorId === userId;
    const isCollab = col.collaborators.some(c => c.userId === userId);
    if (!isOwner && !isCollab) throw new ForbiddenException();

    try {
      const updates = layout.map(item => 
        this.prisma.alphaArtCollectionItem.update({
          where: { collectionId_artId: { collectionId: id, artId: item.artId } },
          data: {
            positionX: item.positionX,
            positionY: item.positionY,
            width: item.width !== undefined ? item.width : undefined,
            height: item.height !== undefined ? item.height : undefined,
            zIndex: item.zIndex !== undefined ? item.zIndex : undefined,
          }
        })
      );

      await this.prisma.$transaction(updates);
      console.log(`[ArtService] updateCollectionLayout SUCCEEDED for collection: ${id}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[ArtService] updateCollectionLayout FAILED for collection: ${id}. Error:`, err);
      throw err;
    }
  }

  async addArtToCollection(collectionId: string, artId: string, userId: string) {
    const [art, collection] = await Promise.all([
      this.prisma.alphaArt.findUnique({ where: { id: artId } }),
      this.prisma.alphaArtCollection.findUnique({ 
        where: { id: collectionId },
        include: { collaborators: true } 
      }),
    ]);

    if (!art || !collection) throw new NotFoundException();
    
    const isOwner = collection.authorId === userId;
    const isCollab = collection.collaborators.some(c => c.userId === userId);
    if (!isOwner && !isCollab) throw new ForbiddenException();

    return this.prisma.alphaArtCollectionItem.upsert({
      where: { collectionId_artId: { collectionId, artId } },
      create: { collectionId, artId },
      update: {},
    });
  }

  async removeArtFromCollection(collectionId: string, artId: string, userId: string) {
    const collection = await this.prisma.alphaArtCollection.findUnique({ 
      where: { id: collectionId },
      include: { collaborators: true }
    });
    if (!collection) throw new NotFoundException();

    const isOwner = collection.authorId === userId;
    const isCollab = collection.collaborators.some(c => c.userId === userId);
    if (!isOwner && !isCollab) throw new ForbiddenException();

    await this.prisma.alphaArtCollectionItem.deleteMany({
      where: { collectionId, artId }
    });
    return { success: true };
  }

  async getCollections(userId: string, requesterId?: string) {
    // Normalize literal string 'undefined' or 'null' from query params
    const normalizedRequesterId = (requesterId === 'undefined' || requesterId === 'null') ? undefined : requesterId;

    const where: any = {
      OR: [
        { authorId: userId },
        { collaborators: { some: { userId } } }
      ]
    };

    // If the requester is not the owner of these collections, filter out private ones
    if (userId !== normalizedRequesterId) {
      where.AND = [
        {
          OR: [
            { isPublic: true },
            normalizedRequesterId ? { collaborators: { some: { userId: normalizedRequesterId } } } : undefined
          ].filter(Boolean)
        }
      ];
    }

    return this.prisma.alphaArtCollection.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        subgroups: {
          include: {
            _count: { select: { items: true } },
            items: {
              orderBy: { createdAt: 'desc' },
              include: { 
                art: { 
                  include: { 
                    author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } }
                  } 
                } 
              }
            }
          }
        },
        items: {
          orderBy: { createdAt: 'desc' },
          include: { 
            art: { 
              include: { 
                author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } }
              } 
            } 
          }
        },
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        forkedFrom: { include: { author: { select: { id: true, profile: { select: { username: true, displayName: true } } } } } }
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCollection(id: string) {
    const collection = await this.prisma.alphaArtCollection.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        forkedFrom: { include: { author: { select: { id: true, profile: { select: { username: true, displayName: true } } } } } },
        collaborators: {
          include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
        },
        subgroups: {
          include: {
            _count: { select: { items: true } },
            items: {
              orderBy: { createdAt: 'desc' },
              include: { 
                art: { 
                  include: { 
                    author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } }
                  } 
                } 
              }
            }
          }
        },
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            art: {
              include: {
                author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
                _count: { select: { likes: true, comments: true } },
              }
            }
          }
        }
      }
    });
    if (!collection) throw new NotFoundException();
    return collection;
  }

  async addCollaborator(collectionId: string, authorId: string, targetUserId: string) {
    const collection = await this.prisma.alphaArtCollection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new NotFoundException();
    if (collection.authorId !== authorId) throw new ForbiddenException('Only owner can add collaborators');

    return this.prisma.alphaArtCollectionCollaborator.upsert({
      where: { collectionId_userId: { collectionId, userId: targetUserId } },
      create: { collectionId, userId: targetUserId },
      update: {},
    });
  }

  async removeCollaborator(collectionId: string, authorId: string, targetUserId: string) {
    const collection = await this.prisma.alphaArtCollection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new NotFoundException();
    if (collection.authorId !== authorId && authorId !== targetUserId) throw new ForbiddenException();

    await this.prisma.alphaArtCollectionCollaborator.deleteMany({
      where: { collectionId, userId: targetUserId }
    });
    return { success: true };
  }

  async forkCollection(collectionId: string, userId: string) {
    const sourceCol = await this.prisma.alphaArtCollection.findUnique({
      where: { id: collectionId },
      include: {
        items: true,
        collaborators: true,
        subgroups: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sourceCol) throw new NotFoundException('Collection not found');

    const isPublic = sourceCol.isPublic;
    const isOwner = sourceCol.authorId === userId;
    const isCollab = sourceCol.collaborators.some(c => c.userId === userId);

    if (!isPublic && !isOwner && !isCollab) {
      throw new ForbiddenException('Cannot fork private collection');
    }

    const newCollection = await this.cloneCollectionTree(sourceCol.id, userId, null);
    
    return this.getCollection(newCollection.id);
  }

  private async cloneCollectionTree(sourceColId: string, targetUserId: string, parentId: string | null): Promise<any> {
    const source = await this.prisma.alphaArtCollection.findUnique({
      where: { id: sourceColId },
      include: {
        items: true,
        subgroups: true,
      },
    });

    if (!source) return null;

    const clonedCol = await this.prisma.alphaArtCollection.create({
      data: {
        authorId: targetUserId,
        title: source.title,
        description: source.description,
        coverUrl: source.coverUrl,
        isPublic: source.isPublic,
        isGroup: false,
        viewMode: source.viewMode,
        parentId: parentId,
        forkedFromId: source.id,
      },
    });

    if (source.items && source.items.length > 0) {
      const itemsToCreate = source.items.map(item => ({
        collectionId: clonedCol.id,
        artId: item.artId,
        positionX: item.positionX,
        positionY: item.positionY,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
      }));

      await this.prisma.alphaArtCollectionItem.createMany({
        data: itemsToCreate,
      });
    }

    if (source.subgroups && source.subgroups.length > 0) {
      for (const sub of source.subgroups) {
        await this.cloneCollectionTree(sub.id, targetUserId, clonedCol.id);
      }
    }

    return clonedCol;
  }
}
