export type AiProviderErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "malformed_response"
  | "network_failure";

/** Safe server-side error — message must never contain secrets. */
export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(message: string, code: AiProviderErrorCode) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}
