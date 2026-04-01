import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib/cjs';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
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

  private getVerificationUrl(certificateId: string) {
    return `https://certify.hopingminds.com/certificate/${certificateId}`;
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: string;
    meta?: { target?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return (
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code === 'P2002'
    );
  }

  private async generateCertificatePdf(options: {
    name: string;
    course: string;
    issuedAt: string;
    certificateId: string;
    templateFile: string;
    grades?: string | null;
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

    const drawCenteredText = ({
      page,
      text,
      y,
      size,
      font,
      color,
    }: {
      page: PDFPage;
      text: string;
      y: number;
      size: number;
      font: PDFFont;
      color: RGB;
    }) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    };

    const drawText = ({
      page,
      text,
      x,
      y,
      size,
      font,
      color,
    }: {
      page: PDFPage;
      text: string;
      x: number;
      y: number;
      size: number;
      font: PDFFont;
      color: RGB;
    }) => {
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color,
      });
    };

    // const headingColor = rgb(0.14, 0.2, 0.3);
    const bodyColor = rgb(0.1, 0.1, 0.1);

    if (options.templateFile.toLowerCase().includes('sawayam')) {
      drawCenteredText({
        page: firstPage,
        text: options.name,
        y: height * 0.59,
        size: 38,
        font: headingFont,
        color: bodyColor,
      });

      drawCenteredText({
        page: firstPage,
        text: options.course,
        y: height * 0.44,
        size: 18,
        font: bodyFont,
        color: bodyColor,
      });

      drawText({
        page: firstPage,
        text: options.issuedAt,
        x: width * 0.146,
        y: height * 0.17,
        size: 14,
        font: bodyFont,
        color: bodyColor,
      });

      drawCenteredText({
        page: firstPage,
        text: `Certificate ID: ${options.certificateId}`,
        y: height * 0.01,
        size: 12,
        font: bodyFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    } else if (options.templateFile.toLocaleLowerCase().includes('anna')) {
      drawCenteredText({
        page: firstPage,
        text: options.name,
        y: height * 0.635,
        size: 38,
        font: headingFont,
        color: bodyColor,
      });

      drawCenteredText({
        page: firstPage,
        text: options.course,
        y: height * 0.422,
        size: 18,
        font: bodyFont,
        color: bodyColor,
      });

      drawText({
        page: firstPage,
        text: options.issuedAt,
        x: width * 0.146,
        y: height * 0.17,
        size: 14,
        font: bodyFont,
        color: bodyColor,
      });

      if (options.grades) {
        drawText({
          page: firstPage,
          text: options.grades,
          x: width * 0.285,
          y: height * 0.17,
          size: 14,
          font: bodyFont,
          color: bodyColor,
        });
      }

      drawCenteredText({
        page: firstPage,
        text: `Certificate ID: ${options.certificateId}`,
        y: height * 0.01,
        size: 12,
        font: bodyFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(
      this.getVerificationUrl(options.certificateId),
      {
        margin: 1,
        width: 300,
      },
    );

    const qrCodeImageBytes = Buffer.from(
      qrCodeDataUrl.split(',')[1] ?? '',
      'base64',
    );
    const qrImage = await pdfDoc.embedPng(qrCodeImageBytes);

    const qrSize = 72;
    firstPage.drawImage(qrImage, {
      x: (width - qrSize - 24) * 0.045,
      y: (height - qrSize - 24) * 0.98,
      width: qrSize,
      height: qrSize,
    });

    return Buffer.from(await pdfDoc.save());
  }

  async getCertificatePdfByCertificateId(certificateId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateId },
    });

    if (!certificate) {
      throw new NotFoundException(
        `Certificate not found for certificateId: ${certificateId}`,
      );
    }

    const pdfBuffer = await this.generateCertificatePdf({
      name: certificate.name,
      course: certificate.course,
      issuedAt: certificate.issuedAt.toISOString().slice(0, 10),
      certificateId: certificate.certificateId,
      templateFile: certificate.template,
      grades: certificate.grades,
    });

    return {
      certificate,
      fileName: `${certificate.certificateId}.pdf`,
      pdfBuffer,
    };
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

    const template =
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

    const skipped: Array<{
      email: string;
      name: string;
      course: string;
      template: string;
      reason: string;
    }> = [];

    for (const cert of createCertificateDto.certificates) {
      const certificateId = await this.getUniqueCertificateId();
      const issuedAt = cert.issuedAt ? new Date(cert.issuedAt) : new Date();

      const pdfBuffer = await this.generateCertificatePdf({
        name: cert.name,
        course: cert.course,
        issuedAt: issuedAt.toISOString().slice(0, 10),
        certificateId,
        templateFile: template,
        grades: cert.grades,
      });

      const certificateFileName = `${certificateId}.pdf`;
      const certificatePdfPath = join(
        this.generatedCertificatesDir,
        certificateFileName,
      );
      await writeFile(certificatePdfPath, pdfBuffer);

      try {
        // await this.prisma.certificate.create({
        //   data: {
        //     certificateId,
        //     email: cert.email,
        //     name: cert.name,
        //     course: cert.course,
        //  grades: cert.grades,
        //     template,
        //     issuedAt,
        //   },
        // });
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          try {
            await unlink(certificatePdfPath);
          } catch {
            // Ignore cleanup errors for skipped duplicates.
          }

          skipped.push({
            email: cert.email,
            name: cert.name,
            course: cert.course,
            template,
            reason:
              'Skipped duplicate (email + course + template already exists)',
          });
          continue;
        }

        throw error;
      }

      // await this.mailService.sendCertificateEmail({
      //   certificateId,
      //   name: cert.name,
      //   email: cert.email,
      //   certificatePdfPath,
      // });

      results.push({
        certificateId,
        email: cert.email,
        name: cert.name,
        course: cert.course,
        template,
        issuedAt: issuedAt.toISOString(),
        certificatePdfPath,
        isEmailQueued: true,
      });
    }

    return {
      count: results.length,
      certificates: results,
      skippedCount: skipped.length,
      skipped,
    };
  }

  findAll() {
    return this.prisma.certificate.findMany({
      orderBy: { issuedAt: 'desc' },
    });
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
