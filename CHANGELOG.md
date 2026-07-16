# Change Log

All notable changes to the "ocursor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.17] - 2026-07-15

### Fixed

- Improved error handling for provider connection failures: "Fetch failed" and network errors now show a clear Spanish message suggesting to check internet, API URL and API key.
- Increased default retry attempts from 3 to 5 for transient network errors.
- Wrapped streaming fetch calls in OpenAI/Anthropic paths with better error context.

## [0.0.16] - 2026-07-15

### Fixed

- Increased streaming request timeouts from 2 minutes to 10 minutes across OpenAI, Anthropic and OAuth providers, preventing "This operation was aborted" errors on long-running agent tasks.

## [0.0.15] - 2026-07-15

### Fixed

- Increased the internal context safety margin from 5% to 12% (minimum 8192 tokens) to stop the remaining "exceeded model token limit" errors.
- Lowered the default `ocursor.maxContextTokens` from 245,760 to 240,000.
- Hardened the anti-narration guard: filler text is no longer added to history, the system prompt is stricter, and the loop stops repetitive loops faster.

## [0.0.14] - 2026-07-15

### Fixed

- Translated remaining hardcoded English UI strings to Spanish.

## [0.0.13] - 2026-07-15

### Fixed

- Drastically simplified the system prompt to reduce model confusion and eliminate repetitive filler output.
- Added `tool_choice: "required"` forcing when the model starts narrating instead of calling tools.
- Added a repetition guard that stops the run if the model emits the same filler pattern multiple times in a row, preventing the visual-spam loops.
- Limited narration nudges to 2 attempts before surfacing a clean error instead of looping forever.

## [0.0.12] - 2026-07-15

### Fixed

- Agent runs now auto-resume when they reach the step limit instead of pausing for a manual Continue click.
- Hardened system prompt and loop nudges to stop the model from narrating tool calls ("Voy a ejecutar Glob", "Buscando", etc.) and force it to call tools directly.

## [0.0.11] - 2026-07-15

### Fixed

- Added an internal safety margin (5% of the configured context window, at least 4096 tokens) to all context-budget calculations, preventing the remaining "exceeded model token limit" 400 errors caused by imprecise local token estimates.
- Lowered the default `ocursor.maxContextTokens` from 262,144 to 245,760 to leave headroom below common 256k model limits.

## [0.0.9] - 2026-07-14

### Fixed

- Context token accounting now subtracts the response reservation (`maxTokens`) and a safety buffer before truncating workspace context blocks, preventing the small overshoot that caused "exceeded model token limit: 262144" errors.
- `buildMessages()` now considers prior conversation steps when allocating budget to live context blocks.

## [0.0.8] - 2026-07-14

### Added

- New global setting `ocursor.maxContextTokens` (default 262,144) that caps the context window used for every model.
- Context-block truncation in `buildMessages()` so huge workspace context never exceeds the configured cap.
- UI control in Settings → Behavior to adjust the max context tokens cap.

### Fixed

- Prevent "Your request exceeded model token limit" errors when the workspace context is larger than the provider allows.

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
