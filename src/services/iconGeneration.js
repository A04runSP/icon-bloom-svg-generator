import { validateIconResponse } from "../data/iconSchema.js";
import { GENERATION_STATES, IconGenerationError } from "../lib/errors.js";
import { sanitizeSvg } from "../lib/svg/sanitizer.js";
import { validateSvg } from "../lib/svg/validator.js";

const MIN_ICON_COUNT = 1;
const MAX_ICON_COUNT = 10;

export async function generateIconFamily(request) {
  if (!request?.description?.trim()) {
    throw new IconGenerationError(
      "INVALID_INPUT",
      "A description is required.",
    );
  }

  const count = Number(request.count);
  if (!Number.isInteger(count) || count < MIN_ICON_COUNT || count > MAX_ICON_COUNT) {
    throw new IconGenerationError(
      "INVALID_INPUT",
      `Icon quantity must be between ${MIN_ICON_COUNT} and ${MAX_ICON_COUNT}.`,
    );
  }

  const response = await fetch("/api/generate-icons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const rawBody = await response.text();
  let payload = null;

  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    throw new IconGenerationError(
      "INVALID_RESPONSE",
      `The generation service returned non-JSON data (HTTP ${response.status}).`,
      error,
    );
  }

  if (!response.ok) {
    const code = payload?.error?.code ?? "API_ERROR";
    const message = payload?.error?.message ?? "Icon generation request failed.";
    throw new IconGenerationError(code, message);
  }

  const icons = validateIconResponse(payload, count);

  return icons.map((icon) => {
    validateSvg(icon.svg);
    return {
      ...icon,
      svg: sanitizeSvg(icon.svg),
    };
  });
}

export { GENERATION_STATES };
