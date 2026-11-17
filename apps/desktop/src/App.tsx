
import { useEffect, useState, type FormEvent } from "react";
import {
  Activity, Brain, Check, ChevronRight, Command,
  FolderKanban, GitBranch, Menu, Mic, MicOff,
  Network, Orbit, Radio, Settings2, Sparkles,
  Terminal, Workflow, PanelRightClose, PanelRightOpen,
  Plus, MessageSquare, Clock, Trash2
} from "lucide-react";

import NeuralSphere, {
  type SphereState
} from "./components/core/NeuralSphere";

import "./App.css";
import "./styles/theme.css";

const API_BASE = "http://127.0.0.1:8000/api";

const navigation = [
  { label: "Overview", icon: Orbit },
  { label: "Projects", icon: FolderKanban },
  { label: "Memory", icon: Brain },
  { label: "Knowledge Graph", icon: Network },
  { label: "Tasks", icon: Check },
  { label: "Automation", icon: Workflow },
];

const sphereStates: SphereState[] = [
  "ambient", "listening", "thinking", "speaking"
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [sphereState, setSphereState] =
    useState<SphereState>("ambient");

  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [aiConnected, setAiConnected] = useState(false);
  const [error, setError] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compact, setCompact] = useState(false);

  const stateLabels: Record<SphereState, string> = {
    ambient: "Standing by",
    listening: "Listening",
    thinking: "Processing",
    speaking: "Responding",
  };

  async function refreshConversations() {
    const response = await fetch(`${API_BASE}/conversations`);

    if (!response.ok) {
      throw new Error("Could not load conversation history.");
    }

    const data: Conversation[] = await response.json();
    setConversations(data);
  }

  async function loadConversation(id: string) {
    if (isLoading) return;

    setError("");
    setIsRestoring(true);

    try {
      const response = await fetch(
        `${API_BASE}/conversations/${encodeURIComponent(id)}`
      );

      if (!response.ok) {
        throw new Error("Could not open this conversation.");
      }

      const data = await response.json();

      setConversationId(data.id);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Conversation loading failed."
      );
    } finally {
      setIsRestoring(false);
    }
  }

  // Restore the latest conversation when JARVIS starts.
  useEffect(() => {
    async function initialize() {
      try {
        const response = await fetch(`${API_BASE}/conversations/latest`);

        if (!response.ok) {
          throw new Error("Could not connect to the JARVIS backend.");
        }

        const data = await response.json();

        setConversationId(data.id);
        setMessages(data.messages ?? []);

        await refreshConversations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Backend connection failed."
        );
      } finally {
        setIsRestoring(false);
      }
    }

    initialize();
  }, []);

  async function createNewConversation() {
    if (isLoading) return;

    setError("");

    try {
      const response = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Could not create a new conversation.");
      }

      const data = await response.json();

      setConversationId(data.conversation_id);
      setMessages([]);
      setCommand("");
      setSphereState("ambient");

      await refreshConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create conversation."
      );
    }
  }

  async function submitCommand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const userMessage = command.trim();

    if (!userMessage || isLoading || !conversationId) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];

    // Show the user's message immediately.
    setMessages(updatedMessages);
    setCommand("");
    setError("");
    setIsLoading(true);
    setSphereState("thinking");

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        let message = "JARVIS backend returned an error.";

        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      const data: {
        response: string;
        conversation_id: string;
      } = await response.json();

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.response },
      ]);

      setAiConnected(true);
      setSphereState("ambient");

      await refreshConversations();
    } catch (err) {
      console.error("JARVIS communication error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to communicate with JARVIS."
      );

      // The user message may already have been saved by the backend.
      // Reload the conversation to avoid displaying an unsaved state.
      try {
        const historyResponse = await fetch(
          `${API_BASE}/conversations/${encodeURIComponent(conversationId)}`
        );

        if (historyResponse.ok) {
          const history = await historyResponse.json();
          setMessages(history.messages ?? []);
        }
      } catch {
        // Keep the visible conversation if history cannot be reloaded.
      }

      setSphereState("ambient");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={`aris-shell ${compact ? "compact-mode" : ""}`}>
      {!sidebarCollapsed && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon"><Orbit size={22} /></div>
            <div>
              <div className="brand-name">JARVIS</div>
              <div className="brand-caption">INTELLIGENCE SYSTEM</div>
            </div>
          </div>

          <div className="nav-heading">WORKSPACE</div>

          <nav className="navigation">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${activePage === label ? "active" : ""}`}
                onClick={() => setActivePage(label)}
              >
                <Icon size={17} />
                <span>{label}</span>
                {activePage === label && <ChevronRight size={15} />}
              </button>
            ))}
          </nav>

          <div
            style={{
              margin: "22px 12px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="nav-heading" style={{ margin: 0 }}>
              CONVERSATIONS
            </span>

            <button
              onClick={createNewConversation}
              disabled={isLoading}
              title="New conversation"
              style={{
                border: "1px solid rgba(0,217,255,0.25)",
                background: "rgba(0,217,255,0.08)",
                color: "#00D9FF",
                borderRadius: "6px",
                padding: "5px",
                cursor: "pointer",
              }}
            >
              <Plus size={15} />
            </button>
          </div>

          <div
            style={{
              overflowY: "auto",
              maxHeight: "220px",
              padding: "0 8px",
            }}
          >
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => loadConversation(conversation.id)}
                disabled={isLoading || isRestoring}
                title={conversation.title}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "10px",
                  marginBottom: "4px",
                  border: "none",
                  borderRadius: "7px",
                  textAlign: "left",
                  cursor: "pointer",
                  color:
                    conversation.id === conversationId
                      ? "#00D9FF"
                      : "#829BAC",
                  background:
                    conversation.id === conversationId
                      ? "rgba(0,217,255,0.10)"
                      : "transparent",
                }}
              >
                <MessageSquare size={14} />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                  }}
                >
                  {conversation.title}
                </span>
              </button>
            ))}

            {conversations.length === 0 && (
              <p style={{ color: "#829BAC", fontSize: "11px", padding: "8px" }}>
                No conversations yet
              </p>
            )}
          </div>

          <div className="sidebar-bottom">
            <div className="connection-card">
              <span className="status-dot" />
              <div>
                <div className="connection-title">Local environment</div>
                <div className="connection-subtitle">Desktop initialized</div>
              </div>
            </div>

            <button className="nav-item">
              <Settings2 size={17} />
              <span>Settings</span>
            </button>
          </div>
        </aside>
      )}

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="toolbar-button"
              title="Toggle sidebar"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={18} />
            </button>

            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span className="status-dot" />
              SYSTEM ONLINE
            </div>

            <button
              className="toolbar-button"
              title="Toggle compact mode"
              onClick={() => setCompact(!compact)}
            >
              {compact
                ? <PanelRightOpen size={17} />
                : <PanelRightClose size={17} />
              }
              <span>{compact ? "Expand" : "Compact"}</span>
            </button>
          </div>
        </header>

        <div className="dashboard">
          <section className="core-section">
            <div className="core-heading">
              <div className="eyebrow">
                <Sparkles size={13} />
                PERSONAL INTELLIGENCE
              </div>

              <h1>
                Your workspace.<br />
                <span>Your intelligence.</span>
              </h1>

              <p>JARVIS is ready when you are.</p>
            </div>

            <div className="sphere-wrapper">
              <div className="sphere-glow" />
              <NeuralSphere state={sphereState} />
            </div>

            <div className="core-status">
              <span
                className={`status-dot ${
                  sphereState !== "ambient" ? "active-dot" : ""
                }`}
              />
              <span>
                {isRestoring ? "Restoring memory..." : stateLabels[sphereState]}
              </span>
            </div>

            <div className="state-controls">
              {sphereStates.map((state) => (
                <button
                  key={state}
                  className={`state-button ${
                    sphereState === state ? "selected" : ""
                  }`}
                  onClick={() => {
                    if (!isLoading) setSphereState(state);
                  }}
                  disabled={isLoading}
                >
                  {state}
                </button>
              ))}
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: "680px",
                maxHeight: "320px",
                overflowY: "auto",
                margin: "20px auto",
                padding: "16px",
                border: "1px solid rgba(0,217,255,0.16)",
                borderRadius: "12px",
                background: "rgba(7,18,31,0.75)",
              }}
              aria-live="polite"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <strong style={{ fontSize: "12px", letterSpacing: "1px" }}>
                  CONVERSATION
                </strong>

                <span style={{ fontSize: "10px", color: "#829BAC" }}>
                  {messages.length} messages · SAVED LOCALLY
                </span>
              </div>

              {messages.length === 0 && (
                <p style={{ color: "#829BAC", fontSize: "13px" }}>
                  {isRestoring
                    ? "Restoring your latest conversation..."
                    : "Start a conversation with JARVIS."}
                </p>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${conversationId}-${index}`}
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    borderRadius: "9px",
                    background:
                      message.role === "user"
                        ? "rgba(56,169,255,0.10)"
                        : "rgba(0,217,255,0.07)",
                    borderLeft:
                      message.role === "user"
                        ? "2px solid #38A9FF"
                        : "2px solid #00D9FF",
                  }}
                >
                  <div
                    style={{
                      color: message.role === "user" ? "#38A9FF" : "#00D9FF",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      marginBottom: "7px",
                    }}
                  >
                    {message.role === "user" ? "YOU" : "JARVIS"}
                  </div>

                  <div
                    style={{
                      color: "#E8F7FC",
                      fontSize: "13px",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ color: "#00D9FF", fontSize: "12px" }}>
                  JARVIS is thinking...
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  maxWidth: "680px",
                  width: "100%",
                  padding: "12px",
                  margin: "10px auto",
                  border: "1px solid rgba(255,100,100,0.35)",
                  borderRadius: "8px",
                  color: "#ff9999",
                  fontSize: "12px",
                }}
              >
                <strong>JARVIS error:</strong> {error}
              </div>
            )}

            <form className="command-bar" onSubmit={submitCommand}>
              <Command size={18} />

              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={
                  isLoading
                    ? "JARVIS is processing..."
                    : "Ask JARVIS anything..."
                }
                aria-label="Enter a message"
                disabled={isLoading || isRestoring || !conversationId}
              />

              <button
                type="submit"
                className="send-button"
                disabled={
                  isLoading || isRestoring || !command.trim() || !conversationId
                }
              >
                {isLoading ? <Activity size={18} /> : <ChevronRight size={19} />}
              </button>
            </form>

            <div className="voice-controls">
              <button
                className="voice-button"
                onClick={() =>
                  setSphereState(
                    sphereState === "listening" ? "ambient" : "listening"
                  )
                }
                disabled={isLoading}
              >
                {sphereState === "listening"
                  ? <MicOff size={15} />
                  : <Mic size={15} />
                }
                {sphereState === "listening"
                  ? "Stop listening"
                  : "Voice interaction"
                }
              </button>

              <span className="voice-note">
                Voice engine not connected yet
              </span>
            </div>
          </section>

          {!compact && (
            <aside className="right-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-eyebrow">SYSTEM OVERVIEW</div>
                  <h2>Environment</h2>
                </div>
                <Activity size={19} />
              </div>

              <div className="info-card">
                <div className="card-label">AI CORE</div>
                <div className="card-main">
                  <span className={`status-dot ${aiConnected ? "" : "warning-dot"}`} />
                  {aiConnected ? "Connected · Qwen 3" : "Local AI configured"}
                </div>
                <div className="card-description">
                  {aiConnected
                    ? "Local Ollama model responding"
                    : "Waiting for first response"}
                </div>
              </div>

              <div className="info-card">
                <div className="card-label">MEMORY ENGINE</div>
                <div className="card-main">
                  <Brain size={16} />
                  SQLite persistence
                </div>
                <div className="card-description">
                  Conversations stored locally
                </div>
              </div>

              <div className="info-card">
                <div className="card-label">DEVELOPMENT WORKSPACE</div>
                <div className="card-main">
                  <GitBranch size={16} />
                  Ready for integration
                </div>
                <div className="card-description">
                  VS Code connection pending
                </div>
              </div>

              <div className="panel-divider" />

              <div className="panel-header activity-heading">
                <h2>Recent activity</h2>
                <Radio size={17} />
              </div>

              <div className="activity-item">
                <span className="activity-marker" />
                <div>
                  <strong>Desktop initialized</strong>
                  <p>Tauri environment running</p>
                </div>
              </div>

              <div className="activity-item">
                <span className="activity-marker" />
                <div>
                  <strong>Local AI connected</strong>
                  <p>FastAPI + Ollama</p>
                </div>
              </div>

              <div className="activity-item">
                <span className="activity-marker" />
                <div>
                  <strong>Persistent memory enabled</strong>
                  <p>SQLite conversation storage</p>
                </div>
              </div>

              <div className="help-card">
                <Activity size={17} />
                <span>Phase 3 · Persistent memory</span>
                <span className="phase-progress">03 / 07</span>
              </div>
            </aside>
          )}
        </div>

        <footer className="bottom-bar">
          <span><span className="status-dot" /> LOCAL DESKTOP</span>
          <span>JARVIS · DEVELOPMENT BUILD 0.3.0</span>
          <span><Terminal size={13} /> READY</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
