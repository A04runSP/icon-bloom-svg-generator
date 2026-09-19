import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { generateIconFamily } from "./services/iconGeneration.js";
import "./styles.css";

const tabs = ["Workspace", "Live Sandbox", "Glyph Catalog"];

const styleOptions = [
  {
    value: "handdrawn",
    label: "Handdrawn Scribble",
    description: "Loose, playful strokes with a handmade feel.",
  },
  {
    value: "pixel",
    label: "16-Bit Pixel Art",
    description: "Crisp retro forms with a classic pixel grid.",
  },
  {
    value: "monoline",
    label: "Minimalist Monoline",
    description: "Clean single-weight outlines and simple geometry.",
  },
  {
    value: "duotone",
    label: "Modern Duo-Tone",
    description: "Contemporary silhouettes with two-tone contrast.",
  },
  {
    value: "custom",
    label: "Custom Style Reference",
    description: "Upload a visual reference for the generation pipeline.",
  },
];

const colorSwatches = [
  { name: "Deep Violet", value: "#6A2C91" },
  { name: "Aqua Cyan", value: "#20E3E6" },
  { name: "Soft Magenta", value: "#FF78AC" },
  { name: "Lilac", value: "#D6A4FF" },
  { name: "Candy Pink", value: "#FF5CA8" },
  { name: "Creamy Yellow", value: "#FFE7A3" },
];

const MAX_CUSTOM_COLORS = 6;

const styleLabel = (value) =>
  styleOptions.find((option) => option.value === value)?.label ?? value;

async function fileToReference(file) {
  if (!file) return null;

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Style reference must be PNG, JPG, or WEBP.");
  }

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Style reference must be 4 MB or smaller.");
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the style reference."));
    reader.readAsDataURL(file);
  });

  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Style reference encoding is invalid.");
  }

  return {
    mimeType: file.type,
    data: dataUrl.slice(commaIndex + 1),
  };
}

function App() {
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("Workspace");
  const [style, setStyle] = useState("handdrawn");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("1");
  const [model, setModel] = useState("gemini-3.6-flash");
  const [colorMode, setColorMode] = useState("multiple");
  const [colorTreatment, setColorTreatment] = useState("linear-gradient");
  const [selectedColors, setSelectedColors] = useState([
    colorSwatches[4].value,
    colorSwatches[1].value,
  ]);
  const [customColor, setCustomColor] = useState("#FF78AC");
  const [customColors, setCustomColors] = useState([]);
  const [wheelHue, setWheelHue] = useState(337);
  const [wheelSaturation, setWheelSaturation] = useState(0.53);
  const [wheelValue, setWheelValue] = useState(1);
  const [referenceFile, setReferenceFile] = useState(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [generationState, setGenerationState] = useState("idle");
  const [generatedIcons, setGeneratedIcons] = useState([]);
  const [viewMode, setViewMode] = useState("workspace");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  const handleCopySvg = async (svg) => {
    try {
      await navigator.clipboard.writeText(svg);
      setWorkspaceMessage("SVG copied to clipboard.");
    } catch {
      setWorkspaceMessage("Could not copy the SVG. Try the download button.");
    }
  };

  const handleDownloadSvg = (icon) => {
    const blob = new Blob([icon.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${icon.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || icon.id}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setWorkspaceMessage(`Downloaded ${icon.name}.svg.`);
  };

  const togglePaletteColor = (value) => {
    if (colorMode === "single") {
      setSelectedColors([value]);
      return;
    }

    setSelectedColors((current) =>
      current.includes(value)
        ? current.filter((color) => color !== value)
        : [...current, value],
    );
  };

  const handleColorModeChange = (mode) => {
    setColorMode(mode);

    if (mode === "single") {
      setSelectedColors((current) => [current[0] ?? colorSwatches[0].value]);
      return;
    }

    setSelectedColors((current) =>
      current.length > 0 ? current : [colorSwatches[0].value],
    );
  };

  const hsvToHex = (hue, saturation, value) => {
    const h = ((hue % 360) + 360) % 360;
    const s = Math.max(0, Math.min(1, saturation));
    const v = Math.max(0, Math.min(1, value));
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return "#" + [r, g, b]
      .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const updateWheelColor = (hue, saturation, value) => {
    setWheelHue(hue);
    setWheelSaturation(saturation);
    setWheelValue(value);
    setCustomColor(hsvToHex(hue, saturation, value));
  };

  const handleColorWheelPointer = (event) => {
    const wheel = event.currentTarget;
    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    const distance = Math.sqrt(x * x + y * y);
    const radius = rect.width / 2;

    if (distance < radius * 0.62 || distance > radius) return;

    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90 + 360;
    updateWheelColor(Math.round(angle % 360), wheelSaturation, wheelValue);
  };

  const handleColorWheelSVPointer = (event) => {
    const picker = event.currentTarget;
    const rect = picker.getBoundingClientRect();
    const saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const value = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    updateWheelColor(wheelHue, saturation, value);
  };

  const handleAddCustomColor = () => {
    const value = customColor.toUpperCase();

    if (colorMode === "single") {
      setSelectedColors([value]);
      return;
    }

    if (customColors.includes(value)) {
      setSelectedColors((current) =>
        current.includes(value) ? current : [...current, value],
      );
      return;
    }

    if (customColors.length >= MAX_CUSTOM_COLORS) {
      setWorkspaceMessage(
        "You can add up to " + MAX_CUSTOM_COLORS + " custom hues.",
      );
      return;
    }

    setCustomColors((current) => [...current, value]);
    setSelectedColors((current) => [...current, value]);
    setWorkspaceMessage("");
  };

  const removeCustomColor = (value) => {
    setCustomColors((current) => current.filter((color) => color !== value));
    setSelectedColors((current) => current.filter((color) => color !== value));
  };

  const handleSynthesize = async (event) => {
    event.preventDefault();

    if (!description.trim()) {
      setWorkspaceMessage("Add an icon-family description before synthesizing.");
      return;
    }

    if (style === "custom" && !referenceFile) {
      setWorkspaceMessage(
        "Upload a style reference when using Custom Style Reference.",
      );
      return;
    }

    setGenerationState("generating");
    setWorkspaceMessage("Sending the icon family brief to Gemini…");

    try {
      const reference =
        style === "custom" ? await fileToReference(referenceFile) : null;

      if (selectedColors.length === 0) {
        setGenerationState("error");
        setWorkspaceMessage("Select at least one palette color before synthesizing.");
        return;
      }

      const icons = await generateIconFamily({
        description: description.trim(),
        style,
        count: Number(count),
        model,
        colorMode,
        colors: selectedColors,
        colorTreatment: colorMode === "single" ? "solid" : colorTreatment,
        gradientAngle: 90,
        reference,
      });

      setGeneratedIcons(icons);
      setGenerationState("ready");
      setViewMode("workspace");
      setWorkspaceMessage(
        `Gemini generated and validated ${icons.length} SVG icons successfully.`,
      );
    } catch (error) {
      setGenerationState("error");
      setWorkspaceMessage(
        error instanceof Error
          ? error.message
          : "Icon generation failed. Try again.",
      );
    }
  };

  return (
    <div className="app">
      <div className="sparkles" aria-hidden="true">
        <span className="sparkle">✦</span>
        <span className="sparkle">✧</span>
        <span className="sparkle">✦</span>
        <span className="sparkle">✧</span>
      </div>

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">✿</div>
          <div>
            <div className="brand-title">Icon Bloom</div>
            <div className="brand-subtitle">SVG Generator</div>
          </div>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              className={`nav-button ${activeTab === tab ? "active" : ""}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀︎" : "☾"}
        </button>
      </header>

      <main className="content">
        <section className="hero">
          <article className="card hero-card">
            <div className="hero-grid" aria-hidden="true" />
            <div className="eyebrow">Dream Pop • Sugar Bloom • Y2K</div>
            <h1>
              Turn ideas into{" "}
              <span className="gradient-text">blooming icons.</span>
            </h1>
            <p className="hero-copy">
              A focused workspace for synthesizing polished SVG icon families,
              experimenting with vector color, and exporting production-ready
              assets.
            </p>
            <div className="status">
              <span className="status-dot" />
              {generationState === "generating"
                ? "Gemini generation in progress"
                : generationState === "ready"
                  ? "Gemini generation ready"
                  : "Phase 3 generation engine"}
            </div>
          </article>

          <aside className="card preview-card" aria-label="Icon Bloom preview">
            <div className="bloom-orbit">
              <span className="orbit-dot" />
              <span className="orbit-dot" />
              <span className="orbit-dot" />
              <div className="bloom-icon">✿</div>
            </div>
          </aside>
        </section>

        <div className="section-label">{activeTab}</div>

        {activeTab === "Workspace" && viewMode === "workspace" && (
          <>
            <section className="workspace-layout">
            <form className="card workspace-card" onSubmit={handleSynthesize}>
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">Setup Workspace</div>
                  <h2>Build your icon family</h2>
                </div>
                <span className="panel-badge">Phase 3</span>
              </div>

              <div className="field">
                <label htmlFor="style">Visual style</label>
                <select
                  id="style"
                  value={style}
                  disabled={generationState === "generating"}
                  onChange={(event) => {
                    setStyle(event.target.value);
                    setWorkspaceMessage("");
                  }}
                >
                  {styleOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="field-help">{styleLabel(style)}</p>
              </div>

              {style === "custom" && (
                <div className="field">
                  <label htmlFor="style-reference">Style reference</label>
                  <label className="upload-box" htmlFor="style-reference">
                    <span className="upload-icon">↥</span>
                    <span>
                      {referenceFile
                        ? referenceFile.name
                        : "Choose an image reference"}
                    </span>
                    <small>PNG, JPG, WEBP • max 4 MB</small>
                  </label>
                  <input
                    id="style-reference"
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={generationState === "generating"}
                    onChange={(event) =>
                      setReferenceFile(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
              )}

              <div className="field">
                <div className="label-row">
                  <label htmlFor="description">Icon family description</label>
                  <span>{description.length}/500</span>
                </div>
                <textarea
                  id="description"
                  value={description}
                  maxLength={500}
                  disabled={generationState === "generating"}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setWorkspaceMessage("");
                  }}
                  placeholder="Example: playful productivity icons with rounded shapes, tiny sparkles, and friendly expressive details."
                  rows={5}
                />
              </div>

              <div className="control-grid">
                <div className="field">
                  <label htmlFor="count">Quantity</label>
                  <input
                    id="count"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    inputMode="numeric"
                    value={count}
                    disabled={generationState === "generating"}
                    onChange={(event) => setCount(event.target.value)}
                    onBlur={() => {
                      const value = Math.min(10, Math.max(1, Number(count) || 1));
                      setCount(String(value));
                    }}
                  />
                  <p className="field-help">Choose 1–10 icons per request.</p>
                </div>

                <div className="field">
                  <label htmlFor="model">Generation model</label>
                  <select
                    id="model"
                    value={model}
                    disabled={generationState === "generating"}
                    onChange={(event) => setModel(event.target.value)}
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  </select>
                </div>
              </div>

              <div className="palette">
                <div className="label-row">
                  <label>Color Studio</label>
                  <span>{colorMode === "single" ? "Single color" : `${selectedColors.length} color stops`}</span>
                </div>

                <div className="color-mode-toggle" role="group" aria-label="Color selection mode">
                  <button type="button" className={colorMode === "single" ? "active" : ""} onClick={() => handleColorModeChange("single")} disabled={generationState === "generating"}>Single color</button>
                  <button type="button" className={colorMode === "multiple" ? "active" : ""} onClick={() => handleColorModeChange("multiple")} disabled={generationState === "generating"}>Multiple colors</button>
                </div>

                <div className="color-studio">
                  <div className="picker-stack">
                    <div
                      className="color-wheel"
                      role="slider"
                      aria-label="Color wheel hue"
                      aria-valuemin="0"
                      aria-valuemax="359"
                      tabIndex="0"
                      style={{ "--wheel-hue": wheelHue, "--wheel-color": customColor }}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        handleColorWheelPointer(event);
                      }}
                      onPointerMove={(event) => {
                        if (event.buttons) handleColorWheelPointer(event);
                      }}
                    >
                      <span className="color-wheel-center" aria-hidden="true" />
                      <span className="color-wheel-dot" style={{ transform: "rotate(" + wheelHue + "deg) translateY(-50px)" }} aria-hidden="true" />
                    </div>

                    <div
                      className="color-wheel-sv"
                      role="slider"
                      aria-label="Color saturation and brightness"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      tabIndex="0"
                      style={{ "--wheel-hue": wheelHue, "--wheel-color": customColor }}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        handleColorWheelSVPointer(event);
                      }}
                      onPointerMove={(event) => {
                        if (event.buttons) handleColorWheelSVPointer(event);
                      }}
                    >
                      <span
                        className="color-sv-dot"
                        style={{
                          left: `${wheelSaturation * 100}%`,
                          top: `${(1 - wheelValue) * 100}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="color-studio-controls">
                    <div className="color-preview-row">
                      <span className="color-preview" style={{ backgroundColor: customColor }} />
                      <div>
                        <strong>{customColor.toUpperCase()}</strong>
                        <span>Wheel selection</span>
                      </div>
                    </div>

                    <div className="color-roles">
                      {selectedColors.map((value, index) => (
                        <div className="color-role" key={value}>
                          <span className="color-role-dot" style={{ backgroundColor: value }} />
                          <strong>{index === 0 ? "Primary" : index === 1 ? "Secondary" : index === 2 ? "Accent" : `Color ${index + 1}`}</strong>
                          <code>{value}</code>
                          {colorMode === "multiple" && index > 0 && (
                            <button type="button" aria-label={`Remove ${value}`} onClick={() => removeCustomColor(value)} disabled={generationState === "generating"}>×</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button className="add-color-button" type="button" onClick={handleAddCustomColor} disabled={generationState === "generating"}>
                      + Add current color
                    </button>
                  </div>
                </div>

                <div className="swatches" aria-label="Dream Pop Sugar Bloom palette">
                  {colorSwatches.map((swatch) => {
                    const selected = selectedColors.includes(swatch.value);
                    return (
                      <button className={`swatch ${selected ? "selected" : ""}`} key={swatch.value} type="button" title={`${swatch.name} ${swatch.value}`} aria-label={`${swatch.name} ${swatch.value}`} aria-pressed={selected} style={{ backgroundColor: swatch.value }} onClick={() => togglePaletteColor(swatch.value)} disabled={generationState === "generating"} />
                    );
                  })}
                  {customColors.map((value) => {
                    const selected = selectedColors.includes(value);
                    return (
                      <button className={`swatch custom-swatch ${selected ? "selected" : ""}`} key={value} type="button" title={`Custom hue ${value}`} aria-label={`Custom hue ${value}`} aria-pressed={selected} style={{ backgroundColor: value }} onClick={() => togglePaletteColor(value)} disabled={generationState === "generating"} />
                    );
                  })}
                </div>

                <div className="color-treatment">
                  <div className="label-row">
                    <label>Color treatment</label>
                    <span>{colorMode === "single" ? "Solid" : colorTreatment}</span>
                  </div>
                  <div className="treatment-grid" role="group" aria-label="Color treatment">
                    {[
                      ["solid", "Solid"],
                      ["linear-gradient", "Primary → Secondary"],
                      ["radial-bloom", "Radial Bloom"],
                      ["multi-mix", "Multi-Color Mix"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`treatment-button ${(colorMode === "single" ? value === "solid" : colorTreatment === value) ? "active" : ""}`}
                        onClick={() => setColorTreatment(value)}
                        disabled={generationState === "generating" || (colorMode === "single" && value !== "solid")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="palette-help">
                  {colorMode === "single"
                    ? "One selected color is used as the icon's solid artwork color."
                    : "Primary → Secondary blends the first two colors. Multi-Color Mix uses every selected color as a deliberate SVG gradient stop."}
                </p>
              </div>

              <button
                className="synthesize-button"
                type="submit"
                disabled={generationState === "generating"}
              >
                <span>✦</span>
                {generationState === "generating"
                  ? "Synthesizing…"
                  : generationState === "ready"
                    ? "Synthesize Another Family"
                    : "Synthesize Icon Family"}
                <span className="button-count">{count}</span>
              </button>

              {workspaceMessage && (
                <div
                  className={`workspace-message state-${generationState}`}
                  role="status"
                  aria-live="polite"
                >
                  {workspaceMessage}
                </div>
              )}
            </form>

            <aside className="card workspace-summary">
              <div className="panel-kicker">Generation brief</div>
              <h2>
                {generationState === "ready"
                  ? "Family generated"
                  : generationState === "generating"
                    ? "Synthesizing…"
                    : "Ready to synthesize"}
              </h2>
              <div className="summary-list">
                <div>
                  <span>Style</span>
                  <strong>{styleLabel(style)}</strong>
                </div>
                <div>
                  <span>Quantity</span>
                  <strong>{count} SVGs</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>Gemini 3.6 Flash</strong>
                </div>
                <div>
                  <span>Palette</span>
                  <strong>
                    {selectedColors.length} {colorMode === "single" ? "color" : "colors"} • {colorMode === "single" ? "Solid" : colorTreatment}
                  </strong>
                </div>
              </div>

              {generatedIcons.length > 0 && (
                <div className="summary-note">
                  <strong>{generatedIcons.length} icons received.</strong>
                  <br />
                  First icon: {generatedIcons[0].name}
                  <br />
                  SVG payloads are ready for the validation/export phases.
                </div>
              )}

              {generatedIcons.length === 0 && (
                <div className="summary-note">
                  Phase 3 connects this workspace to the server-side Gemini
                  endpoint. Generated SVGs will be surfaced in the Glyph Catalog
                  during Phase 6.
                </div>
              )}
            </aside>
          </section>

          {generatedIcons.length > 0 && (
            <section className="generation-success" aria-label="Generation complete">
              <div className="success-icon" aria-hidden="true">✓</div>
              <div className="success-copy">
                <div className="panel-kicker">Generation complete</div>
                <h2>Your SVG is ready</h2>
                <p>
                  {generatedIcons.length} validated SVG{generatedIcons.length === 1 ? "" : "s"} generated successfully.
                  Open the viewer to inspect the artwork before exporting.
                </p>
              </div>
              <button
                className="view-svg-button"
                type="button"
                onClick={() => setViewMode("viewer")}
              >
                View SVG <span>→</span>
              </button>
            </section>
          )}
        )}

          </>
        )}

        {activeTab === "Workspace" && viewMode === "viewer" && generatedIcons.length > 0 && (
          <section className="svg-viewer-page" aria-label="Generated SVG viewer">
            <div className="viewer-header">
              <button
                className="back-button"
                type="button"
                onClick={() => setViewMode("workspace")}
              >
                ← Back to Workspace
              </button>
              <div>
                <div className="panel-kicker">Generated assets</div>
                <h2>Your SVG family</h2>
              </div>
              <span>{generatedIcons.length} SVG{generatedIcons.length === 1 ? "" : "s"}</span>
            </div>

            <div className="viewer-gallery">
              {generatedIcons.map((icon) => (
                <article className="card viewer-card" key={icon.id}>
                  <div className="viewer-preview">
                    <div
                      className="generated-svg"
                      role="img"
                      aria-label={icon.name}
                      dangerouslySetInnerHTML={{ __html: icon.svg }}
                    />
                  </div>

                  <div className="viewer-info">
                    <div>
                      <h3>{icon.name}</h3>
                      <span>64 × 64 SVG • validated</span>
                    </div>
                    <div className="viewer-actions">
                      <button type="button" onClick={() => handleCopySvg(icon.svg)}>
                        Copy SVG
                      </button>
                      <button type="button" onClick={() => handleDownloadSvg(icon)}>
                        Download SVG
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "Live Sandbox" && (
          <section className="card placeholder-panel">
            <div className="panel-kicker">Phase 5</div>
            <h2>Live Sandbox</h2>
            <p>
              Prompt playground, color controls, and vector preview will be
              implemented after the generation engine.
            </p>
          </section>
        )}

        {activeTab === "Glyph Catalog" && (
          <section className="card placeholder-panel">
            <div className="panel-kicker">Phase 6</div>
            <h2>Glyph Catalog</h2>
            <p>
              Generated SVG cards, inspector access, and ZIP export will appear
              here after the generation pipeline is connected.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

document.documentElement.dataset.theme = "dark";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
