export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return file.text();
  }

  if (ext === 'docx') {
    return extractFromDocx(file);
  }

  if (ext === 'pdf') {
    return extractFromPdf(file);
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, or TXT file.`);
}

async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (!result.value?.trim()) {
    throw new Error('Could not extract text from DOCX file. The file may be empty or corrupted.');
  }
  return result.value;
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str || '';
      })
      .join(' ');
    textParts.push(pageText);
  }

  const text = textParts.join('\n').replace(/\s+/g, ' ').trim();

  if (!text) {
    throw new Error('Could not extract text from PDF. The PDF may be image-based or encrypted.');
  }

  return text;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
