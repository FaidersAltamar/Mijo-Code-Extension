# Change Log

All notable changes to the "ocursor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.7] - 2026-07-14

### Changed

- Translated remaining user-facing English strings in VS Code commands, settings descriptions, notifications, dialogs, and extension host messages to Spanish.
- Left AI-facing system prompts and tool outputs in English for best model performance.

## [0.0.6] - 2026-07-14

### Fixed

- Skip empty assistant history steps (no content and no tool calls) before sending requests to OpenAI-compatible providers, preventing "the message ... with role 'assistant' must not be empty" errors.
- Do not record empty assistant turns in the agent loop when the model returns no text and no calls.

## [0.0.5] - 2026-07-14

### Fixed

- OpenAI-compatible providers no longer error with "tool_call_ids did not have response messages" when a run is cancelled or errors between a tool call announcement and its result; missing tool responses are backfilled with a synthetic error message.

## [0.0.4] - 2026-07-13

### Added

- `onStartupFinished` activation so the extension loads automatically with the editor
- Robust error logging during activation (Output → Mijo Code)

### Changed

- Chat moved from sidebar to an editor panel (`ViewColumn.Two`) for more screen space
- Added status-bar button `$(comment-discussion) Mijo Code` to open chat
- `Ctrl+Alt+M` / `Cmd+Alt+M` keybinding to open Mijo Code Chat

### Fixed

- Activation failures now surface visible error messages and detailed logs

## [0.0.2] - 2026-07-05

### Added

- Per-workspace conversations (existing global conversations migrate automatically)
- GGUF models auto-load on first message with a "loading model" card in chat
- llama.cpp server uses random free ports with retry on bind failure

### Changed

- Composer dropdowns (model picker, mode menu) now position themselves within the viewport and work in edit mode
- All composers share one selected model and mode
- Auto model selection hidden for now; first enabled model is the default

### Fixed

- Production error: `Cannot find package '@huggingface/hub'` (runtime deps now resolved via file URLs)

### Removed

- MCP tool marketplace

## [0.0.1] - 2026-07-05

### Added

- Initial release
- Agent chat sidebar with multi-turn conversations and streaming responses
- Tool suite: file read/write/edit, glob/grep search, shell commands, web search/fetch
- Local model providers: Ollama and llama.cpp, plus OAuth-based cloud providers
- Semantic codebase index for meaning-based search
- MCP (Model Context Protocol) client with external server support
- Approval policy engine with allow/ask/deny rules per tool (shell, edits, web, MCP)
- Inline diff review for AI-proposed edits
- Context mentions, workspace context, and custom rules/hooks
- Settings panel (React webview) for models, features, and approval configuration
- `Ctrl+L` / `Cmd+L` to add editor selection to chat
