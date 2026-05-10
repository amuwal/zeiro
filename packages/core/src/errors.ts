export class ZeiroError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ZeiroError';
  }
}

export class TenantIsolationError extends ZeiroError {
  constructor(message: string) {
    super(message, 'TENANT_ISOLATION');
    this.name = 'TenantIsolationError';
  }
}

export class KnowledgeUnavailableError extends ZeiroError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_UNAVAILABLE');
    this.name = 'KnowledgeUnavailableError';
  }
}

export class InvalidLLMOutputError extends ZeiroError {
  constructor(message: string) {
    super(message, 'INVALID_LLM_OUTPUT');
    this.name = 'InvalidLLMOutputError';
  }
}
