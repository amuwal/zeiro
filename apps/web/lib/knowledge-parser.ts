// Thin compatibility layer over the modular knowledge pipeline. The actual
// logic lives under ./knowledge/ — split there so the ingestion route handlers
// and the eval/test harness can pull in just the extractors they need.

import { extract } from './knowledge/extract';
import { type Extraction, type ParseInput, ParserError } from './knowledge/types';

export type ParsedKind = Extraction['kind'];

export type ParsedDocument = {
  text: string;
  metadata: {
    kind: ParsedKind;
    filename?: string;
    pages?: number;
    detectedLanguage?: string;
    warnings?: Extraction['warnings'];
    extractionMeta?: Record<string, unknown>;
  };
};

export async function parseDocument(input: ParseInput): Promise<ParsedDocument> {
  const result = await extract(input);
  return {
    text: result.text,
    metadata: {
      kind: result.kind,
      filename: input.filename,
      ...(result.pages !== undefined ? { pages: result.pages } : {}),
      ...(result.detectedLanguage ? { detectedLanguage: result.detectedLanguage } : {}),
      ...(result.warnings.length > 0 ? { warnings: result.warnings } : {}),
      ...(Object.keys(result.meta).length > 0 ? { extractionMeta: result.meta } : {}),
    },
  };
}

export async function parseKnowledgeFile(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parseDocument({ buffer, filename: file.name, mimetype: file.type });
}

export { ParserError };
