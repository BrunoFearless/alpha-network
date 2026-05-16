import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArtService {
  constructor(private prisma: PrismaService) {}

  // ── ARTWORKS ───────────────────────────────────────────────

  async createArt(authorId: string, data: { title: string; description?: string; imageUrl: string; category: string; tags?: string; width?: number; height?: number }) {
    return this.prisma.alphaArt.create({
      data: {
        authorId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        category: data.category,
        tags: data.tags,
        width: data.width,
        height: data.height,
      },
    });
  }

  async updateArt(artId: string, userId: string, data: { title?: string; description?: string; category?: string; tags?: string; imageUrl?: string }) {
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
      },
    });
  }

  async deleteArt(artId: string, userId: string) {
    const art = await this.prisma.alphaArt.findUnique({ where: { id: artId } });
    if (!art) throw new NotFoundException();
    if (art.authorId !== userId) throw new ForbiddenException();

    return this.prisma.alphaArt.delete({ where: { id: artId } });
  }

  async getArts(query: { category?: string; search?: string; page?: number; limit?: number; requesterId?: string }) {
    const { category, search, page = 1, limit = 40, requesterId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category && category !== 'Para Ti') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
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
        },
      }),
      this.prisma.alphaArt.count({ where }),
    ]);

    return {
      arts: arts.map(a => ({ ...a, liked: a.likes?.length > 0, likes: undefined })),
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
      },
    });
    if (!art) throw new NotFoundException();
    return { ...art, liked: art.likes?.length > 0, likes: undefined };
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

  async addComment(artId: string, userId: string, content: string) {
    return this.prisma.alphaArtComment.create({
      data: { artId, authorId: userId, content }
    });
  }

  saveArtUpload(userId: string, file: Express.Multer.File) {
    const dir = path.join(process.cwd(), 'uploads', 'art');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const fileName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, fileName), file.buffer);
    return `/uploads/art/${fileName}`;
  }

  // ── COLLECTIONS ───────────────────────────────────────────

  saveCollectionCoverUpload(userId: string, file: Express.Multer.File) {
    const dir = path.join(process.cwd(), 'uploads', 'art-collections');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const fileName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, fileName), file.buffer);
    return `/uploads/art-collections/${fileName}`;
  }

  async createCollection(authorId: string, data: { title: string; description?: string; isPublic: boolean; coverUrl?: string }) {
    return this.prisma.alphaArtCollection.create({
      data: {
        authorId,
        title: data.title,
        description: data.description,
        isPublic: data.isPublic,
        coverUrl: data.coverUrl,
      },
    });
  }

  async updateCollection(id: string, userId: string, data: { title?: string; description?: string; isPublic?: boolean; coverUrl?: string | null }) {
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
      },
    });
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

  async getCollections(userId: string) {
    return this.prisma.alphaArtCollection.findMany({
      where: {
        OR: [
          { authorId: userId },
          { collaborators: { some: { userId } } }
        ]
      },
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
        },
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } }
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCollection(id: string) {
    const collection = await this.prisma.alphaArtCollection.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        collaborators: {
          include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
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
}
