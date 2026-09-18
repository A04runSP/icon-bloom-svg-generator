import { parseSvg } from "./parser.js";

export function validateSvg(svgText) {
  const document = parseSvg(svgText);
  const root = document.documentElement;

  if (root.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error("SVG namespace is invalid.");
  }

  if (!root.getAttribute("viewBox")) {
    throw new Error("SVG must define a viewBox.");
  }

  return true;
}
