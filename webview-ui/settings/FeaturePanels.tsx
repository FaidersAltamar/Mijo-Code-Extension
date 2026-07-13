/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

// Barrel for the settings feature panels. Each panel lives in ./panels/*;
// this file preserves the historical import surface used by App.tsx.
export { OAuthAccountCard, ProvidersPanel } from "./panels/ProvidersPanel";
export { ModelsPanel } from "./panels/ModelsPanel";
export { PersonasPanel } from "./panels/PersonasPanel";
export { McpPanel } from "./panels/McpPanel";
export { RulesPanel } from "./panels/RulesPanel";
export { HooksPanel } from "./panels/HooksPanel";
export { LlamacppPanel } from "./panels/LlamacppPanel";
export { OllamaPanel } from "./panels/OllamaPanel";

