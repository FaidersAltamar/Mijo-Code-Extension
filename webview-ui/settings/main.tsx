/*
 * Copyright (c) 2026 Mijo Code <https://mijocode.com>
 *
 * This file is part of Mijo Code — AI coding agent chat inside VS Code.
 * https://github.com/mijocode/mijo-code
 *
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import "./settings.css";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

