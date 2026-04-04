import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // ── PDF extraction ──
    if (fileName.endsWith('.pdf')) {
      try {
        // pdf-parse v1.1.1 — simple function call, no worker needed
        // Bypass pdf-parse's buggy index.js which falsely trips into debug mode under Next.js
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const data = await pdfParse(buffer);
        extractedText = data.text;
        
        // Remove null bytes and non-printable control characters that can crash undici/fetch
        if (extractedText) {
          extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        }

        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json({
            error: 'PDF appears to contain only images/scans. Text-based PDFs are required for extraction.',
            fileName: file.name,
          }, { status: 422 });
        }
      } catch (err) {
        console.error('[Extract] PDF parse error:', err);
        return NextResponse.json({
          error: `Failed to extract text from PDF: ${(err as Error).message}`,
          fileName: file.name,
        }, { status: 422 });
      }
    }

    // ── DOCX extraction ──
    else if (fileName.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;

        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json({
            error: 'DOCX file appears to be empty or contains only images.',
            fileName: file.name,
          }, { status: 422 });
        }
      } catch (err) {
        console.error('[Extract] DOCX parse error:', err);
        return NextResponse.json({
          error: `Failed to extract text from DOCX: ${(err as Error).message}`,
          fileName: file.name,
        }, { status: 422 });
      }
    }

    // ── DOC (legacy format) ──
    else if (fileName.endsWith('.doc')) {
      return NextResponse.json({
        error: 'Legacy .doc format is not supported. Please save the file as .docx or .pdf and re-upload.',
        fileName: file.name,
      }, { status: 415 });
    }

    // ── Plain text files ──
    else if (
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.json') ||
      fileName.endsWith('.xml') ||
      fileName.endsWith('.html') ||
      fileName.endsWith('.log') ||
      fileName.endsWith('.rtf')
    ) {
      try {
        extractedText = buffer.toString('utf-8');
      } catch (err) {
        console.error('[Extract] Text read error:', err);
        return NextResponse.json({
          error: `Failed to read text file: ${(err as Error).message}`,
          fileName: file.name,
        }, { status: 422 });
      }
    }

    // ── Unsupported type ──
    else {
      return NextResponse.json({
        error: `Unsupported file type: "${fileName.split('.').pop()}". Supported formats: PDF, DOCX, TXT, MD, CSV, JSON, XML.`,
        fileName: file.name,
      }, { status: 415 });
    }

    return NextResponse.json({
      text: extractedText.trim(),
      fileName: file.name,
      fileSize: file.size,
      charCount: extractedText.trim().length,
    });
  } catch (err) {
    console.error('[Extract] Unexpected error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
