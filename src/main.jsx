import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const tabs = ["Workspace", "Live Sandbox", "Glyph Catalog"];

function App() {
  const [theme, setTheme] = useState("dark");
  const [activeTab, setActiveTab] = useState("Workspace");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
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
              Phase 1 visual foundation
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

        <div className="section-label">{activeTab} • foundation</div>

        <section className="feature-grid">
          <article className="card feature">
            <div className="feature-icon">✎</div>
            <h2>Describe</h2>
            <p>Define the icon family you want with style and quantity controls.</p>
          </article>
          <article className="card feature">
            <div className="feature-icon">◇</div>
            <h2>Synthesize</h2>
            <p>Gemini generation will connect here in the dedicated generation phase.</p>
          </article>
          <article className="card feature">
            <div className="feature-icon">↗</div>
            <h2>Export</h2>
            <p>Validated SVG assets will later be available individually or as a ZIP.</p>
          </article>
        </section>
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
