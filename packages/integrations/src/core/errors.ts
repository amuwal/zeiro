export class IntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class IntegrationNotConnectedError extends IntegrationError {
  constructor(
    public readonly firmId: string,
    public readonly provider: string,
  ) {
    super(`no ${provider} integration for firm ${firmId}`);
  }
}

export class ClientBindingMissingError extends IntegrationError {
  constructor(
    public readonly clientId: string,
    public readonly provider: string,
  ) {
    super(`client ${clientId} has no ${provider} binding`);
  }
}

export class TokenRefreshError extends IntegrationError {
  constructor(
    public readonly integrationId: string,
    public readonly provider: string,
    cause?: unknown,
  ) {
    super(`token refresh failed for ${provider} integration ${integrationId}`);
    if (cause instanceof Error) this.cause = cause;
  }
}

export class IntegrationRevokedError extends IntegrationError {
  constructor(
    public readonly integrationId: string,
    public readonly provider: string,
  ) {
    super(`${provider} integration ${integrationId} was revoked at the provider`);
  }
}

export class RateLimitError extends IntegrationError {
  constructor(
    public readonly provider: string,
    public readonly retryAfterSec: number,
  ) {
    super(`${provider} rate-limited; retry after ${retryAfterSec}s`);
  }
}

export class EncryptionError extends IntegrationError {
  constructor(message: string) {
    super(`encryption: ${message}`);
  }
}
