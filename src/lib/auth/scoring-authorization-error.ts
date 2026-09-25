export class ScoringAuthorizationError extends Error {
  readonly code:
    | "not_scoring_controller"
    | "session_required"
    | "session_invalid"
    | "installed_app_required";

  constructor(
    message: string,
    code: ScoringAuthorizationError["code"],
  ) {
    super(message);
    this.name = "ScoringAuthorizationError";
    this.code = code;
  }
}
