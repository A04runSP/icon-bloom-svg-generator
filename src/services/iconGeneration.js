import { validateIconResponse } from "../data/iconSchema.js";
import { GENERATION_STATES, IconGenerationError } from "../lib/errors.js";
import { sanitizeSvg } from "../lib/svg/sanitizer.js";
import { validateSvg } from "../lib/svg/validator.js";

export async function generateIconFamily(request) {
  if (!request?.description?.trim()) {
    throw new IconGenerationError(
      "INVALID_INPUT",
      "A description is required.",
    );
  }

  const response = await fetch("/api/generate-icons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    throw new IconGenerationError(
      "INVALID_RESPONSE",
      "The generation service returned invalid JSON.",
      error,
    );
  }

  if (!response.ok) {
    const code = payload?.error?.code ?? "API_ERROR";
    const message = payload?.error?.message ?? "Icon generation request failed.";
    throw new IconGenerationError(code, message);
  }

  const icons = validateIconResponse(payload, Number(request.count));

  return icons.map((icon) => {
    validateSvg(icon.svg);
    return {
      ...icon,
      svg: sanitizeSvg(icon.svg),
    };
  });
}

export { GENERATION_STATES };
