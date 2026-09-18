export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." },
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({
      error: {
        code: "SERVER_CONFIGURATION",
        message: "Gemini API is not configured on the server.",
      },
    });
  }

  return response.status(501).json({
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Gemini generation will be enabled in Phase 3.",
    },
  });
}
