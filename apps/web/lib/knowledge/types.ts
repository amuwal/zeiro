// Types shared across the ingestion pipeline. The `kind` field is what the
// audit log records and what the UI surfaces back to the reviewer; `confidence`
// expresses how trustworthy the extraction is, which downstream code uses to
// decide whether to flag the chunks for human review.

export type ExtractionKind = 'text' | 'markdown' | 'email' | 'pdf' | 'pdf-ocr' | 'docx' | 'xlsx';

export type ExtractionWarning =
  | 'tables-dropped'
  | 'images-dropped'
  | 'mixed-languages'
  | 'low-text-density'
  | 'short-output'
  | 'partial-pages';

export type Extraction = {
  text: string;
  kind: ExtractionKind;
  pages?: number;
  detectedLanguage?: string;
  warnings: ExtractionWarning[];
  // Free-form metadata the extractor wants to surface (e.g. table count,
  // sheet names for XLSX). Lives on the chunk metadata for transparency.
  meta: Record<string, unknown>;
};

export type ParseInput = {
  buffer: Buffer;
  filename: string;
  mimetype?: string;
};

export class ParserError extends Error {
  readonly code: ParserErrorCode;
  constructor(code: ParserErrorCode, message: string) {
    super(message);
    this.name = 'ParserError';
    this.code = code;
  }
}

export type ParserErrorCode =
  | 'file_too_large'
  | 'unsupported_format'
  | 'password_protected'
  | 'corrupted_file'
  | 'empty_extraction'
  | 'extractor_failed';
