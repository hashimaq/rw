/** User-safe detection of missing AI provider configuration (stored error_message). */
export function isAiProviderConfigError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return (
    message === "GEMINI_API_KEY is not configured" ||
    message === "OPENAI_API_KEY is not configured" ||
    message.endsWith("_API_KEY is not configured")
  );
}
