export const ICON_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  required: ["icons"],
  properties: {
    icons: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "svg"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          svg: { type: "string" },
        },
      },
    },
  },
});

export function isIconRecord(value) {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.svg === "string",
  );
}

export function validateIconResponse(payload, expectedCount) {
  if (!payload || !Array.isArray(payload.icons)) {
    throw new Error("Gemini response must contain an icons array.");
  }

  if (payload.icons.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} icons but received ${payload.icons.length}.`,
    );
  }

  if (!payload.icons.every(isIconRecord)) {
    throw new Error("Every icon must contain id, name, and svg strings.");
  }

  return payload.icons;
}
