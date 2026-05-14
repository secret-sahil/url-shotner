import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  create(@Body() createCertificateDto: CreateCertificateDto) {
    return this.certificateService.create(createCertificateDto);
  }

  @Get()
  findAll() {
    return this.certificateService.findAll();
  }

  @Get(':certificateId')
  async getCertificateVerificationPage(
    @Param('certificateId') certificateId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const certificate =
      await this.certificateService.getCertificatePublicDetailsByCertificateId(
        certificateId,
      );

    const isValid = Boolean(certificate);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const previewUrl = `${baseUrl}/certificate/${certificateId}/preview.png`;
    const fallbackOg = `${baseUrl}/certificate-verify/og-default.svg`;

    const html = this.buildVerificationHtml({
      certificateId,
      certificate,
      isValid,
      baseUrl,
      previewUrl: isValid ? previewUrl : fallbackOg,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  }

  @Get(':certificateId/preview.png')
  async getCertificatePreview(
    @Param('certificateId') certificateId: string,
    @Res() res: Response,
  ) {
    const { pngBuffer, fileName } =
      await this.certificateService.getCertificatePreviewPngByCertificateId(
        certificateId,
      );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(pngBuffer);
  }

  @Get(':certificateId/status')
  async getCertificateStatus(@Param('certificateId') certificateId: string) {
    const certificate =
      await this.certificateService.getCertificatePublicDetailsByCertificateId(
        certificateId,
      );

    if (!certificate) {
      return {
        valid: false,
        certificateId,
      };
    }

    return {
      valid: true,
      certificate,
    };
  }

  @Get(':certificateId/pdf')
  async downloadCertificatePdf(
    @Param('certificateId') certificateId: string,
    @Res() res: Response,
  ) {
    const { pdfBuffer, fileName } =
      await this.certificateService.getCertificatePdfByCertificateId(
        certificateId,
      );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send(pdfBuffer);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCertificateDto: UpdateCertificateDto,
  ) {
    return this.certificateService.update(id, updateCertificateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certificateService.remove(id);
  }

  private buildVerificationHtml(options: {
    certificateId: string;
    certificate: {
      certificateId: string;
      name: string;
      course: string;
      template: string;
      grades: string | null;
      issuedAt: Date;
    } | null;
    isValid: boolean;
    baseUrl: string;
    previewUrl: string;
  }) {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const certificateName = options.certificate?.name ?? 'Unknown';
    const certificateCourse = options.certificate?.course ?? 'Unknown Course';
    const certificateGrades = options.certificate?.grades ?? 'Not provided';
    const issuedAt = options.certificate?.issuedAt
      ? options.certificate.issuedAt.toISOString().slice(0, 10)
      : 'N/A';

    const title = options.isValid
      ? `${certificateName} | Verified Certificate`
      : 'Certificate Not Verified | Hoping Minds';
    const description = options.isValid
      ? `${certificateName} completed ${certificateCourse}.`
      : 'We could not verify this certificate. Please check the link.';
    const statusLabel = options.isValid ? 'Verified' : 'Not verified';
    const statusClass = options.isValid ? 'status valid' : 'status invalid';
    const shareUrl = `${options.baseUrl}/certificate/${options.certificateId}`;
    const shareLinkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl,
    )}`;

    const addLinkedIn = options.isValid
      ? `https://www.linkedin.com/profile/add?${new URLSearchParams({
          startTask: 'CERTIFICATION_NAME',
          name: certificateCourse,
          organizationName: 'HopingMinds',
          issueYear: issuedAt.split('-')[0] ?? '',
          issueMonth: issuedAt.split('-')[1] ?? '',
          certUrl: shareUrl,
          certId: options.certificateId,
        }).toString()}`
      : '#';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(options.previewUrl)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(options.previewUrl)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #f6f1e9;
        --ink: #151515;
        --muted: #6a6a6a;
        --accent: #e0564a;
        --accent-deep: #a5322b;
        --surface: #ffffff;
        --outline: rgba(0, 0, 0, 0.08);
        --shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
        --radius: 18px;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        color: var(--ink);
        background: radial-gradient(circle at 12% 10%, #fff6ea, #f2e7db 55%, #e9dfd3)
          fixed;
        min-height: 100vh;
      }

      .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 48px 24px 64px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.28em;
        font-size: 12px;
        color: var(--muted);
        margin: 0 0 12px;
      }

      .title {
        font-family: "Fraunces", serif;
        font-size: clamp(2.3rem, 4vw, 3.4rem);
        margin: 0 0 12px;
      }

      .subtitle {
        margin: 0;
        color: var(--muted);
        max-width: 480px;
        line-height: 1.5;
      }

      .status {
        padding: 10px 18px;
        border-radius: 999px;
        border: 1px solid var(--outline);
        background: var(--surface);
        font-weight: 600;
      }

      .status.valid {
        background: #e9f7ec;
        color: #1d6b2c;
        border-color: rgba(29, 107, 44, 0.25);
      }

      .status.invalid {
        background: #fdeaea;
        color: #9e2d2d;
        border-color: rgba(158, 45, 45, 0.25);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
      }

      .card {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 24px;
        border: 1px solid var(--outline);
        box-shadow: var(--shadow);
      }

      .card h2 {
        margin-top: 0;
      }

      .details dl {
        margin: 0;
        display: grid;
        gap: 14px;
      }

      .details dt {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--muted);
      }

      .details dd {
        margin: 4px 0 0;
        font-size: 16px;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }

      .button {
        padding: 10px 18px;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        border: none;
        text-decoration: none;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .button:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 20px rgba(224, 86, 74, 0.25);
      }

      .button.ghost {
        background: transparent;
        color: var(--accent-deep);
        border: 1px solid rgba(165, 50, 43, 0.3);
      }

      .preview {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .preview-frame {
        border-radius: 16px;
        background: #faf6f0;
        padding: 16px;
        border: 1px dashed rgba(0, 0, 0, 0.15);
        display: grid;
        place-items: center;
      }

      .preview-frame img {
        max-width: 100%;
        height: auto;
        border-radius: 12px;
        background: white;
      }

      .share {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .error {
        border-left: 4px solid #9e2d2d;
        background: #fff2f2;
      }

      @media (max-width: 768px) {
        .hero {
          flex-direction: column;
        }

        .share {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <div>
          <p class="eyebrow">Certificate Verification</p>
          <h1 class="title">Your achievement, verified.</h1>
          <p class="subtitle">
            Confirm authenticity, preview the certificate, and share it with the
            world.
          </p>
        </div>
        <div class="${escapeHtml(statusClass)}">${escapeHtml(statusLabel)}</div>
      </header>

      <section class="grid">
        <div class="card details">
          <h2>Certificate details</h2>
          <dl>
            <div>
              <dt>Certificate ID</dt>
              <dd>${escapeHtml(options.certificateId)}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>${escapeHtml(certificateName)}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>${escapeHtml(certificateCourse)}</dd>
            </div>
            <div>
              <dt>Issued on</dt>
              <dd>${escapeHtml(issuedAt)}</dd>
            </div>
            <div>
              <dt>Grades</dt>
              <dd>${escapeHtml(certificateGrades)}</dd>
            </div>
          </dl>
          <div class="actions">
            <a class="button" href="${escapeHtml(
              `${shareUrl}/pdf`,
            )}" download>Download PDF</a>
            <a class="button ghost" href="${escapeHtml(
              options.previewUrl,
            )}" download>Download PNG</a>
          </div>
        </div>

        <div class="card preview">
          <div>
            <h2>Certificate preview</h2>
            <p>${options.isValid ? 'Preview generated from the certificate.' : 'Preview unavailable.'}</p>
          </div>
          <div class="preview-frame">
            ${
              options.isValid
                ? `<img src="${escapeHtml(
                    options.previewUrl,
                  )}" alt="Certificate preview" />`
                : `<span>Preview unavailable</span>`
            }
          </div>
        </div>
      </section>

      <section class="card share">
        <div>
          <h2>Share your certificate</h2>
          <p>
            Send a verified link or add the certificate directly to your
            LinkedIn profile.
          </p>
        </div>
        <div class="actions">
          <a class="button" href="${escapeHtml(
            shareLinkedIn,
          )}" target="_blank">Share on LinkedIn</a>
          <a class="button ghost" href="${escapeHtml(
            addLinkedIn,
          )}" target="_blank">Add to LinkedIn profile</a>
        </div>
      </section>

      ${
        options.isValid
          ? ''
          : `<section class="card error">
        <h2>Certificate not found</h2>
        <p>
          We could not verify this certificate ID. Double-check the link or
          contact Hoping Minds support.
        </p>
      </section>`
      }
    </main>
  </body>
</html>`;
  }
}
