/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as vscode from 'vscode';
import { SettingsManager } from './stores/settingsManager';
import { SidebarProvider } from './ui/sidebarProvider';
import { registerInlineReview } from './ui/inlineReview';
import { SettingsPanel } from './ui/settingsPanel';
import { FeatureStore } from './stores/featureStore';
import { mcpManager } from './integrations/mcpClient';
import { setIndexStorageDir, buildIndex } from './agent/semanticIndex';
import { setDocsStorageDir, setDocSourcesProvider } from './agent/docsIndex';
import { getWorkspaceRoot } from './context/workspaceUtils';
import { initLlamacpp, checkInstalled, loadModel, disposeLlamacpp } from './agent/llamacpp';
import { initOAuth } from './agent/oauth';
import { initUsage } from './stores/usageStore';
import { initModelRegistry, applyEmbedModel } from './stores/modelRegistry';
import { initRuntimeDeps } from './runtimeDeps';

export function activate(context: vscode.ExtensionContext) {
  // Always create the output channel first so we can log any activation error.
  const log = SidebarProvider.log;
  log.appendLine(`[Mijo Code] activate() started v${context.extension.packageJSON.version}`);

  try {
    // Heavy native deps (onnxruntime, sharp, transformers) are not shipped in the
    // VSIX; they are downloaded to globalStorage on first use.
    initRuntimeDeps(context.globalStorageUri.fsPath);

    const settingsManager = new SettingsManager(context);
    const featureStore = new FeatureStore(context);
    initOAuth(context);
    initUsage(context);
    // Prefetch the provider-grouped model list so every UI (settings, pickers)
    // renders instantly from the backend cache.
    initModelRegistry(featureStore, settingsManager);

    // Local semantic index: model + vectors live in extension globalStorage.
    // Kick off an initial background build (incremental; no-op if already fresh).
    setIndexStorageDir(context.globalStorageUri.fsPath);
    setDocsStorageDir(context.globalStorageUri.fsPath);
    setDocSourcesProvider(() => featureStore.get().docSources ?? []);
    applyEmbedModel(featureStore.get().embedModel || "minilm")
      .then(() => buildIndex(getWorkspaceRoot()))
      .catch(() => {});

    // Connect any enabled MCP servers in the background.
    mcpManager.sync(featureStore.get().mcpServers).catch(() => {});

    // llama.cpp local models: detect install, then auto-load flagged models.
    initLlamacpp(context);
    checkInstalled().then(() => {
      const f = featureStore.get();
      for (const m of f.llamacppModels) {
        if (m.autoLoad) loadModel(m, f.llamacppConfig).catch(() => {});
      }
    });

    // Create the shared output channel while the extension host is alive and
    // dispose it with the extension (avoids "DisposableStore already disposed" leaks).
    context.subscriptions.push(SidebarProvider.log);

    const sidebarProvider = new SidebarProvider(context, settingsManager, featureStore);

    // Virtual-doc provider serving the "before" side of agent-edit diffs.
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider("ocursor-original", {
        provideTextDocumentContent(uri) {
          return sidebarProvider._originalDocs.get(uri.path) ?? "";
        },
      })
    );

    // Inline (in-editor) Keep/Undo CodeLenses + changed-line decorations (no git needed).
    registerInlineReview(context);

    context.subscriptions.push(
      vscode.commands.registerCommand('ocursor.openSettings', (section?: string) => {
        SettingsPanel.createOrShow(context, settingsManager, featureStore, section);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('ocursor.openChat', () => {
        sidebarProvider.createOrShow();
      })
    );

    // Status bar item so users always have a visible button to open the chat.
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(comment-discussion) Mijo Code";
    statusBarItem.tooltip = "Open Mijo Code Chat";
    statusBarItem.command = 'ocursor.openChat';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Ctrl+L: add the current selection (or file) to chat as a mention.
    context.subscriptions.push(
      vscode.commands.registerCommand('ocursor.addToChat', () => sidebarProvider.addSelectionToChat())
    );

    context.subscriptions.push({ dispose: () => mcpManager.disposeAll() });
    context.subscriptions.push({ dispose: () => disposeLlamacpp() });

    log.appendLine('[Mijo Code] activate() completed successfully');
  } catch (err: any) {
    const message = err?.message || String(err);
    log.appendLine(`[Mijo Code] activate() FAILED: ${message}`);
    log.appendLine(err?.stack || '');
    vscode.window.showErrorMessage(`Mijo Code failed to activate: ${message}. Open Output → Mijo Code for details.`);
    throw err;
  }
}

export function deactivate() {
  mcpManager.disposeAll();
  disposeLlamacpp();
}

