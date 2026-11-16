import { useState, useEffect } from "react";
import { Link } from "wouter";
import { websiteStore, useWebsites, type WebsiteItem } from "../cinema/websiteStore";
import { aiService, AI_PRESETS, type AiConfig, type GeneratedCardData } from "../cinema/aiService";
import "./admin.css";

const PRESET_THEMES = [
  { key: "cyan", label: "Pulse Cyan", hex: "#00d4ff" },
  { key: "green", label: "Matrix Green", hex: "#16a34a" },
  { key: "blue", label: "Cyber Blue", hex: "#0b2cff" },
  { key: "amber", label: "Solar Amber", hex: "#ffa116" },
  { key: "purple", label: "Neon Purple", hex: "#a97bff" },
  { key: "red", label: "Crimson Red", hex: "#dc2626" },
] as const;

type ActiveTab = "cards" | "ai-gen" | "ai-config" | "backup";

interface AdminPageProps {
  onLogout?: () => void;
}

export default function AdminPage({ onLogout }: AdminPageProps = {}) {
  const websites = useWebsites();
  const [activeTab, setActiveTab] = useState<ActiveTab>("cards");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => aiService.getConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // AI Generator Tool State
  const [targetUrlInput, setTargetUrlInput] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [aiGeneratedCard, setAiGeneratedCard] = useState<GeneratedCardData | null>(null);
  const [showScrapedDetails, setShowScrapedDetails] = useState(false);

  // Manual Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formStack, setFormStack] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("#00d4ff");
  const [formTheme, setFormTheme] = useState<"blue" | "green" | "amber" | "purple" | "cyan" | "red">("cyan");

  // Backup / Import State
  const [importJsonText, setImportJsonText] = useState("");

  function showToast(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  // Save AI Config
  function handleSaveAiConfig(e: React.FormEvent) {
    e.preventDefault();
    aiService.saveConfig(aiConfig);
    showToast("AI Configuration saved successfully!");
  }

  // Test AI Connection
  async function handleTestAiConnection() {
    setTestingConnection(true);
    const result = await aiService.testConnection(aiConfig);
    setTestingConnection(false);
    if (result.success) {
      showToast(result.message, "success");
    } else {
      showToast(result.message, "error");
    }
  }

  // Run AI Card Generator
  async function handleRunAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrlInput.trim()) {
      showToast("Please enter a website URL or domain.", "error");
      return;
    }

    setGeneratingAi(true);
    setAiGeneratedCard(null);
    setAiProgress("Step 1/3: Visiting and analyzing live website content...");

    try {
      const generated = await aiService.generateCard(targetUrlInput, aiConfig, (p) => {
        setAiProgress(p.message);
      });
      setAiGeneratedCard(generated);
      showToast(`AI successfully analyzed and generated 3D card for ${generated.name}!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to generate card with AI.", "error");
    } finally {
      setGeneratingAi(false);
      setAiProgress(null);
    }
  }

  // Add AI Card directly to 3D rail
  function handleAddAiCardToRail() {
    if (!aiGeneratedCard) return;
    websiteStore.add({
      name: aiGeneratedCard.name,
      title: aiGeneratedCard.title,
      url: aiGeneratedCard.url,
      tag: aiGeneratedCard.tag,
      stack: aiGeneratedCard.stack,
      desc: aiGeneratedCard.desc,
      color: aiGeneratedCard.color,
      theme: aiGeneratedCard.theme,
    });
    showToast(`Added ${aiGeneratedCard.name} to 3D sliding cards!`, "success");
    setAiGeneratedCard(null);
    setTargetUrlInput("");
    setActiveTab("cards");
  }

  // Open Form to edit AI generated card before adding
  function handleEditAiCardBeforeAdding() {
    if (!aiGeneratedCard) return;
    setEditingId(null);
    setFormName(aiGeneratedCard.name);
    setFormTitle(aiGeneratedCard.title);
    setFormUrl(aiGeneratedCard.url);
    setFormTag(aiGeneratedCard.tag);
    setFormStack(aiGeneratedCard.stack);
    setFormDesc(aiGeneratedCard.desc);
    setFormColor(aiGeneratedCard.color);
    setFormTheme(aiGeneratedCard.theme);
    setModalOpen(true);
  }

  // Open Manual Add Modal
  function openAddModal() {
    setEditingId(null);
    setFormName("");
    setFormTitle("");
    setFormUrl("https://");
    setFormTag("ONLINE PLATFORM");
    setFormStack("RESOURCES · WEB · PORTAL");
    setFormDesc("");
    setFormColor("#00d4ff");
    setFormTheme("cyan");
    setModalOpen(true);
  }

  // Open Edit Modal
  function openEditModal(site: WebsiteItem) {
    setEditingId(site.id);
    setFormName(site.name);
    setFormTitle(site.title || site.name);
    setFormUrl(site.url);
    setFormTag(site.tag || "");
    setFormStack(site.stack || "");
    setFormDesc(site.desc || "");
    setFormColor(site.color || "#00d4ff");
    setFormTheme(site.theme || "cyan");
    setModalOpen(true);
  }

  // Save Card (Manual or Edit)
  function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      showToast("Domain name and URL are required.", "error");
      return;
    }

    let cleanUrl = formUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (editingId) {
      websiteStore.update(editingId, {
        name: formName.trim().toLowerCase(),
        title: formTitle.trim() || formName.trim(),
        url: cleanUrl,
        tag: formTag.trim().toUpperCase(),
        stack: formStack.trim().toUpperCase(),
        desc: formDesc.trim(),
        color: formColor,
        theme: formTheme,
      });
      showToast(`Updated ${formName} successfully!`, "success");
    } else {
      websiteStore.add({
        name: formName.trim().toLowerCase(),
        title: formTitle.trim() || formName.trim(),
        url: cleanUrl,
        tag: formTag.trim().toUpperCase(),
        stack: formStack.trim().toUpperCase(),
        desc: formDesc.trim(),
        color: formColor,
        theme: formTheme,
      });
      showToast(`Added ${formName} to 3D sliding cards!`, "success");
    }

    setModalOpen(false);
  }

  // Delete Card
  function handleDeleteCard(id: string, siteName: string) {
    if (confirm(`Remove "${siteName}" from the 3D sliding cards?`)) {
      websiteStore.delete(id);
      showToast(`Deleted ${siteName}`);
    }
  }

  // Reset Defaults
  function handleResetDefaults() {
    if (confirm("Reset to default websites (learnfreex.ct.ws, lotusstudy.in, etc.)?")) {
      websiteStore.reset();
      showToast("Reset to default websites list.");
    }
  }

  // Export JSON
  function handleExportJson() {
    const json = websiteStore.exportJson();
    navigator.clipboard.writeText(json).then(
      () => showToast("Export JSON copied to clipboard!"),
      () => {
        const blob = new Blob([json], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "linkconnect_websites.json";
        a.click();
        showToast("Exported configuration to file!");
      },
    );
  }

  // Import JSON
  function handleImportJson(e: React.FormEvent) {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    const ok = websiteStore.importJson(importJsonText.trim());
    if (ok) {
      setImportJsonText("");
      showToast("Imported websites successfully!");
      setActiveTab("cards");
    } else {
      showToast("Invalid JSON format. Please verify structure.", "error");
    }
  }

  const isAiConfigured = Boolean(aiConfig.baseUrl && (aiConfig.apiKey || aiConfig.baseUrl.includes("localhost")));

  return (
    <div className="admin-root">
      <div className="admin-container">
        {/* Classic Header */}
        <header className="admin-header">
          <div className="admin-title-wrap">
            <div className="admin-brand-icon">⚡</div>
            <h1 className="admin-title">LINK CONNECT // ADMIN CONSOLE</h1>
            <span className="admin-badge admin-badge-success">● LIVE PERSISTED</span>
            <span className="admin-badge admin-badge-zplus">🛡️ Z+ CLEARANCE ACTIVE</span>
            {isAiConfigured ? (
              <span className="admin-badge admin-badge-ai">✨ AI READY</span>
            ) : (
              <span className="admin-badge">AI SETUP REQUIRED</span>
            )}
          </div>

          <div className="admin-header-actions">
            <Link href="/" className="admin-btn">
              ← VIEW 3D SHOWCASE
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={openAddModal}
            >
              + ADD CARD
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-lock"
              onClick={() => {
                if (confirm("Terminate Z+ session and lock console?")) {
                  if (onLogout) onLogout();
                  else window.location.reload();
                }
              }}
              title="Terminate session and lock admin console"
            >
              🔒 LOCK CONSOLE
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {message && (
          <div
            className="admin-toast-banner"
            style={{
              borderColor: message.type === "error" ? "#ff5f5688" : "#00d4ff66",
              color: message.type === "error" ? "#ff6b6b" : "#00d4ff",
              background: message.type === "error" ? "#ff5f5614" : "#00d4ff14",
            }}
          >
            <span>{message.type === "error" ? "⚠" : "✓"} {message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", fontSize: "14px" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Executive Metrics Overview */}
        <div className="admin-metrics-row">
          <div className="admin-metric-tile">
            <span className="admin-metric-label">3D SLIDING CARDS</span>
            <p className="admin-metric-value">{websites.length} <span style={{ fontSize: "14px", color: "#64748b" }}>cards</span></p>
            <span className="admin-metric-sub">Active in WebGL CRT Rail</span>
          </div>
          <div className="admin-metric-tile">
            <span className="admin-metric-label">AI AUTO-GENERATOR</span>
            <p className="admin-metric-value" style={{ color: isAiConfigured ? "#c084fc" : "#94a3b8" }}>
              {isAiConfigured ? "ONLINE" : "OFFLINE"}
            </p>
            <span className="admin-metric-sub">
              {isAiConfigured ? `${aiConfig.model} via ${new URL(aiConfig.baseUrl).hostname}` : "Configure API in AI Settings tab"}
            </span>
          </div>
          <div className="admin-metric-tile">
            <span className="admin-metric-label">FEATURED WEBSITES</span>
            <p className="admin-metric-value" style={{ fontSize: "15px", color: "#38bdf8" }}>
              learnfreex.ct.ws · lotusstudy.in
            </p>
            <span className="admin-metric-sub">Primary Showcase Anchors</span>
          </div>
        </div>

        {/* Classic Clean Navigation Tabs */}
        <nav className="admin-tabs-nav">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "cards" ? "is-active" : ""}`}
            onClick={() => setActiveTab("cards")}
          >
            🗂 3D SLIDING CARDS ({websites.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "ai-gen" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ai-gen")}
          >
            ✨ AI CARD GENERATOR
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "ai-config" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ai-config")}
          >
            ⚙ AI API CONFIGURATION
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "backup" ? "is-active" : ""}`}
            onClick={() => setActiveTab("backup")}
          >
            💾 BACKUP &amp; SYNC
          </button>
        </nav>

        {/* ======================================================== */}
        {/* TAB 1: 3D CARDS DIRECTORY */}
        {/* ======================================================== */}
        {activeTab === "cards" && (
          <div className="admin-card-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">
                <span>ACTIVE 3D CARDS DIRECTORY</span>
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-ai"
                  onClick={() => setActiveTab("ai-gen")}
                >
                  ✨ AI AUTO-GENERATE
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={openAddModal}
                >
                  + MANUAL ADD
                </button>
              </div>
            </div>

            <p className="admin-panel-desc">
              Manage the sequence of website cards on the 3D sliding rail. Click Up/Down arrows to change slide order, or test open any destination directly.
            </p>

            <div className="admin-cards-list">
              {websites.map((site, index) => (
                <div className="admin-card-item" key={site.id}>
                  {/* Reorder Buttons */}
                  <div className="admin-reorder-box">
                    <button
                      type="button"
                      className="admin-btn-reorder"
                      onClick={() => websiteStore.reorder(index, index - 1)}
                      disabled={index === 0}
                      title="Slide Earlier"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="admin-btn-reorder"
                      onClick={() => websiteStore.reorder(index, index + 1)}
                      disabled={index === websites.length - 1}
                      title="Slide Later"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Indicator Dot */}
                  <div
                    className="admin-card-indicator"
                    style={{ backgroundColor: site.color || "#00d4ff", color: site.color || "#00d4ff" }}
                    title={`Theme: ${site.theme || "custom"}`}
                  />

                  {/* Information */}
                  <div className="admin-card-info">
                    <div className="admin-card-headline">
                      <span style={{ color: "#64748b", fontSize: "12px" }}>[{String(index + 1).padStart(2, "0")}]</span>
                      <span className="admin-card-title">{site.title || site.name}</span>
                      <span className="admin-card-tag">{site.tag}</span>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-card-url"
                        title="Test launch site"
                      >
                        {site.name} ↗
                      </a>
                    </div>
                    <p className="admin-card-desc">{site.desc || "No description provided."}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="admin-card-actions">
                    <a href={site.url} target="_blank" rel="noreferrer" className="admin-btn" style={{ padding: "6px 10px" }}>
                      TEST ↗
                    </a>
                    <button type="button" className="admin-btn" onClick={() => openEditModal(site)} style={{ padding: "6px 10px" }}>
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleDeleteCard(site.id, site.name)}
                      style={{ padding: "6px 10px" }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AI CARD GENERATOR TOOL */}
        {/* ======================================================== */}
        {activeTab === "ai-gen" && (
          <div className="admin-card-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">
                <span>✨ AI WEBSITE 3D CARD GENERATOR</span>
              </h2>
              <span className="admin-badge admin-badge-ai">AUTONOMOUS CURATOR</span>
            </div>

            <p className="admin-panel-desc">
              Enter any website domain or URL (e.g. <code>learnfreex.ct.ws</code>, <code>lotusstudy.in</code>, or any new portal).
              The configured AI model will inspect the destination and construct its 3D card structure: brand title, category tag, feature stack, description, and CRT color styling.
            </p>

            <form onSubmit={handleRunAiGenerate}>
              <div className="admin-ai-bar">
                <input
                  type="text"
                  className="admin-ai-input"
                  placeholder="Enter website URL or domain (e.g. unite-cbt.kdns.fr or learnfreex.ct.ws)..."
                  value={targetUrlInput}
                  onChange={(e) => setTargetUrlInput(e.target.value)}
                  disabled={generatingAi}
                />
                <button
                  type="submit"
                  className="admin-btn admin-btn-ai"
                  style={{ padding: "12px 24px", fontSize: "13px" }}
                  disabled={generatingAi}
                >
                  {generatingAi ? "ANALYZING & GENERATING..." : "✨ GENERATE 3D CARD"}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center", flexWrap: "wrap", fontSize: "11px", color: "#64748b" }}>
                <span>Quick Example:</span>
                {[
                  { domain: "unite-cbt.kdns.fr", label: "unite-cbt.kdns.fr" },
                  { domain: "learnfreex.ct.ws", label: "learnfreex.ct.ws" },
                  { domain: "lotusstudy.in", label: "lotusstudy.in" },
                ].map((item) => (
                  <button
                    key={item.domain}
                    type="button"
                    onClick={() => setTargetUrlInput(item.domain)}
                    style={{
                      background: "#ffffff0a",
                      border: "1px solid #ffffff18",
                      color: "#38bdf8",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  >
                    ⚡ {item.label}
                  </button>
                ))}
              </div>
            </form>

            {/* Live Multi-Step Progress Indicator */}
            {generatingAi && (
              <div
                style={{
                  padding: "16px 20px",
                  background: "#a855f714",
                  border: "1px solid #a855f755",
                  borderRadius: "8px",
                  color: "#c084fc",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  fontSize: "13px",
                  boxShadow: "0 0 20px #a855f722",
                }}
              >
                <span className="cx-pulse-dot" style={{ background: "#c084fc", boxShadow: "0 0 10px #c084fc" }} />
                <span style={{ fontWeight: 700 }}>{aiProgress || "Analyzing website content..."}</span>
              </div>
            )}

            {!isAiConfigured && (
              <div style={{ padding: "14px 18px", background: "#f59e0b18", border: "1px solid #f59e0b44", borderRadius: "8px", color: "#fbbf24", marginBottom: "20px", fontSize: "12.5px" }}>
                Notice: AI API is not configured yet. Go to the <strong>&quot;AI API Configuration&quot;</strong> tab to set your Base URL and API Token (OpenAI, OpenRouter, Groq, or Local Ollama).
              </div>
            )}

            {/* AI Generated Result Preview */}
            {aiGeneratedCard && (
              <div style={{ marginTop: "24px", padding: "24px", background: "#060910", border: "1px solid #a855f755", borderRadius: "10px", boxShadow: "0 0 30px #a855f722" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "#c084fc", fontWeight: 800 }}>✓ AI CARD STRUCTURE READY</span>
                    <span className="admin-badge" style={{ color: aiGeneratedCard.color, borderColor: aiGeneratedCard.color }}>
                      {aiGeneratedCard.theme.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={handleEditAiCardBeforeAdding}
                    >
                      EDIT BEFORE ADDING
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      onClick={handleAddAiCardToRail}
                    >
                      + ADD DIRECTLY TO 3D SLIDING RAIL
                    </button>
                  </div>
                </div>

                {/* Scraped Website Analysis Evidence Box */}
                {aiGeneratedCard.scraped && (
                  <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#0c111c", border: "1px solid #ffffff18", borderRadius: "6px" }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                      onClick={() => setShowScrapedDetails(!showScrapedDetails)}
                      title="Click to toggle live scraped site details"
                    >
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>
                        {showScrapedDetails ? "▼" : "▶"} LIVE WEBSITE ANALYSIS REPORT ({aiGeneratedCard.scraped.success ? "HTML SCRAPED SUCCESSFULLY" : "DOMAIN ANALYSIS"})
                      </span>
                      <span style={{ fontSize: "11px", color: "#00d4ff" }}>
                        {showScrapedDetails ? "HIDE REPORT" : "VIEW SCRAPED EVIDENCE"}
                      </span>
                    </div>

                    {showScrapedDetails && (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#cbd5e1", display: "grid", gap: "6px", borderTop: "1px solid #ffffff10", paddingTop: "10px" }}>
                        <div><strong style={{ color: "#64748b" }}>Live URL:</strong> <a href={aiGeneratedCard.scraped.url} target="_blank" rel="noreferrer" style={{ color: "#00d4ff" }}>{aiGeneratedCard.scraped.url} ↗</a></div>
                        {aiGeneratedCard.scraped.title && <div><strong style={{ color: "#64748b" }}>Scraped Page Title:</strong> {aiGeneratedCard.scraped.title}</div>}
                        {aiGeneratedCard.scraped.description && <div><strong style={{ color: "#64748b" }}>Scraped Meta Description:</strong> {aiGeneratedCard.scraped.description}</div>}
                        {aiGeneratedCard.scraped.keywords && <div><strong style={{ color: "#64748b" }}>Keywords:</strong> {aiGeneratedCard.scraped.keywords}</div>}
                        {aiGeneratedCard.scraped.headings.length > 0 && <div><strong style={{ color: "#64748b" }}>Headings Extracted:</strong> {aiGeneratedCard.scraped.headings.join(" · ")}</div>}
                        {aiGeneratedCard.scraped.bodySnippet && <div><strong style={{ color: "#64748b" }}>Scraped Text Snippet:</strong> {aiGeneratedCard.scraped.bodySnippet.slice(0, 320)}...</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* High-Fidelity 3D CRT Monitor Simulator Preview */}
                <div
                  className="admin-preview-crt"
                  style={{
                    borderColor: `${aiGeneratedCard.color}66`,
                    background: "radial-gradient(circle at 70% 30%, #0a1324 0%, #040812 100%)",
                    boxShadow: `0 0 30px ${aiGeneratedCard.color}22`,
                  }}
                >
                  {/* Top Browser Bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingBottom: "10px",
                      marginBottom: "16px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56" }} />
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f" }} />
                      <span style={{ color: "#94a3b8", marginLeft: "12px" }}>// ADDRESS // {aiGeneratedCard.name}</span>
                    </div>
                    <div style={{ color: "#22c55e", fontWeight: 700 }}>● LIVE · 200 OK CONNECTED</div>
                  </div>

                  {/* Two-Column Card Preview */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "start" }}>
                    {/* Left Column: Brand, Description, Chips & Action Button */}
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          background: `${aiGeneratedCard.color}22`,
                          border: `1px solid ${aiGeneratedCard.color}55`,
                          color: aiGeneratedCard.color,
                          fontSize: "11px",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          marginBottom: "10px",
                        }}
                      >
                        // {aiGeneratedCard.name.toUpperCase()}
                      </div>

                      <h3 style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", margin: "0 0 8px" }}>
                        {aiGeneratedCard.title}
                      </h3>

                      <p style={{ fontSize: "12px", color: aiGeneratedCard.color, fontWeight: 700, margin: "0 0 10px", fontFamily: "monospace" }}>
                        {aiGeneratedCard.tag}
                      </p>

                      <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: "1.6", margin: "0 0 14px" }}>
                        {aiGeneratedCard.desc}
                      </p>

                      {/* Feature Chips */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
                        {(aiGeneratedCard.stack || "WEB · ONLINE · RESOURCE").split(" · ").map((chip) => (
                          <span
                            key={chip}
                            style={{
                              padding: "4px 8px",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.14)",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontFamily: "monospace",
                              color: "#cbd5e1",
                            }}
                          >
                            [ {chip} ]
                          </span>
                        ))}
                      </div>

                      {/* Action Button */}
                      <a
                        href={aiGeneratedCard.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 18px",
                          borderRadius: "8px",
                          background: `linear-gradient(135deg, ${aiGeneratedCard.color}, #0b2cff)`,
                          color: "#ffffff",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: 800,
                          textDecoration: "none",
                          boxShadow: `0 0 16px ${aiGeneratedCard.color}55`,
                        }}
                      >
                        &gt; VISIT {aiGeneratedCard.name.toUpperCase()} ↗
                      </a>
                    </div>

                    {/* Right Column: Visualizer Spectrum & Stats */}
                    <div
                      style={{
                        background: "rgba(10, 16, 28, 0.8)",
                        border: `1px solid ${aiGeneratedCard.color}44`,
                        borderRadius: "10px",
                        padding: "16px",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: aiGeneratedCard.color, fontFamily: "monospace", fontWeight: 700, marginBottom: "14px" }}>
                        LINK ACTIVITY // SPECTRUM
                      </div>

                      {/* Animated Equalizer Waveform Simulator */}
                      <div style={{ display: "flex", alignItems: "flex-end", height: "70px", gap: "4px", marginBottom: "16px", padding: "0 4px" }}>
                        {[40, 65, 30, 85, 55, 95, 70, 45, 80, 60, 90, 75, 50, 85, 65, 40].map((h, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${h}%`,
                              background: `linear-gradient(to top, ${aiGeneratedCard.color}44, ${aiGeneratedCard.color})`,
                              borderRadius: "2px",
                            }}
                          />
                        ))}
                      </div>

                      {/* Stats Table */}
                      <div style={{ display: "grid", gap: "6px", fontSize: "10px", fontFamily: "monospace", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>PROTOCOL</span>
                          <span style={{ color: "#e2e8f0" }}>HTTP/2 TLS 1.3</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>STATUS</span>
                          <span style={{ color: "#22c55e", fontWeight: 700 }}>200 OK CONNECTED</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>TRAFFIC</span>
                          <span style={{ color: "#e2e8f0" }}>1.2GB / SEC</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>UPTIME</span>
                          <span style={{ color: "#38bdf8" }}>99.98%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: AI API CONFIGURATION */}
        {/* ======================================================== */}
        {activeTab === "ai-config" && (
          <div className="admin-card-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">
                <span>⚙ AI API CONFIGURATION</span>
              </h2>
              <span className="admin-badge admin-badge-ai">OPENAI COMPATIBLE</span>
            </div>

            <p className="admin-panel-desc">
              Configure your AI provider endpoint and token. Works with any OpenAI-compatible API: OpenAI, OpenRouter, Groq, DeepSeek, or local Ollama.
              Settings are stored securely in your browser&apos;s local storage.
            </p>

            {/* Quick Provider Presets */}
            <label className="admin-field-label" style={{ marginBottom: "8px", display: "block" }}>
              QUICK PROVIDER PRESETS:
            </label>
            <div className="admin-presets-grid">
              {AI_PRESETS.map((pr) => (
                <button
                  key={pr.name}
                  type="button"
                  className={`admin-preset-chip ${aiConfig.baseUrl === pr.baseUrl ? "is-active" : ""}`}
                  onClick={() => {
                    setAiConfig({
                      ...aiConfig,
                      baseUrl: pr.baseUrl,
                      model: pr.model,
                    });
                  }}
                >
                  {pr.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveAiConfig} className="admin-form-grid">
              <div className="admin-form-row">
                <div className="admin-field-group">
                  <label className="admin-field-label">API Base URL *</label>
                  <input
                    type="url"
                    required
                    className="admin-field-input"
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    OpenAI: https://api.openai.com/v1 · Groq: https://api.groq.com/openai/v1
                  </span>
                </div>

                <div className="admin-field-group">
                  <label className="admin-field-label">Model Name</label>
                  <input
                    type="text"
                    required
                    className="admin-field-input"
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                    placeholder="e.g. gpt-4o-mini or llama-3.3-70b-versatile"
                  />
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Model identifier used for chat completions
                  </span>
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">
                  API Token / Secret Key (Bearer Authentication)
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type={showApiKey ? "text" : "password"}
                    className="admin-field-input"
                    style={{ flex: 1 }}
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-proj-... or gsk_... (leave empty for local Ollama)"
                  />
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Saved locally in your browser. Never shared or sent to any third party other than your specified Base URL.
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={handleTestAiConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? "TESTING..." : "TEST CONNECTION"}
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                >
                  SAVE AI SETTINGS
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: BACKUP & SYNC */}
        {/* ======================================================== */}
        {activeTab === "backup" && (
          <div className="admin-card-panel">
            <div className="admin-panel-header">
              <h2 className="admin-panel-title">
                <span>💾 BACKUP &amp; SYNCHRONIZATION</span>
              </h2>
              <span className="admin-badge">PORTABLE DATA</span>
            </div>

            <p className="admin-panel-desc">
              Backup your sliding card configuration, restore from a file, or reset the directory back to its default state (`learnfreex.ct.ws` and `lotusstudy.in`).
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div style={{ background: "#0c1018", border: "1px solid #ffffff12", borderRadius: "8px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 8px", color: "#ffffff" }}>EXPORT CONFIGURATION</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Download or copy the full JSON array containing all current cards, tags, and theme styling.
                </p>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleExportJson}
                >
                  EXPORT TO CLIPBOARD / FILE
                </button>
              </div>

              <div style={{ background: "#0c1018", border: "1px solid #ffffff12", borderRadius: "8px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 8px", color: "#f87171" }}>RESTORE DEFAULTS</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 16px" }}>
                  Revert all sliding cards to the factory defaults (LearnFreeX, Lotus Study, MDN, GitHub, FreeCodeCamp).
                </p>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={handleResetDefaults}
                >
                  RESET TO DEFAULTS
                </button>
              </div>
            </div>

            {/* Import Box */}
            <form onSubmit={handleImportJson} className="admin-form-grid">
              <div className="admin-field-group">
                <label className="admin-field-label">IMPORT CARDS FROM JSON:</label>
                <textarea
                  rows={6}
                  className="admin-field-textarea"
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='[ { "name": "learnfreex.ct.ws", "title": "LearnFreeX", "url": "https://learnfreex.ct.ws", ... } ]'
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="admin-btn admin-btn-primary">
                  IMPORT JSON TO SLIDING CARDS
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MANUAL ADD / EDIT MODAL */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-container">
            <div className="admin-panel-header">
              <h3 className="admin-panel-title">
                {editingId ? `EDIT CARD // ${formName || "WEBSITE"}` : "ADD NEW WEBSITE CARD"}
              </h3>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setModalOpen(false)}
                style={{ padding: "4px 10px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="admin-form-grid">
              <div className="admin-form-row">
                <div className="admin-field-group">
                  <label className="admin-field-label">Domain Name (e.g. learnfreex.ct.ws) *</label>
                  <input
                    type="text"
                    required
                    className="admin-field-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. learnfreex.ct.ws or lotusstudy.in"
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label">Brand / Display Title</label>
                  <input
                    type="text"
                    className="admin-field-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. LearnFreeX Portal"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-field-group">
                  <label className="admin-field-label">Target URL *</label>
                  <input
                    type="url"
                    required
                    className="admin-field-input"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://learnfreex.ct.ws"
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label">Category Headline Tag</label>
                  <input
                    type="text"
                    className="admin-field-input"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="e.g. FREE COURSES · TECH GUIDES"
                  />
                </div>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Feature Stack Chips (separated by &quot; · &quot;)</label>
                <input
                  type="text"
                  className="admin-field-input"
                  value={formStack}
                  onChange={(e) => setFormStack(e.target.value)}
                  placeholder="e.g. TUTORIALS · NOTES · DEVELOPER GUIDES"
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Description (Max ~200 characters)</label>
                <textarea
                  rows={3}
                  className="admin-field-textarea"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe the website, courses, syllabus, or platform tools..."
                />
              </div>

              {/* Theme & Color Swatches */}
              <div className="admin-field-group">
                <label className="admin-field-label">Theme Mood &amp; Accent Color</label>
                <div className="admin-theme-swatches">
                  {PRESET_THEMES.map((th) => (
                    <button
                      key={th.key}
                      type="button"
                      className={`admin-swatch ${formTheme === th.key ? "is-selected" : ""}`}
                      style={{ backgroundColor: th.hex, color: th.hex }}
                      onClick={() => {
                        setFormTheme(th.key);
                        setFormColor(th.hex);
                      }}
                      title={th.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ width: "34px", height: "30px", padding: 0, cursor: "pointer", background: "none", border: 0 }}
                    title="Custom Color"
                  />
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{formColor.toUpperCase()}</span>
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              <div className="admin-preview-crt" style={{ borderColor: `${formColor}66` }}>
                <div className="admin-preview-crt-top">
                  <span>● 🔒 HTTPS://{formName || "yourwebsite.com"}</span>
                  <span style={{ color: "#22c55e" }}>LIVE PREVIEW</span>
                </div>
                <h4 className="admin-preview-crt-title" style={{ color: "#ffffff" }}>
                  {formTitle || formName || "Website Title"}
                </h4>
                <div style={{ display: "flex", gap: "8px", margin: "2px 0 8px" }}>
                  <span style={{ fontSize: "11px", color: formColor, fontWeight: 700 }}>
                    {formTag || "CATEGORY TAG"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>— {formStack || "STACK"}</span>
                </div>
                <p className="admin-preview-crt-desc">
                  {formDesc || "Website description will appear here on the 3D CRT sliding monitor."}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px", borderTop: "1px solid #ffffff12", paddingTop: "16px" }}>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setModalOpen(false)}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                >
                  {editingId ? "SAVE CHANGES" : "ADD CARD TO SHOWCASE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
