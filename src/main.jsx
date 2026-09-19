import React, { useState } from "react";
import { createRoot } from "react-dom/client";
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
    description: "Upload a visual reference for the future generation pipeline.",
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

function App() {
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("Workspace");
  const [style, setStyle] = useState("handdrawn");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("10");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [referenceFile, setReferenceFile] = useState(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  const handleSynthesize = (event) => {
    event.preventDefault();

    if (!description.trim()) {
      setWorkspaceMessage("Add an icon-family description before synthesizing.");
      return;
    }

    if (style === "custom" && !referenceFile) {
      setWorkspaceMessage("Upload a style reference when using Custom Style Reference.");
      return;
    }

    setWorkspaceMessage(
      "Workspace validated. Gemini generation connects in Phase 3.",
    );
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
              Phase 2 workspace foundation
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

        {activeTab === "Workspace" && (
          <section className="workspace-layout">
            <form className="card workspace-card" onSubmit={handleSynthesize}>
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">Setup Workspace</div>
                  <h2>Build your icon family</h2>
                </div>
                <span className="panel-badge">Phase 2</span>
              </div>

              <div className="field">
                <label htmlFor="style">Visual style</label>
                <select
                  id="style"
                  value={style}
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
                <p className="field-help">
                  {styleOptions.find((option) => option.value === style)?.description}
                </p>
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
                    <small>PNG, JPG, WEBP</small>
                  </label>
                  <input
                    id="style-reference"
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
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
                  <select
                    id="count"
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  >
                    {["10", "20", "30", "40"].map((value) => (
                      <option value={value} key={value}>
                        {value} icons
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="model">Generation model</label>
                  <select
                    id="model"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
              </div>

              <div className="palette">
                <div className="label-row">
                  <label>Dream Pop palette</label>
                  <span>Semantic colors</span>
                </div>
                <div className="swatches" aria-label="Dream Pop Sugar Bloom palette">
                  {colorSwatches.map((swatch) => (
                    <span
                      className="swatch"
                      key={swatch.value}
                      title={`${swatch.name} ${swatch.value}`}
                      style={{ backgroundColor: swatch.value }}
                    />
                  ))}
                </div>
              </div>

              <button className="synthesize-button" type="submit">
                <span>✦</span>
                Synthesize Icon Family
                <span className="button-count">{count}</span>
              </button>

              {workspaceMessage && (
                <div className="workspace-message" role="status">
                  {workspaceMessage}
                </div>
              )}
            </form>

            <aside className="card workspace-summary">
              <div className="panel-kicker">Generation brief</div>
              <h2>Ready to synthesize</h2>
              <div className="summary-list">
                <div>
                  <span>Style</span>
                  <strong>
                    {styleOptions.find((option) => option.value === style)?.label}
                  </strong>
                </div>
                <div>
                  <span>Quantity</span>
                  <strong>{count} SVGs</strong>
                </div>
                <div>
                  <span>Model</span>
                  <strong>Gemini 2.5 Flash</strong>
                </div>
                <div>
                  <span>Palette</span>
                  <strong>6 semantic swatches</strong>
                </div>
              </div>
              <div className="summary-note">
                Generation is intentionally not called yet. Phase 3 will connect
                this validated workspace to the server-side Gemini endpoint.
              </div>
            </aside>
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
