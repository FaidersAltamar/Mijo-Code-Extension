/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Icon } from "../../shared/icons";
import { t } from "../../shared/i18n";
import type { ConversationSummary } from "../types";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return t("history.justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return m + t("history.mAgo");
  const h = Math.floor(m / 60);
  if (h < 24) return h + t("history.hAgo");
  const d = Math.floor(h / 24);
  return d + t("history.dAgo");
}

export function History({
  list,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: {
  list: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query
    ? list.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : list;

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-popup" onClick={(e) => e.stopPropagation()}>
        {/* Search */}
        <div className="history-search">
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t("history.title")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        </div>
        {/* List */}
        <div className="history-list">
          {filtered.length === 0 ? (
            <div className="history-empty">
              {list.length === 0 ? t("history.empty") : t("history.noResults")}
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={"history-item" + (c.id === activeId ? " active" : "")}
                onClick={() => onSelect(c.id)}
              >
                <div className="hi-text">
                  <div className="hi-title">{c.title}</div>
                  <div className="hi-time">{timeAgo(c.updatedAt)}</div>
                </div>
                <button
                  className="hi-del"
                  title={t("history.deleteTitle")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

