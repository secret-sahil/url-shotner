import { Injectable } from '@nestjs/common';
import { CreateShortDto } from './dto/create-short.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';

@Injectable()
export class ShortService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createShortDto: CreateShortDto) {
    await this.prisma.urlShortener.create({
      data: {
        originalUrl: createShortDto.originalUrl,
        shortCode: Math.random().toString(36).substring(2, 8),
      },
    });
    return {
      message: 'Short URL created successfully',
    };
  }

  async findOne(id: string, res: Response) {
    const data = await this.prisma.urlShortener.findUnique({
      where: { shortCode: id },
      select: { originalUrl: true },
    });
    if (!data) {
      return res.status(404).json({ message: 'Short URL not found' });
    }
    res.redirect(data.originalUrl);
  }
}
