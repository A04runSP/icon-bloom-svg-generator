import { ICON_RESPONSE_SCHEMA, validateIconResponse } from "../src/data/iconSchema.js";

const ALLOWED_MODELS = new Set(["gemini-3.6-flash"]);
const ALLOWED_STYLES = new Set([
  "handdrawn",
  "pixel",
  "monoline",
  "duotone",
  "custom",
]);
const MIN_ICON_COUNT = 1;
const MAX_ICON_COUNT = 10;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REFERENCE_BASE64_LENGTH = 6_000_000;
const MAX_COLORS = 12;
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

const STYLE_LABELS = {
  handdrawn: "Handdrawn Scribble",
  pixel: "16-Bit Pixel Art",
  monoline: "Minimalist Monoline",
  duotone: "Modern Duo-Tone",
  custom: "Custom Style Reference",
};

const PALETTE = [
  ["Deep Violet", "#6A2C91"],
  ["Aqua Cyan", "#20E3E6"],
  ["Soft Magenta", "#FF78AC"],
  ["Lilac", "#D6A4FF"],
  ["Candy Pink", "#FF5CA8"],
  ["Creamy Yellow", "#FFE7A3"],
];

function sendError(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function buildPrompt({ description, style, count, colorMode, colors, colorTreatment, gradientAngle }) {
  const palette = colors
    .map((hex) => {
      const known = PALETTE.find(([, value]) => value.toLowerCase() === hex.toLowerCase());
      return known ? known[0] + " (" + hex + ")" : "Custom hue (" + hex + ")";
    })
    .join(", ");

  return [
    "You are the Icon Bloom SVG synthesis engine.",
    "Generate a coherent family of production-ready vector icons.",
    `Icon family description: ${description}`,
    `Visual style: ${STYLE_LABELS[style]}`,
    `Requested icon count: ${count}`,
    `Color mode: ${colorMode === "single" ? "single color" : "multiple colors"}`,
    `Selected palette: ${palette}`,
    `Color treatment: ${colorTreatment}`,
    `Gradient angle: ${gradientAngle} degrees when a linear gradient is used.`,
    "",
    "SVG requirements:",
    "- Return exactly the requested number of distinct icons.",
    "- Every SVG must be a standalone <svg> element with viewBox=\"0 0 64 64\".",
    "- Use vector elements only: path, circle, rect, line, polyline, polygon, ellipse, g, defs, linearGradient, radialGradient, and stop.",
    "- Do not use script, foreignObject, iframe, object, embed, animation, filters with external references, or external assets.",
    "- Do not include XML declarations, HTML, Markdown fences, comments, or explanatory text inside the SVG string.",
    colorMode === "single"
      ? "- Use only the selected single color for all visible icon artwork, with transparency/background space as needed."
      : colorTreatment === "linear-gradient"
        ? "- Use the first color as Primary and the second color as Secondary. Blend them inside the icon with a real SVG linearGradient; use additional selected colors as extra stops only when present."
        : colorTreatment === "radial-bloom"
          ? "- Use a real SVG radialGradient to create a soft bloom from the Primary color through the selected secondary/accent colors."
          : colorTreatment === "multi-mix"
            ? "- Use every selected color as intentional SVG gradient stops so multiple colors visibly mix inside the icon rather than appearing as unrelated swatches."
            : "- Use selected colors as deliberate solid fills while preserving a coherent icon family.",
    "- Keep geometry clean, compact, scalable, and visually recognizable at small sizes.",
    "- Each icon must have a short unique name.",
    "",
    "Return only the JSON object required by the response schema.",
  ].join("\n");
}

function extractOutputText(interaction) {
  if (typeof interaction?.output_text === "string" && interaction.output_text.trim()) {
    return interaction.output_text.trim();
  }

  const parts = [];

  const collectText = (value) => {
    if (!value) return;

    if (typeof value === "string") {
      parts.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) collectText(item);
      return;
    }

    if (typeof value === "object") {
      if (value.type === "text" && typeof value.text === "string") {
        parts.push(value.text);
      }
      for (const [key, child] of Object.entries(value)) {
        if (key === "text") continue;
        if (key === "steps" || key === "content" || key === "outputs" || key === "output") {
          collectText(child);
        }
      }
    }
  };

  collectText(interaction?.steps);
  if (parts.length > 0) {
    return parts.join("").trim();
  }

  return "";
}

function parseJsonOutput(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Gemini returned no JSON text.");
  }

  const cleaned = text
    .replace(/^\\s*\\`\\`\\`(?:json)?\\s*/i, "")
    .replace(/\\s*\\`\\`\\`\\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
      } catch {
        throw new Error("Gemini returned malformed JSON.");
      }
    }

    throw new Error("Gemini returned invalid JSON.");
  }
}


export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendError(response, 405, "METHOD_NOT_ALLOWED", "Use POST.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendError(
      response,
      500,
      "SERVER_CONFIGURATION",
      "Gemini API is not configured on the server.",
    );
  }

  const body = request.body ?? {};
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const style = typeof body.style === "string" ? body.style : "";
  const count = Number(body.count);
  const model = typeof body.model === "string" ? body.model : "";
  const colorMode = body.colorMode === "single" ? "single" : "multiple";
  const colorTreatment = typeof body.colorTreatment === "string" ? body.colorTreatment : "linear-gradient";
  const gradientAngle = Number.isFinite(Number(body.gradientAngle)) ? Number(body.gradientAngle) : 90;
  const colors = Array.isArray(body.colors)
    ? body.colors.filter((color) => typeof color === "string")
    : [];
  const reference = body.reference ?? null;

  if (!description) {
    return sendError(response, 400, "INVALID_INPUT", "A description is required.");
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return sendError(
      response,
      400,
      "INVALID_INPUT",
      `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    );
  }

  if (!ALLOWED_STYLES.has(style)) {
    return sendError(response, 400, "INVALID_INPUT", "Unsupported visual style.");
  }

  if (
    !Number.isInteger(count) ||
    count < MIN_ICON_COUNT ||
    count > MAX_ICON_COUNT
  ) {
    return sendError(
      response,
      400,
      "INVALID_INPUT",
      `Icon quantity must be between ${MIN_ICON_COUNT} and ${MAX_ICON_COUNT}.`,
    );
  }

  if (!ALLOWED_MODELS.has(model)) {
    return sendError(response, 400, "INVALID_INPUT", "Unsupported generation model.");
  }

  const allowedColorTreatments = new Set(["solid", "linear-gradient", "radial-bloom", "multi-mix"]);
  if (!allowedColorTreatments.has(colorTreatment)) {
    return sendError(response, 400, "INVALID_PALETTE", "Unsupported color treatment.");
  }

  if (!Number.isFinite(gradientAngle) || gradientAngle < 0 || gradientAngle > 360) {
    return sendError(response, 400, "INVALID_PALETTE", "Gradient angle must be between 0 and 360 degrees.");
  }

  if (
    colors.length === 0 ||
    colors.length > MAX_COLORS ||
    colors.some((color) => !HEX_COLOR_PATTERN.test(color))
  ) {
    return sendError(
      response,
      400,
      "INVALID_PALETTE",
      `Palette must contain 1-${MAX_COLORS} valid HEX colors.`,
    );
  }

  if (colorMode === "single" && colors.length !== 1) {
    return sendError(
      response,
      400,
      "INVALID_PALETTE",
      "Single color mode requires exactly one HEX color.",
    );
  }

  if (style === "custom") {
    if (
      !reference ||
      typeof reference.data !== "string" ||
      !ALLOWED_IMAGE_TYPES.has(reference.mimeType) ||
      reference.data.length > MAX_REFERENCE_BASE64_LENGTH
    ) {
      return sendError(
        response,
        400,
        "INVALID_REFERENCE",
        "Custom style reference must be a supported image within the allowed size.",
      );
    }
  }

  const input = [];
  if (style === "custom") {
    input.push({
      type: "image",
      mime_type: reference.mimeType,
      data: reference.data,
    });
  }
  input.push({
    type: "text",
    text: buildPrompt({ description, style, count, colorMode, colors }),
  });

  const schema = {
    ...ICON_RESPONSE_SCHEMA,
    properties: {
      ...ICON_RESPONSE_SCHEMA.properties,
      icons: {
        ...ICON_RESPONSE_SCHEMA.properties.icons,
        minItems: count,
        maxItems: count,
      },
    },
  };

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/interactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema,
          },
          generation_config: {
            max_output_tokens: 32768,
          },
        }),
      },
    );

    const geminiRawBody = await geminiResponse.text();
    let geminiPayload;

    try {
      geminiPayload = JSON.parse(geminiRawBody);
    } catch {
      return sendError(
        response,
        502,
        "GEMINI_INVALID_RESPONSE",
        `Gemini returned a non-JSON response (HTTP ${geminiResponse.status}).`,
      );
    }

    if (!geminiResponse.ok) {
      const providerMessage =
        geminiPayload?.error?.message || "Gemini request failed.";

      return sendError(
        response,
        geminiResponse.status === 429 ? 429 : 502,
        geminiResponse.status === 429 ? "RATE_LIMITED" : "GEMINI_API_ERROR",
        providerMessage,
      );
    }

    if (geminiPayload?.status === "failed" || geminiPayload?.status === "cancelled") {
      return sendError(
        response,
        502,
        "GEMINI_INCOMPLETE",
        "Gemini did not complete the icon generation request. Try again.",
      );
    }

    if (geminiPayload?.status === "incomplete") {
      return sendError(
        response,
        502,
        "INCOMPLETE_RESPONSE",
        "Gemini stopped before completing the icon family. Try again.",
      );
    }

    const outputText = extractOutputText(geminiPayload);
    if (!outputText) {
      return sendError(
        response,
        502,
        "INVALID_RESPONSE",
        "Gemini returned no structured output.",
      );
    }

    let payload;
    try {
      payload = parseJsonOutput(outputText);
    } catch {
      return sendError(
        response,
        502,
        "INVALID_RESPONSE",
        "Gemini returned invalid JSON output.",
      );
    }

    const icons = validateIconResponse(payload, count);

    return response.status(200).json({ icons });
  } catch (error) {
    return sendError(
      response,
      502,
      "GEMINI_NETWORK_ERROR",
      error instanceof Error ? error.message : "Gemini request failed.",
    );
  }
}
