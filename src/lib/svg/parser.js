export function parseSvg(svgText) {
  if (typeof svgText !== "string" || !svgText.trim()) {
    throw new Error("SVG content is empty.");
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(svgText, "image/svg+xml");

  if (document.querySelector("parsererror")) {
    throw new Error("SVG contains malformed XML.");
  }

  const root = document.documentElement;

  if (!root || root.localName !== "svg") {
    throw new Error("SVG root element is missing.");
  }

  return document;
}
