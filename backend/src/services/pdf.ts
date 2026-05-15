import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

interface CVSections {
  name: string;
  contact: string;
  sections: Array<{ header: string; lines: string[] }>;
}

function parseCVSections(content: string): CVSections {
  const lines = content.split('\n').map(l => l.trim());
  const result: CVSections = { name: '', contact: '', sections: [] };

  const sectionHeaders = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'CORE EXPERTISE', 'SKILLS',
    'EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS',
  ];

  let currentHeader = '';
  let currentLines: string[] = [];

  function flush() {
    if (currentHeader) {
      result.sections.push({ header: currentHeader, lines: currentLines.filter(l => l) });
    }
    currentLines = [];
  }

  let headerFound = false;

  for (const line of lines) {
    if (!line) { if (headerFound) currentLines.push(''); continue; }

    const upper = line.toUpperCase();
    const matchedHeader = sectionHeaders.find(h => upper === h || upper.startsWith(h + ' '));

    if (matchedHeader) {
      flush();
      currentHeader = matchedHeader;
      headerFound = true;
      continue;
    }

    if (!headerFound) {
      if (!result.name && line.length < 60 && !line.includes('@') && !line.includes('|')) {
        result.name = line;
      } else if (!result.contact && (line.includes('@') || line.includes('|') || line.match(/\+\d/))) {
        result.contact = line;
      }
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return result;
}

export async function generatePDF(cvContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const cv = parseCVSections(cvContent);
      logger.info('PDF', `Generating PDF for: ${cv.name}`);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 55, bottom: 55, left: 65, right: 65 },
        info: { Title: `${cv.name} - CV`, Author: cv.name },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 65;
      const WIDTH = doc.page.width - 130;
      const BULLET_INDENT = 14;

      // ── Header block ─────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill('#1a1a1a');

      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(cv.name || 'Candidate', LEFT, 22, { width: WIDTH });

      doc.fillColor('#cccccc')
        .font('Helvetica')
        .fontSize(9.5)
        .text(cv.contact || '', LEFT, 58, { width: WIDTH });

      doc.y = 110;

      // ── Section renderer ──────────────────────────────────────
      for (const section of cv.sections) {
        if (doc.y > doc.page.height - 100) doc.addPage();

        // Section header
        doc.moveDown(0.3);
        doc.fillColor('#111111')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(section.header, LEFT, doc.y, { width: WIDTH, characterSpacing: 1.2 });

        // Underline
        const lineY = doc.y + 2;
        doc.moveTo(LEFT, lineY).lineTo(LEFT + WIDTH, lineY).strokeColor('#888888').lineWidth(0.5).stroke();
        doc.y = lineY + 6;

        // Section content
        for (const line of section.lines) {
          if (!line) { doc.moveDown(0.2); continue; }
          if (doc.y > doc.page.height - 80) doc.addPage();

          const isBullet = line.startsWith('•') || line.startsWith('-');
          const isRoleHeader = line.includes('|') && !isBullet;

          if (isRoleHeader) {
            // Role line: bold left part, grey right parts
            const parts = line.split('|').map(p => p.trim());
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111111');
            doc.text(parts[0], LEFT, doc.y, { continued: parts.length > 1, width: WIDTH });
            if (parts.length > 1) {
              doc.font('Helvetica').fillColor('#555555')
                .text('  ·  ' + parts.slice(1).join('  ·  '), { width: WIDTH });
            }
          } else if (isBullet) {
            // Bullet with hanging indent
            const text = line.replace(/^[•\-]\s*/, '');
            const bulletX = LEFT + BULLET_INDENT;
            const textWidth = WIDTH - BULLET_INDENT;

            doc.font('Helvetica').fontSize(9.5).fillColor('#222222');
            // Draw bullet at LEFT, text at LEFT + BULLET_INDENT
            const startY = doc.y;
            doc.text('•', LEFT, startY, { width: BULLET_INDENT, lineBreak: false });
            doc.text(text, bulletX, startY, { width: textWidth, lineGap: 1.5 });
          } else {
            doc.font('Helvetica').fontSize(9.5).fillColor('#222222')
              .text(line, LEFT, doc.y, { width: WIDTH, lineGap: 1.5 });
          }
        }

        doc.moveDown(0.4);
      }

      // ── Footer ────────────────────────────────────────────────
      doc.fillColor('#aaaaaa')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Generated by MorphCV · ${new Date().toLocaleDateString('en-GB')}`,
          LEFT,
          doc.page.height - 35,
          { width: WIDTH, align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
