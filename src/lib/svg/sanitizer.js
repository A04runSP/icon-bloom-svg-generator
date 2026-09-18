const BLOCKED_ELEMENTS = new Set([
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
]);

const BLOCKED_ATTRIBUTES = /^(on[a-z]+|href|xlink:href)$/i;
const UNSAFE_URL = /^(javascript:|data:text\/html|vbscript:)/i;

export function sanitizeSvgDocument(document) {
  for (const element of [...document.querySelectorAll("*")]) {
    if (BLOCKED_ELEMENTS.has(element.localName)) {
      element.remove();
      continue;
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name;
      const value = attribute.value.trim();

      if (BLOCKED_ATTRIBUTES.test(name) || UNSAFE_URL.test(value)) {
        element.removeAttribute(name);
      }
    }
  }

  return document;
}

export function sanitizeSvg(svgText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(svgText, "image/svg+xml");

  if (document.querySelector("parsererror")) {
    throw new Error("SVG contains malformed XML.");
  }

  if (document.documentElement.localName !== "svg") {
    throw new Error("SVG root element is missing.");
  }

  return new XMLSerializer().serializeToString(
    sanitizeSvgDocument(document),
  );
}
