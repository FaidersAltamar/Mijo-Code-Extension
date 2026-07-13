/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as vscode from "vscode";

function nonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

/** Thin HTML shell that loads a bundled React webview (dist/webview/<entry>.js/.css). */
export function renderWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  entry: "sidebar" | "settings",
  title: string,
  locale?: string
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", `${entry}.js`)
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", `${entry}.css`)
  );
  const iconUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "icon.png")
  );
  const n = nonce();
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${n}'`,
    `font-src ${webview.cspSource} data:`,
    `worker-src 'none'`,
  ].join("; ");

  const lang = locale === "es" ? "es" : "en";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>${title}</title>
  <script nonce="${n}">
  try { if (navigator.serviceWorker) { navigator.serviceWorker.register = function(){ return Promise.reject(new Error('disabled')); }; } } catch(e){}
  </script>
</head>
<body>
  <div id="root" data-icon="${iconUri}" data-locale="${lang}"></div>
  <script nonce="${n}" src="${scriptUri}"></script>
</body>
</html>`;
}

