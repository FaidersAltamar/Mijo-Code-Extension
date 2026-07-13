/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

export function fmtSize(bytes?: number): string {
  if (!bytes) return "";
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

