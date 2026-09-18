export const GENERATION_STATES = Object.freeze({
  IDLE: "idle",
  GENERATING: "generating",
  VALIDATING: "validating",
  READY: "ready",
  ERROR: "error",
});

export class IconGenerationError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "IconGenerationError";
    this.code = code;
    this.cause = cause;
  }
}
