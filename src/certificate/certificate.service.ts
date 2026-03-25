import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib/cjs';
import fontkit from '@pdf-lib/fontkit';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private readonly templatesDir = resolve(
    process.cwd(),
    'public',
    'certificate_templates',
  );

  private readonly fontsDir = resolve(process.cwd(), 'public', 'fonts');

  private readonly generatedCertificatesDir = resolve(
    process.cwd(),
    'public',
    'generated_certificates',
  );

  private async generateCertificatePdf(options: {
    name: string;
    course: string;
    issuedAt: string;
    certificateId: string;
    templateFile: string;
  }) {
    const templatePath = join(this.templatesDir, options.templateFile);

    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${options.templateFile}`);
    }

    const headingFontPath = join(this.fontsDir, 'heading.ttf');
    const bodyFontPath = join(this.fontsDir, 'body.ttf');

    const [templateBytes, headingFontBytes, bodyFontBytes] = await Promise.all([
      readFile(templatePath),
      readFile(headingFontPath),
      readFile(bodyFontPath),
    ]);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(
      fontkit as unknown as Parameters<typeof pdfDoc.registerFontkit>[0],
    );

    const headingFont = await pdfDoc.embedFont(headingFontBytes);
    const bodyFont = await pdfDoc.embedFont(bodyFontBytes);

    const [firstPage] = pdfDoc.getPages();
    const { width, height } = firstPage.getSize();

    const drawCenteredText = (
      page: PDFPage,
      text: string,
      y: number,
      size: number,
      font: PDFFont,
      color: RGB,
    ) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    };

    const headingColor = rgb(0.14, 0.2, 0.3);
    const bodyColor = rgb(0.1, 0.1, 0.1);

    drawCenteredText(
      firstPage,
      'Name',
      height * 0.58,
      24,
      headingFont,
      headingColor,
    );
    drawCenteredText(
      firstPage,
      options.name,
      height * 0.53,
      34,
      bodyFont,
      bodyColor,
    );

    drawCenteredText(
      firstPage,
      'Course',
      height * 0.46,
      20,
      headingFont,
      headingColor,
    );
    drawCenteredText(
      firstPage,
      options.course,
      height * 0.42,
      18,
      bodyFont,
      bodyColor,
    );

    drawCenteredText(
      firstPage,
      'Date',
      height * 0.37,
      20,
      headingFont,
      headingColor,
    );
    drawCenteredText(
      firstPage,
      options.issuedAt,
      height * 0.33,
      18,
      bodyFont,
      bodyColor,
    );

    drawCenteredText(
      firstPage,
      `Certificate ID: ${options.certificateId}`,
      height * 0.08,
      12,
      bodyFont,
      rgb(0.35, 0.35, 0.35),
    );

    return Buffer.from(await pdfDoc.save());
  }

  async getUniqueCertificateId(): Promise<string> {
    // Generate a random alphanumeric string of length 5 and prefix it with "HM-"
    const id = `HM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const existing = await this.prisma.certificate.findUnique({
      where: { certificateId: id },
    });
    if (existing) {
      return this.getUniqueCertificateId(); // Recursively generate a new ID if collision occurs
    }
    return id;
  }

  async create(createCertificateDto: CreateCertificateDto) {
    await mkdir(this.generatedCertificatesDir, { recursive: true });

    const selectedTemplate =
      (createCertificateDto.template || 'sawayam.pdf').trim() || 'sawayam.pdf';

    const results: Array<{
      certificateId: string;
      email: string;
      name: string;
      course: string;
      template: string;
      issuedAt: string;
      certificatePdfPath: string;
      isEmailQueued: boolean;
    }> = [];

    for (const cert of createCertificateDto.certificates) {
      const certificateId = await this.getUniqueCertificateId();
      const issuedAt = cert.issuedAt ? new Date(cert.issuedAt) : new Date();
      const template =
        (cert.template || selectedTemplate).trim() || 'sawayam.pdf';

      const pdfBuffer = await this.generateCertificatePdf({
        name: cert.name.trim(),
        course: cert.course.trim(),
        issuedAt: issuedAt.toISOString().slice(0, 10),
        certificateId,
        templateFile: template,
      });

      const certificateFileName = `${certificateId}.pdf`;
      const certificatePdfPath = join(
        this.generatedCertificatesDir,
        certificateFileName,
      );
      await writeFile(certificatePdfPath, pdfBuffer);

      await this.prisma.certificate.create({
        data: {
          certificateId,
          email: cert.email.trim().toLowerCase(),
          name: cert.name.trim(),
          course: cert.course.trim(),
          template,
          issuedAt,
        },
      });

      await this.mailService.sendCertificateEmail({
        name: cert.name.trim(),
        email: cert.email.trim().toLowerCase(),
        certificatePdfPath,
      });

      results.push({
        certificateId,
        email: cert.email.trim().toLowerCase(),
        name: cert.name.trim(),
        course: cert.course.trim(),
        template,
        issuedAt: issuedAt.toISOString(),
        certificatePdfPath,
        isEmailQueued: true,
      });
    }

    return {
      count: results.length,
      certificates: results,
    };
  }

  findAll() {
    return this.prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.certificate.findUnique({ where: { id } });
  }

  update(id: string, updateCertificateDto: UpdateCertificateDto) {
    const data = {
      ...updateCertificateDto,
      issuedAt: updateCertificateDto.issuedAt
        ? new Date(updateCertificateDto.issuedAt)
        : undefined,
    };

    return this.prisma.certificate.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.certificate.delete({ where: { id } });
  }
}
