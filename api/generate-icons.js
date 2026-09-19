import { ICON_RESPONSE_SCHEMA, validateIconResponse } from "../src/data/iconSchema.js";

const ALLOWED_MODELS = new Set(["gemini-2.5-flash"]);
const ALLOWED_STYLES = new Set([
  "handdrawn",
  "pixel",
  "monoline",
  "duotone",
  "custom",
]);
const ALLOWED_COUNTS = new Set([10, 20, 30, 40]);
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REFERENCE_BASE64_LENGTH = 6_000_000;

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

function buildPrompt({ description, style, count }) {
  const palette = PALETTE.map(([name, hex]) => `${name} (${hex})`).join(", ");

  return [
    "You are the Icon Bloom SVG synthesis engine.",
    "Generate a coherent family of production-ready vector icons.",
    `Icon family description: ${description}`,
    `Visual style: ${STYLE_LABELS[style]}`,
    `Requested icon count: ${count}`,
    `Semantic palette: ${palette}`,
    "",
    "SVG requirements:",
    "- Return exactly the requested number of distinct icons.",
    "- Every SVG must be a standalone <svg> element with viewBox=\"0 0 64 64\".",
    "- Use vector elements only: path, circle, rect, line, polyline, polygon, ellipse, and g.",
    "- Do not use script, foreignObject, iframe, object, embed, animation, filters with external references, or external assets.",
    "- Do not include XML declarations, HTML, Markdown fences, comments, or explanatory text inside the SVG string.",
    "- Use the supplied palette semantically and consistently across the family.",
    "- Keep geometry clean, compact, scalable, and visually recognizable at small sizes.",
    "- Each icon must have a short unique name.",
    "",
    "Return only the JSON object required by the response schema.",
  ].join("\n");
}

function extractOutputText(interaction) {
  if (typeof interaction?.output_text === "string") {
    return interaction.output_text;
  }

  const textParts = [];
  for (const step of interaction?.steps ?? []) {
    if (step?.type !== "model_output") continue;
    for (const block of step.content ?? []) {
      if (block?.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }
    }
  }

  return textParts.join("\n").trim();
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

  if (!ALLOWED_COUNTS.has(count)) {
    return sendError(response, 400, "INVALID_INPUT", "Unsupported icon quantity.");
  }

  if (!ALLOWED_MODELS.has(model)) {
    return sendError(response, 400, "INVALID_INPUT", "Unsupported generation model.");
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
    text: buildPrompt({ description, style, count }),
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
            max_output_tokens: Math.min(32768, Math.max(8192, count * 700)),
          },
        }),
      },
    );

    const geminiPayload = await geminiResponse.json();

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
      payload = JSON.parse(outputText);
    } catch {
      return sendError(
        response,
        502,
        "INVALID_RESPONSE",
        "Gemini returned invalid JSON.",
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
