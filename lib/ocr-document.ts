export type OcrWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

export type TesseractBlocks = Array<{
  paragraphs: Array<{
    lines: Array<{
      words: OcrWord[];
    }>;
  }>;
}> | null;

export type OcrTextPage = {
  sourceName: string;
  text: string;
  words: OcrWord[];
  processedImage?: Blob;
  processedWidth?: number;
  processedHeight?: number;
};

export function collectOcrWords(blocks: TesseractBlocks) {
  if (!blocks) return [];
  return blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.words.map((word) => ({
        text: word.text,
        confidence: Math.round(word.confidence),
        bbox: { ...word.bbox },
      }))),
    ),
  );
}

export function combineOcrText(pages: OcrTextPage[]) {
  const pagesWithText = pages.filter((page) => page.text.trim());
  if (pages.length === 1) return pagesWithText[0]?.text.trim() ?? '';
  return pagesWithText
    .map((page) => {
      const pageNumber = pages.indexOf(page) + 1;
      return `--- Página ${pageNumber} · ${page.sourceName} ---\n${page.text.trim()}`;
    })
    .join('\n\n');
}

function safePdfText(value: string) {
  return value.replace(/[^\u0020-\u00ff]/g, '?');
}

export async function createSearchablePdf(pages: OcrTextPage[]) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);

  for (const item of pages) {
    if (!item.processedImage || !item.processedWidth || !item.processedHeight) continue;
    const imageBytes = await item.processedImage.arrayBuffer();
    const image = item.processedImage.type === 'image/png'
      ? await output.embedPng(imageBytes)
      : await output.embedJpg(imageBytes);
    const landscape = item.processedWidth > item.processedHeight;
    const maxWidth = landscape ? 841.89 : 595.28;
    const maxHeight = landscape ? 595.28 : 841.89;
    const scale = Math.min(maxWidth / item.processedWidth, maxHeight / item.processedHeight);
    const pageWidth = item.processedWidth * scale;
    const pageHeight = item.processedHeight * scale;
    const page = output.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    if (item.words.length) {
      for (const word of item.words) {
        const text = safePdfText(word.text.trim());
        if (!text) continue;
        const fontSize = Math.max(4, (word.bbox.y1 - word.bbox.y0) * scale * 0.82);
        page.drawText(text, {
          x: word.bbox.x0 * scale,
          y: pageHeight - word.bbox.y1 * scale,
          size: fontSize,
          font,
          opacity: 0,
        });
      }
    } else if (item.text.trim()) {
      const lines = item.text.trim().split(/\r?\n/).filter(Boolean);
      lines.forEach((line, index) => {
        const text = safePdfText(line);
        if (text) {
          page.drawText(text, {
            x: 12,
            y: Math.max(8, pageHeight - 18 - index * 12),
            size: 10,
            font,
            opacity: 0,
          });
        }
      });
    }
  }

  if (!output.getPageCount()) {
    throw new Error('Reconoce al menos una página antes de crear el PDF buscable.');
  }
  const bytes = await output.save();
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}
