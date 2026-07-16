/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as React from "react";
import { Icon, IconName } from "../shared/icons";
import { vscode } from "../shared/vscode";
import { ApprovalActionType, ApprovalMode, ApprovalPolicy, DEFAULT_APPROVAL, EMPTY_FEATURES, FeatureConfig, LlamacppStatus, McpStatus, ModelDef, ModelUsage, OAUTH_LABEL, OAuthStatus, OllamaModel, OllamaStatus, Persona, RuleInfo, SkillInfo } from "./features";
import { HooksPanel, LlamacppPanel, McpPanel, ModelsPanel, OAuthAccountCard, OllamaPanel, PersonasPanel, ProvidersPanel, RulesPanel } from "./FeaturePanels";
import { ModelSelect } from "../shared/ModelSelect";

interface Settings {
  model: string;
  maxResponseLength: number;
  maxContextTokens: number;
  enableWorkspaceContext: boolean;
  enableFileReading: boolean;
  enableTerminalSuggestions: boolean;
  systemPrompt: string;
}

const DEFAULTS: Settings = {
  model: "",
  maxResponseLength: 0,
  maxContextTokens: 240000,
  enableWorkspaceContext: true,
  enableFileReading: true,
  enableTerminalSuggestions: true,
  systemPrompt: "",
};

type Section = "general" | "usage" | "agents" | "providers" | "models" | "llamacpp" | "ollama" | "behavior" | "personas" | "rules" | "mcp" | "hooks" | "indexing" | "advanced" | "about";

interface IndexStatus {
  indexing: boolean;
  done: number;
  total: number;
  files: number;
  chunks: number;
  model: string;
}
interface EmbedModel {
  id: string;
  name: string;
}

// Ordered like Cursor's settings nav: General · Plan & Usage / Agents / Models
// group · plugins-style group (Rules, MCPs, Hooks, Indexing) · misc.
const NAV: { id: Section; label: string; icon: IconName; sep?: boolean }[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "providers", label: "Proveedores", icon: "globe", sep: true },
  { id: "llamacpp", label: "llama.cpp", icon: "database" },
  { id: "ollama", label: "Ollama", icon: "database" },
  { id: "usage", label: "Uso y cuota", icon: "history", sep: true },
  { id: "agents", label: "Agentes", icon: "agent" },
  { id: "models", label: "Modelos", icon: "model" },
  { id: "behavior", label: "Comportamiento", icon: "tools" },
  { id: "personas", label: "Personas", icon: "bot", sep: true },
  { id: "rules", label: "Reglas, habilidades y subagentes", icon: "ruler" },
  { id: "mcp", label: "Herramientas y MCPs", icon: "task" },
  { id: "hooks", label: "Hooks", icon: "infinity" },
  { id: "indexing", label: "Indexación y documentos", icon: "database" },
  { id: "advanced", label: "Avanzado", icon: "fileCode", sep: true },
  { id: "about", label: "Acerca de", icon: "book" },
];

/** Search terms per section so the nav filter finds settings inside pages too. */
const SECTION_KEYWORDS: Partial<Record<Section, string>> = {
  general: "editor settings keyboard shortcuts notifications privacy chat titles auto judge model completion sound reset",
  usage: "tokens quota limits plan usage oauth account rate limit",
  agents: "text size submit ctrl enter max tab count web search fetch context conversation",
  models: "enable disable model catalog reasoning effort thinking context",
  providers: "api key openai anthropic google openrouter oauth custom base url connect",
  behavior: "workspace context file reading terminal tools auto edits approval allow deny ask review policy allowlist denylist commands mcp web",
  personas: "persona system prompt custom",
  rules: "rules skills subagents",
  mcp: "mcp tools servers",
  hooks: "hooks events commands",
  indexing: "codebase index embedding docs semantic sync",
  advanced: "system prompt custom instructions",
  about: "about version license author github repository open source mit mijo code",
};

/** Cursor-style rounded group card wrapping settings rows. */
function Group({ children }: { children: React.ReactNode }) {
  return <div className="settings-group">{children}</div>;
}

function NumInput({
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value == null ? "" : value}
      onChange={(e) => {
        const t = e.target.value.trim();
        onChange(t === "" ? null : Number(t));
      }}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}

function Row({
  title,
  desc,
  stacked,
  children,
}: {
  title: string;
  desc: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"row" + (stacked ? " stacked" : "")}>
      <div className="row-text">
        <div className="row-title">{title}</div>
        <div className="row-desc">{desc}</div>
      </div>
      {stacked ? children : <div className="row-control">{children}</div>}
    </div>
  );
}

// ---- Approval policy editor ----

const APPROVAL_ACTIONS: { type: ApprovalActionType; label: string; desc: string; listHint: string; listsSupported: boolean }[] = [
  { type: "shell", label: "Comandos de terminal", desc: "Comandos de shell que ejecuta el agente.", listHint: "comando o prefijo, p. ej. git status, pnpm *, rm *", listsSupported: true },
  { type: "edits", label: "Ediciones de archivos", desc: "Crear y modificar archivos (Write, StrReplace, notebooks).", listHint: "patrón de ruta, p. ej. src/**, *.md, package.json", listsSupported: true },
  { type: "delete", label: "Eliminaciones de archivos", desc: "Eliminar archivos.", listHint: "patrón de ruta, p. ej. dist/**, *.log", listsSupported: true },
  { type: "mcp", label: "Herramientas MCP", desc: "Herramientas expuestas por servidores MCP conectados.", listHint: "nombre de herramienta o prefijo, p. ej. mcp__github__*", listsSupported: true },
  { type: "web", label: "Acceso web", desc: "Búsqueda web y consultas de URL.", listHint: "url o patrón de consulta, p. ej. https://github.com/*", listsSupported: true },
  { type: "outside", label: "Fuera del espacio de trabajo", desc: "Leer o escribir archivos fuera de la carpeta del espacio de trabajo.", listHint: "patrón de ruta absoluta, p. ej. C:/Users/me/notes/**", listsSupported: true },
];

const APPROVAL_MODES: { id: ApprovalMode; label: string; desc: string }[] = [
  { id: "allow", label: "Permitir", desc: "Ejecutar sin preguntar" },
  { id: "review", label: "Revisión automática", desc: "Preguntar solo cuando parezca arriesgado" },
  { id: "ask", label: "Preguntar", desc: "Preguntar cada vez" },
  { id: "deny", label: "Denegar", desc: "Bloquear siempre" },
];

/** Comma/newline-separated pattern list editor. */
function PatternList({ label, values, hint, onChange }: { label: string; values: string[]; hint: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const items = draft.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).filter((x) => !values.includes(x));
    if (items.length) onChange([...values, ...items]);
    setDraft("");
  };
  return (
    <div className="fc-field">
      <span>{label}</span>
      {values.length > 0 && (
        <div className="pattern-chips">
          {values.map((v) => (
            <span key={v} className="pattern-chip">
              <code>{v}</code>
              <button className="icon-btn" title="Eliminar" onClick={() => onChange(values.filter((x) => x !== v))}>
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="fc-inline-row">
        <input
          type="text"
          value={draft}
          placeholder={hint}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button className="btn-ghost sm" disabled={!draft.trim()} onClick={add}>Añadir</button>
      </div>
    </div>
  );
}

function ApprovalCard({
  action,
  policy,
  onChange,
}: {
  action: (typeof APPROVAL_ACTIONS)[number];
  policy: ApprovalPolicy;
  onChange: (p: ApprovalPolicy) => void;
}) {
  const r = policy[action.type] ?? DEFAULT_APPROVAL[action.type];
  const [open, setOpen] = React.useState(false);
  const patch = (p: Partial<typeof r>) => onChange({ ...policy, [action.type]: { ...r, ...p } });
  const hasLists = (r.allowlist?.length ?? 0) + (r.denylist?.length ?? 0) > 0;
  return (
    <div className="feature-card">
      <div className="fc-head" style={{ cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <div className="fc-title-input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name={open ? "chevD" : "chevR"} size={14} />
          <span>{action.label}</span>
          {hasLists && <span className="badge-tag glob">{(r.allowlist?.length ?? 0) + (r.denylist?.length ?? 0)} reglas</span>}
        </div>
        <select
          value={r.mode}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => patch({ mode: e.target.value as ApprovalMode })}
          className={"approval-mode " + r.mode}
        >
          {APPROVAL_MODES.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
      {open && (
        <div className="fc-body">
          <p className="panel-hint" style={{ margin: 0 }}>
            {action.desc} Actualmente: <strong>{APPROVAL_MODES.find((m) => m.id === r.mode)?.desc}</strong>.
            La lista de denegación bloquea siempre; la lista de permisos ejecuta siempre — ambas anulan el modo.
          </p>
          {action.listsSupported && (
            <>
              <PatternList label="Lista de permisos (ejecutar siempre)" values={r.allowlist ?? []} hint={action.listHint} onChange={(v) => patch({ allowlist: v })} />
              <PatternList label="Lista de denegación (bloquear siempre)" values={r.denylist ?? []} hint={action.listHint} onChange={(v) => patch({ denylist: v })} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function fmtTokens(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}

function UsagePanel({
  usage,
  oauthStatus,
  features,
  setFeatures,
}: {
  usage: Record<string, ModelUsage>;
  oauthStatus: OAuthStatus;
  features: FeatureConfig;
  setFeatures: (p: Partial<FeatureConfig>) => void;
}) {
  const rows = Object.entries(usage).sort((a, b) => b[1].lastUsed - a[1].lastUsed);
  const totals = rows.reduce(
    (t, [, u]) => ({ p: t.p + u.promptTokens, c: t.c + u.completionTokens, r: t.r + u.requests }),
    { p: 0, c: 0, r: 0 }
  );
  const max = Math.max(1, ...rows.map(([, u]) => u.promptTokens + u.completionTokens));
  return (
    <>
      <h1 className="page-title">Uso y cuota</h1>

      <div className="section-label">Uso de tokens</div>
      <div className="index-card">
        <div className="index-card-title">Total</div>
        <p className="row-desc">
          {fmtTokens(totals.p)} de entrada · {fmtTokens(totals.c)} de salida en {totals.r} solicitud{totals.r === 1 ? "" : "es"}. Registrado localmente en esta máquina.
        </p>
        {rows.length === 0 ? (
          <div className="empty-card" style={{ marginTop: 12 }}>Aún no hay uso registrado. Empieza a chatear para ver el uso de tokens por modelo.</div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {rows.map(([model, u]) => {
              const total = u.promptTokens + u.completionTokens;
              return (
                <div key={model} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
                    <span style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model}</span>
                    <span className="row-desc" style={{ flex: "0 0 auto" }}>
                      {fmtTokens(u.promptTokens)} ent · {fmtTokens(u.completionTokens)} sal · {u.requests} req
                    </span>
                  </div>
                  <div className="index-bar"><div className="index-bar-fill" style={{ width: `${Math.max(2, Math.round((total / max) * 100))}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}
        <div className="index-actions">
          <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "getUsage" })}>
            <Icon name="reset" /> Actualizar
          </button>
          <button
            className="btn-secondary danger"
            disabled={rows.length === 0}
            onClick={() => { if (confirm("¿Restablecer todo el uso de tokens registrado?")) vscode.postMessage({ type: "resetUsage" }); }}
          >
            <Icon name="trash" /> Restablecer uso
          </button>
        </div>
      </div>

      <Group>
        <Row title="Registrar uso" desc="Registra el uso de tokens por modelo localmente. Ningún dato sale de tu máquina.">
          <Toggle checked={features.trackUsage !== false} onChange={(v) => setFeatures({ trackUsage: v })} />
        </Row>
      </Group>

      <div className="section-label">Cuenta de quota</div>
      <p className="panel-hint">Ventanas de límite de velocidad para tus cuentas OAuth conectadas ({oauthStatus.accounts.map((a) => OAUTH_LABEL[a.kind]).join(", ") || "ninguna conectada"}).</p>
      {oauthStatus.accounts.length === 0 ? (
        <div className="empty-card">
          No hay cuentas OAuth conectadas. Añade una en la pestaña <strong>Proveedores → Cuentas OAuth</strong> para ver su cuota aquí.
        </div>
      ) : (
        oauthStatus.accounts.map((a) => <OAuthAccountCard key={a.id} account={a} defaultOpen />)
      )}
    </>
  );
}

interface DocSourceInfo {
  id: string;
  name: string;
  url: string;
  pages?: number;
  chunks?: number;
  indexedAt?: number;
  maxPages?: number;
  error?: string;
}
interface DocsStatus {
  indexing?: string;
  done: number;
  total: number;
  error?: string;
}

function DocRow({ d, status }: { d: DocSourceInfo; status: DocsStatus }) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(d.name);
  const [url, setUrl] = React.useState(d.url);
  const [maxPages, setMaxPages] = React.useState(String(d.maxPages || 200));
  const [showLogs, setShowLogs] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);
  const busy = status.indexing === d.id;

  // Pull this doc's crawl log while the panel is open (poll during indexing).
  React.useEffect(() => {
    if (!showLogs) return;
    const fetchLogs = () => vscode.postMessage({ type: "getDocLogs", id: d.id });
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "docLogs" && e.data.id === d.id) setLogs(e.data.lines || []);
    };
    window.addEventListener("message", handler);
    fetchLogs();
    const t = busy ? window.setInterval(fetchLogs, 1000) : undefined;
    return () => {
      window.removeEventListener("message", handler);
      if (t) window.clearInterval(t);
    };
  }, [showLogs, busy, d.id]);
  const save = () => {
    if (!name.trim() || !/^https?:\/\//.test(url.trim())) return;
    vscode.postMessage({ type: "editDoc", id: d.id, name: name.trim(), url: url.trim(), maxPages: parseInt(maxPages, 10) || 200 });
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="doc-row editing">
        <div className="doc-add-row" style={{ flex: 1, margin: 0 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => e.key === "Enter" && save()} />
          <input type="number" min={1} style={{ width: 80 }} title="Máx. páginas" value={maxPages} onChange={(e) => setMaxPages(e.target.value)} />
          <button className="btn-secondary" onClick={save}><Icon name="check" /></button>
          <button className="btn-secondary" onClick={() => { setEditing(false); setName(d.name); setUrl(d.url); setMaxPages(String(d.maxPages || 200)); }}><Icon name="close" /></button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="doc-row">
        <span className={"doc-dot" + (d.error ? " error" : busy ? " busy" : d.indexedAt ? " ok" : "")} />
        <div className="doc-info">
          <div className="doc-name">{d.name}</div>
          <div className={"doc-sub" + (d.error ? " error" : "")}>
            {busy
              ? `Indexando ${status.done}/${status.total} páginas…`
              : d.error
              ? `Error: ${d.error}`
              : d.indexedAt
              ? `Indexado ${new Date(d.indexedAt).toLocaleDateString()}, ${new Date(d.indexedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${d.pages ?? 0} páginas`
              : "Sin indexar"}
          </div>
        </div>
        <div className="doc-actions">
          <button className={"icon-btn" + (showLogs ? " active" : "")} title="Registros" onClick={() => setShowLogs((v) => !v)}><Icon name="terminal" /></button>
          <button className="icon-btn" title="Editar" disabled={busy} onClick={() => setEditing(true)}><Icon name="edit" /></button>
          <button className="icon-btn" title="Reindexar" disabled={!!status.indexing} onClick={() => vscode.postMessage({ type: "reindexDoc", id: d.id })}><Icon name="reset" /></button>
          <button className="icon-btn" title="Abrir sitio de documentación" onClick={() => vscode.postMessage({ type: "openExternal", url: d.url })}><Icon name="book" /></button>
          <button className="icon-btn" title="Eliminar" disabled={busy} onClick={() => vscode.postMessage({ type: "removeDoc", id: d.id })}><Icon name="trash" /></button>
        </div>
      </div>
      {showLogs && (
        <div className="doc-logs">
          {logs.length === 0 ? (
            <div className="doc-logs-empty">Aún no hay registros — aparecen durante la indexación (se conservan hasta la siguiente reindexación).</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={"doc-log-line" + (/ (SKIP|FAIL|FAILED)/.test(l) ? " err" : "")}>{l}</div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function DocsSection({ docs, status }: { docs: DocSourceInfo[]; status: DocsStatus }) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [maxPages, setMaxPages] = React.useState("200");
  const canAdd = name.trim() && /^https?:\/\//.test(url.trim()) && !status.indexing;
  const add = () => {
    if (!canAdd) return;
    vscode.postMessage({ type: "addDoc", name: name.trim(), url: url.trim(), maxPages: parseInt(maxPages, 10) || 200 });
    setName("");
    setUrl("");
    setMaxPages("200");
    setAdding(false);
  };
  return (
    <>
      <div className="docs-head">
        <div>
          <div className="section-label" style={{ marginBottom: 2 }}>Documentación</div>
          <div className="row-desc" style={{ margin: 0 }}>Rastrear e indexar recursos personalizados y documentación de desarrolladores</div>
        </div>
        <button className="btn-secondary" onClick={() => setAdding((a) => !a)}>
          <Icon name="plus" /> Añadir documentación
        </button>
      </div>
      <div className="index-card docs-card">
        {adding && (
          <div className="doc-add-row">
            <input autoFocus placeholder="Nombre (p. ej. React)" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="https://react.dev/reference" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <input type="number" min={1} style={{ width: 80 }} title="Máx. páginas a rastrear" value={maxPages} onChange={(e) => setMaxPages(e.target.value)} />
            <button className="btn-secondary" disabled={!canAdd} onClick={add}><Icon name="plus" /> Añadir</button>
          </div>
        )}
        {docs.length === 0 && !adding ? (
          <p className="row-desc" style={{ padding: "10px 4px", margin: 0 }}>Aún no hay documentación añadida. Haz clic en "Añadir documentación" para rastrear e indexar documentación desde una URL.</p>
        ) : (
          docs.map((d) => <DocRow key={d.id} d={d} status={status} />)
        )}
      </div>
    </>
  );
}

/** Provider models usable for embeddings (id mentions embed/embedding). */
const isEmbeddingModel = (id: string) => /embed/i.test(id);

function IndexingPanel({
  status,
  models,
  modelList,
  docs,
  docsStatus,
  features,
  setFeatures,
}: {
  status: IndexStatus;
  models: EmbedModel[];
  modelList: ModelDef[];
  docs: DocSourceInfo[];
  docsStatus: DocsStatus;
  features: FeatureConfig;
  setFeatures: (p: Partial<FeatureConfig>) => void;
}) {
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : status.files > 0 ? 100 : 0;
  const remoteEmbed = modelList.filter((m) => isEmbeddingModel(m.id));
  return (
    <>
      <h1 className="page-title">Indexación y documentos</h1>
      <div className="section-label">Código base</div>
      <div className="index-card">
        <div className="index-card-title">Indexación del código base</div>
        <p className="row-desc">
          Generar embeddings del código base para una mejor comprensión contextual y conocimiento. Los embeddings y metadatos se
          almacenan localmente en tu máquina — tu código nunca sale de tu computadora.
        </p>
        <div className="index-progress">
          <div className="index-progress-pct">{pct}%</div>
          <div className="index-bar">
            <div className="index-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="index-progress-meta">
            {status.indexing ? `Indexando ${status.done} / ${status.total} archivos…` : `${status.files} archivos`}
          </div>
        </div>
        <div className="index-divider" />
        <div className="index-model-row">
          <span className="index-model-label">Modelo de embeddings</span>
          <ModelSelect
            models={remoteEmbed}
            value={status.model}
            onChange={(id) => !status.indexing && vscode.postMessage({ type: "setEmbedModel", modelId: id })}
            customItems={models.map((m) => ({ value: m.id, label: m.name, desc: "local — se ejecuta en tu máquina" }))}
            style={{ maxWidth: 260 }}
          />
          <div className="index-actions" style={{ marginTop: 0, marginLeft: "auto" }}>
            <button className="btn-secondary" disabled={status.indexing} onClick={() => vscode.postMessage({ type: "syncIndex" })}>
              <Icon name="reset" /> {status.indexing ? "Sincronizando…" : "Sincronizar"}
            </button>
            <button className="btn-secondary danger" disabled={status.indexing} onClick={() => vscode.postMessage({ type: "deleteIndex" })}>
              <Icon name="trash" /> Eliminar índice
            </button>
          </div>
        </div>
      </div>
      <div className="index-card rows-card">
        <Row title="Indexar carpetas nuevas" desc="Indexar automáticamente cualquier carpeta nueva añadida al workspace">
          <Toggle checked={features.indexNewFolders !== false} onChange={(v) => setFeatures({ indexNewFolders: v })} />
        </Row>
        <Row title="Ignorar archivos en .cursorignore" desc="Archivos a excluir de la indexación además de .gitignore">
          <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "mijoCodeIgnore" })}>Editar</button>
        </Row>
        <Row title="Indexar repositorios para Grep instantáneo" desc="Indexar automáticamente repositorios para acelerar las búsquedas con Grep. Todos los datos se almacenan localmente.">
          <Toggle checked={features.indexForGrep !== false} onChange={(v) => setFeatures({ indexForGrep: v })} />
        </Row>
      </div>
      <DocsSection docs={docs} status={docsStatus} />
    </>
  );
}

export function App() {
  const [section, setSection] = React.useState<Section>("general");
  const [s, setS] = React.useState<Settings>(DEFAULTS);
  const [apiKey, setApiKey] = React.useState("");
  const [models, setModels] = React.useState<string[]>([]);
  const [modelList, setModelList] = React.useState<ModelDef[]>([]);
  const [features, setFeaturesState] = React.useState<FeatureConfig>(EMPTY_FEATURES);
  const [mcpStatus, setMcpStatus] = React.useState<McpStatus[]>([]);
  const [rules, setRules] = React.useState<RuleInfo[]>([]);
  const [skills, setSkills] = React.useState<SkillInfo[]>([]);
  const [builtinPersonas, setBuiltinPersonas] = React.useState<Persona[]>([]);
  const [modelCatalog, setModelCatalog] = React.useState<ModelDef[]>([]);
  const [indexStatus, setIndexStatus] = React.useState<IndexStatus>({ indexing: false, done: 0, total: 0, files: 0, chunks: 0, model: "minilm" });
  const [embedModels, setEmbedModels] = React.useState<EmbedModel[]>([]);
  const [docSources, setDocSources] = React.useState<DocSourceInfo[]>([]);
  const [docsStatus, setDocsStatus] = React.useState<DocsStatus>({ done: 0, total: 0 });
  const [llamacppStatus, setLlamacppStatus] = React.useState<LlamacppStatus>({ installed: false, running: {}, loading: {}, errors: {}, logs: {} });
  const [ollamaStatus, setOllamaStatus] = React.useState<OllamaStatus>({ installed: false, pulling: {}, errors: {} });
  const [ollamaModels, setOllamaModels] = React.useState<OllamaModel[]>([]);
  const [oauthStatus, setOauthStatus] = React.useState<OAuthStatus>({ accounts: [], errors: {} });
  const [usage, setUsage] = React.useState<Record<string, ModelUsage>>({});
  const [navQuery, setNavQuery] = React.useState("");

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  // Patch + persist features immediately.
  const setFeatures = (patch: Partial<FeatureConfig>) => {
    setFeaturesState((prev) => {
      const next = { ...prev, ...patch };
      vscode.postMessage({ type: "saveFeatures", features: next });
      return next;
    });
  };

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === "loadSettings") {
        setS({ ...DEFAULTS, ...msg.settings });
      } else if (msg.type === "navigate") {
        if (msg.section) setSection(msg.section as Section);
      } else if (msg.type === "modelsFetched") {
        setModels(msg.models || []);
        if (msg.modelList) setModelList(msg.modelList);
      } else if (msg.type === "features") {
        setFeaturesState({ ...EMPTY_FEATURES, ...msg.features });
        setMcpStatus(msg.mcpStatus || []);
        setRules(msg.rules || []);
        setSkills(msg.skills || []);
        setBuiltinPersonas(msg.builtinPersonas || []);
        setModelCatalog(msg.modelCatalog || []);
      } else if (msg.type === "indexStatus") {
        setIndexStatus(msg.status);
        if (msg.models) setEmbedModels(msg.models);
      } else if (msg.type === "docSources") {
        setDocSources(msg.docs || []);
        if (msg.status) setDocsStatus(msg.status);
      } else if (msg.type === "docsStatus") {
        setDocsStatus(msg.status);
        // Refresh doc list when an indexing run finishes.
        if (!msg.status?.indexing) vscode.postMessage({ type: "getIndexStatus" });
      } else if (msg.type === "llamacppStatus") {
        setLlamacppStatus(msg.status);
      } else if (msg.type === "ollamaStatus") {
        setOllamaStatus(msg.status);
      } else if (msg.type === "ollamaModels") {
        setOllamaModels(msg.models || []);
      } else if (msg.type === "oauthStatus") {
        setOauthStatus(msg.status);
      } else if (msg.type === "usageData") {
        setUsage(msg.usage || {});
      }
    };
    window.addEventListener("message", handler);
    vscode.postMessage({ type: "getSettings" });
    vscode.postMessage({ type: "getFeatures" });
    vscode.postMessage({ type: "getIndexStatus" });
    vscode.postMessage({ type: "getUsage" });
    vscode.postMessage({ type: "oauthGet" });
    return () => window.removeEventListener("message", handler);
  }, []);

  // Refresh usage numbers whenever the Usage & Quota page is opened.
  React.useEffect(() => {
    if (section === "usage") vscode.postMessage({ type: "getUsage" });
  }, [section]);

  // Fetch models across every enabled provider (grouped). Disabled providers are skipped.
  const fetchModels = () => vscode.postMessage({ type: "fetchAllModels" });

  const save = () => {
    const payload: any = { type: "saveSettings", settings: s };
    if (apiKey) payload.apiKey = apiKey;
    vscode.postMessage(payload);
  };

  const navFiltered = navQuery.trim()
    ? NAV.filter((n) => {
        const q = navQuery.trim().toLowerCase();
        return n.label.toLowerCase().includes(q) || (SECTION_KEYWORDS[n.id] || "").includes(q);
      })
    : NAV;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-badge" src={document.getElementById("root")?.dataset.icon} alt="" />
          <span>
            <span className="brand-name">Mijo Code</span>
            <span className="brand-sub">Local · Código abierto</span>
          </span>
        </div>
        <input
          className="nav-search"
          type="search"
          placeholder="Buscar configuración"
          value={navQuery}
          onChange={(e) => setNavQuery(e.target.value)}
        />
        {navFiltered.map((n) => (
          <React.Fragment key={n.id}>
            {n.sep && !navQuery && <div className="nav-sep" />}
            <button className={"nav-item" + (section === n.id ? " active" : "")} onClick={() => setSection(n.id)}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </button>
            {n.id === "general" && !navQuery && (
              <button className="nav-item" onClick={() => vscode.postMessage({ type: "openVsCodeSettings" })}>
                <Icon name="code" />
                <span>Configuración de VS Code ↗</span>
              </button>
            )}
          </React.Fragment>
        ))}
      </aside>

      <main className="content">
        <div className="content-inner">
          {section === "general" && (
            <>
              <h1 className="page-title">General</h1>

              <Group>
                <Row title="Proveedores y claves API" desc="Gestionar los proveedores de IA, claves API y cuentas OAuth con los que habla esta extensión.">
                  <button className="btn-secondary" onClick={() => setSection("providers")}>Abrir</button>
                </Row>
              </Group>

              <div className="section-label">Preferencias</div>
              <Group>
                <Row title="Configuración del editor" desc="Configurar fuente, formato, minimapa y más.">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openEditorSettings" })}>Abrir ↗</button>
                </Row>
                <Row title="Atajos de teclado" desc="Configurar atajos de teclado.">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openKeyboardShortcuts" })}>Abrir ↗</button>
                </Row>
                <Row title="Configuración de VS Code" desc="Abrir la interfaz nativa de configuración de VS Code.">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openVsCodeSettings" })}>Abrir ↗</button>
                </Row>
                <Row title="Idioma" desc="Idioma de la interfaz (requiere recargar).">
                  <select
                    value={features.language || "en"}
                    onChange={(e) => {
                      const lang = e.target.value;
                      vscode.postMessage({ type: "saveLanguage", language: lang });
                      setFeatures({ language: lang as "en" | "es" });
                    }}
                    style={{ maxWidth: 140 }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </Row>
              </Group>

              <div className="section-label">Chat</div>
              <Group>
                <Row title="Generar títulos de chat automáticamente" desc="Generar un título corto con IA para nuevas conversaciones después del primer mensaje.">
                  <Toggle checked={features.autoGenerateTitles !== false} onChange={(v) => setFeatures({ autoGenerateTitles: v })} />
                </Row>
                {/* Auto model (judge routing) hidden for now — bring back later.
                <Row title="Auto Judge Model" desc="When the chat model is set to Auto, this judge model picks the best enabled model for each task.">
                  <ModelSelect
                    models={modelList.length ? modelList : [...modelCatalog, ...(features.customModels || [])].filter((m) => features.enabledModels.includes(m.id))}
                    value={features.autoJudgeModel}
                    onChange={(id) => setFeatures({ autoJudgeModel: id })}
                    customItems={[{ value: "", label: "First enabled model", desc: "use the first model in the picker" }]}
                    style={{ maxWidth: 240 }}
                  />
                </Row>
                */}
              </Group>

              <div className="section-label">Notificaciones</div>
              <Group>
                <Row title="Notificaciones del sistema" desc="Mostrar una notificación cuando el agente termine de responder mientras la ventana no está enfocada.">
                  <Toggle checked={features.notifyOnComplete !== false} onChange={(v) => setFeatures({ notifyOnComplete: v })} />
                </Row>
                <Row title="Sonido de finalización" desc="Reproducir un sonido cuando el agente termine de responder.">
                  <Toggle checked={features.completionSound === true} onChange={(v) => setFeatures({ completionSound: v })} />
                </Row>
              </Group>

              <div className="section-label">Privacidad</div>
              <p className="panel-hint">
                Mijo Code es completamente local y de código abierto. No hay backend de Mijo Code: tu código,
                claves y conversaciones permanecen en tu máquina y solo se envían a los proveedores de IA
                que tú configures.
              </p>
              <Group>
                <Row title="Local primero" desc="Las conversaciones, configuración y contexto del workspace se almacenan en este dispositivo (almacenamiento global de VS Code).">
                  <span className="badge-tag always">Siempre activo</span>
                </Row>
                <Row title="Almacenamiento seguro de claves" desc="Las claves API y tokens OAuth se guardan en el almacén de secretos del sistema (VS Code SecretStorage), nunca en archivos de configuración en texto plano ni sincronizados.">
                  <span className="badge-tag always">Encriptado</span>
                </Row>
                <Row title="Sin telemetría" desc="Mijo Code no recopila análisis, métricas de uso ni informes de errores. Las únicas solicitudes salientes son las llamadas a IA que disparas a tus proveedores configurados.">
                  <span className="badge-tag always">Ninguna</span>
                </Row>
                <Row title="Tú eliges el destino" desc="Cada solicitud va al proveedor exacto que configuraste — una API alojada, tu propio endpoint compatible con OpenAI/Anthropic, o un modelo completamente offline mediante llama.cpp / Ollama.">
                  <span className="badge-tag">Tus proveedores</span>
                </Row>
                <Row title="Código abierto" desc="El código completo es público y con licencia MIT, así que cualquiera puede auditar exactamente qué hace la extensión con tus datos.">
                  <span className="badge-tag glob">MIT</span>
                </Row>
              </Group>
            </>
          )}

          {section === "agents" && (
            <>
              <h1 className="page-title">Agentes</h1>

              <Group>
                <Row title="Tamaño del texto" desc="Ajustar el tamaño del texto de la conversación.">
                  <select
                    value={features.chatTextSize || "default"}
                    onChange={(e) => setFeatures({ chatTextSize: e.target.value as FeatureConfig["chatTextSize"] })}
                  >
                    <option value="compact">Compacto</option>
                    <option value="default">Predeterminado</option>
                    <option value="large">Grande</option>
                  </select>
                </Row>
                <Row title="Enviar con Ctrl + Enter" desc="Cuando está activado, Ctrl + Enter envía el chat y Enter inserta una nueva línea.">
                  <Toggle checked={features.submitWithCtrlEnter === true} onChange={(v) => setFeatures({ submitWithCtrlEnter: v })} />
                </Row>
                <Row title="Máx. número de pestañas" desc="Limitar cuántas pestañas de chat pueden estar abiertas a la vez (0 = ilimitado).">
                  <NumInput value={features.maxTabCount || null} step="1" min="0" placeholder="unlimited" onChange={(v) => setFeatures({ maxTabCount: v ?? 0 })} />
                </Row>
              </Group>

              <div className="section-label">Límites de ejecución</div>
              <Group>
                <Row title="Máx. pasos del agente" desc="Pausar el agente después de esta cantidad de pasos en una ejecución (0 = 50 por defecto).">
                  <NumInput value={features.maxAgentSteps || null} step="1" min="0" placeholder="50" onChange={(v) => setFeatures({ maxAgentSteps: v ?? 0 })} />
                </Row>
                <Row title="Continuar automáticamente" desc="Continuar automáticamente cuando se alcance el límite de pasos en lugar de pausar.">
                  <Toggle checked={features.autoContinue === true} onChange={(v) => setFeatures({ autoContinue: v })} />
                </Row>
              </Group>

              <div className="section-label">Subagentes</div>
              <Group>
                <Row title="Modelo de subagente" desc="Modelo predeterminado para subagentes lanzados mediante la herramienta Task.">
                  <ModelSelect
                    models={modelList}
                    value={features.subagentModel}
                    onChange={(id) => setFeatures({ subagentModel: id })}
                    customItems={[{ value: "", label: "Heredar modelo del chat", desc: "usar el mismo que el chat" }]}
                    style={{ maxWidth: 240 }}
                  />
                </Row>
              </Group>

              <div className="section-label">Contexto</div>
              <Group>
                <Row title="Herramienta de búsqueda web" desc="Permitir que el agente busque información relevante en la web.">
                  <Toggle checked={features.webSearchEnabled !== false} onChange={(v) => setFeatures({ webSearchEnabled: v })} />
                </Row>
                <Row title="Herramienta de consulta web" desc="Permitir que el agente obtenga contenido de URLs.">
                  <Toggle checked={features.webFetchEnabled !== false} onChange={(v) => setFeatures({ webFetchEnabled: v })} />
                </Row>
              </Group>

              <div className="section-label">Aprobaciones y ejecución</div>
              <p className="panel-hint">
                Las capacidades de herramientas y los controles de aprobación están en la pestaña <button className="link-btn" onClick={() => setSection("behavior")}>Comportamiento</button>.
              </p>
            </>
          )}

          {section === "usage" && (
            <UsagePanel usage={usage} oauthStatus={oauthStatus} features={features} setFeatures={setFeatures} />
          )}

          {section === "providers" && <ProvidersPanel features={features} setFeatures={setFeatures} oauthStatus={oauthStatus} />}

          {section === "models" && (
            <ModelsPanel
              models={models}
              modelList={modelList}
              features={features}
              setFeatures={setFeatures}
              fetchModels={fetchModels}
              catalog={modelCatalog}
              llamacppStatus={llamacppStatus}
              ollamaModels={ollamaModels}
              oauthStatus={oauthStatus}
            />
          )}

          {section === "llamacpp" && <LlamacppPanel features={features} status={llamacppStatus} />}

          {section === "ollama" && <OllamaPanel status={ollamaStatus} models={ollamaModels} />}

          {section === "personas" && <PersonasPanel features={features} setFeatures={setFeatures} builtinPersonas={builtinPersonas} />}

          {section === "rules" && <RulesPanel features={features} setFeatures={setFeatures} rules={rules} skills={skills} models={models} modelList={modelList} />}

          {section === "mcp" && (
            <McpPanel
              features={features}
              setFeatures={setFeatures}
              status={mcpStatus}
              onSync={() => vscode.postMessage({ type: "syncMcp" })}
            />
          )}

          {section === "hooks" && <HooksPanel features={features} setFeatures={setFeatures} />}

          {section === "behavior" && (
            <>
              <h1 className="page-title">Comportamiento</h1>
              <div className="section-label">Capacidades</div>
              <Group>
                <Row title="Contexto del workspace" desc="Incluir información del workspace en el contexto del agente.">
                  <Toggle checked={s.enableWorkspaceContext} onChange={(v) => set("enableWorkspaceContext", v)} />
                </Row>
                <Row title="Herramientas de lectura de archivos" desc="Permitir leer, buscar y listar archivos.">
                  <Toggle checked={s.enableFileReading} onChange={(v) => set("enableFileReading", v)} />
                </Row>
                <Row title="Herramientas de terminal" desc="Permitir ejecutar comandos de terminal.">
                  <Toggle checked={s.enableTerminalSuggestions} onChange={(v) => set("enableTerminalSuggestions", v)} />
                </Row>
                <Row title="Máx. tokens de contexto" desc="Límite máximo de tokens de contexto enviados en una solicitud (evita errores de límite del proveedor).">
                  <input
                    type="number"
                    min={1024}
                    step={1024}
                    style={{ width: 120 }}
                    value={s.maxContextTokens}
                    onChange={(e) => set("maxContextTokens", Math.max(1024, parseInt(e.target.value, 10) || 0))}
                  />
                </Row>
              </Group>

              <div className="section-label">Aprobaciones y ejecución</div>
              <p className="panel-hint">
                Política de aprobación por acción. <strong>Permitir</strong> ejecuta en silencio, <strong>Revisión automática</strong> solo pregunta
                por acciones de aspecto arriesgado (comandos destructivos, secretos, eliminaciones), <strong>Preguntar</strong> pregunta cada
                vez, <strong>Denegar</strong> bloquea siempre. Las listas de permisos/denegación anulan el modo por comando o patrón de archivo.
              </p>
              {APPROVAL_ACTIONS.map((a) => (
                <ApprovalCard
                  key={a.type}
                  action={a}
                  policy={{ ...DEFAULT_APPROVAL, ...(features.approvalPolicy ?? {}) }}
                  onChange={(p) => setFeatures({ approvalPolicy: p })}
                />
              ))}
              <div className="panel-actions">
                <button
                  className="btn-ghost sm"
                  onClick={() => setFeatures({ approvalPolicy: DEFAULT_APPROVAL })}
                >
                  <Icon name="reset" size={13} /> Restablecer política a valores predeterminados
                </button>
              </div>
            </>
          )}

          {section === "indexing" && (
            <IndexingPanel status={indexStatus} models={embedModels} modelList={modelList} docs={docSources} docsStatus={docsStatus} features={features} setFeatures={setFeatures} />
          )}

          {section === "advanced" && (
            <>
              <h1 className="page-title">Avanzado</h1>
              <div className="section-label">Instrucciones personalizadas</div>
              <Row title="System prompt" desc="Se antepone al system prompt del agente en cada solicitud." stacked>
                <textarea rows={6} value={s.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
              </Row>
            </>
          )}

          {section === "about" && (
            <>
              <h1 className="page-title">Acerca de</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "6px 0 18px" }}>
                <img src={document.getElementById("root")?.dataset.icon} alt="" style={{ width: 48, height: 48, borderRadius: 10 }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Mijo Code</div>
                  <div className="row-desc" style={{ margin: 0 }}>Chat con agente de codificación con IA dentro de VS Code — local y de código abierto.</div>
                </div>
              </div>
              <Group>
                <Row title="Autor" desc="Creado por Mijo Code.">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openExternal", url: "https://mijocode.com" })}>GitHub ↗</button>
                </Row>
                <Row title="Repositorio" desc="Código fuente, problemas y contribuciones.">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openExternal", url: "https://github.com/mijocode/mijo-code" })}>Abrir ↗</button>
                </Row>
                <Row title="Reportar un problema" desc="¿Encontraste un error o tienes una solicitud de función?">
                  <button className="btn-secondary" onClick={() => vscode.postMessage({ type: "openExternal", url: "https://github.com/mijocode/mijo-code/issues" })}>Problemas ↗</button>
                </Row>
                <Row title="Licencia" desc="Gratuito y de código abierto bajo la licencia MIT.">
                  <span className="badge-tag glob">MIT</span>
                </Row>
              </Group>
              <p className="panel-hint">Copyright © 2026 Mijo Code. Licenciado bajo la licencia MIT.</p>
            </>
          )}

        </div>
      </main>

      <button className="btn-save" onClick={save}>
        Guardar
      </button>
    </div>
  );
}

