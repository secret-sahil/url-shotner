const statusPill = document.getElementById('statusPill');
const invalidCard = document.getElementById('invalidCard');
const previewHint = document.getElementById('previewHint');
const previewCanvas = document.getElementById('previewCanvas');
const previewImage = document.getElementById('previewImage');
const downloadPdf = document.getElementById('downloadPdf');
const downloadPng = document.getElementById('downloadPng');
const copyLink = document.getElementById('copyLink');
const shareLinkedIn = document.getElementById('shareLinkedIn');
const addLinkedIn = document.getElementById('addLinkedIn');

const fieldId = document.getElementById('certificateId');
const fieldName = document.getElementById('certificateName');
const fieldCourse = document.getElementById('certificateCourse');
const fieldIssued = document.getElementById('certificateIssued');
const fieldGrades = document.getElementById('certificateGrades');

const issuerName = document.querySelector('.page').dataset.issuer;

const certificateId = (() => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
})();

const verificationUrl = `${window.location.origin}/certificate/${certificateId}`;
const statusUrl = `${verificationUrl}/status`;
const pdfUrl = `${verificationUrl}/pdf`;

const formatDate = (value) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '--';
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const setMeta = ({ title, description, imageUrl }) => {
  document.title = title;
  const metaMap = {
    'og:title': title,
    'twitter:title': title,
    'og:description': description,
    'twitter:description': description,
    'og:image': imageUrl,
    'twitter:image': imageUrl,
    'og:url': verificationUrl,
  };

  Object.entries(metaMap).forEach(([key, value]) => {
    const selector = key.startsWith('og:')
      ? `meta[property="${key}"]`
      : `meta[name="${key}"]`;
    const tag = document.querySelector(selector);
    if (tag && value) {
      tag.setAttribute('content', value);
    }
  });
};

const setStatus = (valid) => {
  statusPill.textContent = valid ? 'Verified' : 'Not verified';
  statusPill.classList.toggle('valid', valid);
  statusPill.classList.toggle('invalid', !valid);
};

const renderPreview = async () => {
  previewHint.textContent = 'Rendering preview...';
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error('Unable to fetch PDF');
    }
    const pdfData = await response.arrayBuffer();

    const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
      throw new Error('PDF engine not loaded');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const containerWidth = previewCanvas.parentElement.clientWidth;
    const targetWidth = Math.max(containerWidth - 32, 320);
    const scale = Math.min(targetWidth / viewport.width, 1.4);
    const outputScale = window.devicePixelRatio || 1;
    const scaledViewport = page.getViewport({ scale: scale * outputScale });

    previewCanvas.width = scaledViewport.width;
    previewCanvas.height = scaledViewport.height;
    previewCanvas.style.width = `${scaledViewport.width / outputScale}px`;
    previewCanvas.style.height = `${scaledViewport.height / outputScale}px`;
    previewCanvas.style.display = 'block';
    previewImage.style.display = 'none';

    await page.render({
      canvasContext: previewCanvas.getContext('2d'),
      viewport: scaledViewport,
    }).promise;

    const dataUrl = previewCanvas.toDataURL('image/png');
    previewImage.src = dataUrl;
    previewImage.style.display = 'block';

    previewHint.textContent = 'Preview ready';
  } catch (error) {
    previewHint.textContent = 'Preview unavailable';
  }
};

const setupShareLinks = (certificate) => {
  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    verificationUrl,
  )}`;

  const issueDate = new Date(certificate.issuedAt);
  const issueYear = issueDate.getUTCFullYear().toString();
  const issueMonth = (issueDate.getUTCMonth() + 1).toString();
  const addParams = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: certificate.course,
    organizationName: issuerName,
    issueYear,
    issueMonth,
    certUrl: verificationUrl,
    certId: certificate.certificateId,
  });

  shareLinkedIn.href = linkedInShare;
  addLinkedIn.href = `https://www.linkedin.com/profile/add?${addParams.toString()}`;
};

const init = async () => {
  fieldId.textContent = certificateId || '--';
  downloadPdf.href = pdfUrl;

  try {
    const response = await fetch(statusUrl);
    if (!response.ok) {
      throw new Error('Status request failed');
    }
    const payload = await response.json();

    if (!payload.valid) {
      setStatus(false);
      invalidCard.style.display = 'block';
      previewHint.textContent = 'Preview unavailable';
      setMeta({
        title: 'Certificate Not Verified | Hoping Minds',
        description:
          'We could not verify this certificate. Please check the link.',
        imageUrl: `${window.location.origin}/certificate-verify/og-default.svg`,
      });
      return;
    }

    const certificate = payload.certificate;
    setStatus(true);

    fieldName.textContent = certificate.name || '--';
    fieldCourse.textContent = certificate.course || '--';
    fieldIssued.textContent = formatDate(certificate.issuedAt);
    fieldGrades.textContent = certificate.grades || '--';

    setMeta({
      title: `${certificate.name} | Verified Certificate`,
      description: `${certificate.name} completed ${certificate.course}.`,
      imageUrl: `${window.location.origin}/certificate-verify/og-default.svg`,
    });

    setupShareLinks(certificate);
    await renderPreview();
  } catch (error) {
    setStatus(false);
    invalidCard.style.display = 'block';
    previewHint.textContent = 'Preview unavailable';
  }
};

copyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(verificationUrl);
    copyLink.textContent = 'Copied!';
    setTimeout(() => {
      copyLink.textContent = 'Copy link';
    }, 2000);
  } catch (error) {
    copyLink.textContent = 'Copy failed';
    setTimeout(() => {
      copyLink.textContent = 'Copy link';
    }, 2000);
  }
});

downloadPng.addEventListener('click', () => {
  if (!previewImage.src) {
    return;
  }
  const link = document.createElement('a');
  link.href = previewImage.src;
  link.download = `${certificateId || 'certificate'}.png`;
  link.click();
});

init();
