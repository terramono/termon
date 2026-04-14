# The Electron Import Bug — Simple Explainer

## What broke?

Running `npm run dev` on a clean clone of WaveTerm crashes instantly:

```
SyntaxError: The requested module 'electron' does not provide an export named 'BaseWindow'
```

No window ever opens. The app dies before any code runs.

## Why?

Three things collided:

1. **WaveTerm uses ESM** (`"type": "module"` in package.json)
2. **Electron is a CJS module** (uses the old `module.exports` style)
3. **Electron 41 ships Node.js v24**, which got stricter about mixing the two

When Node.js sees this in the built bundle:

```js
import { BaseWindow, BrowserWindow, app } from "electron";
```

It has to figure out what names `electron` exports — **before running any code**. It does this by scanning the source text (static analysis). But `BaseWindow` and `BrowserWindow` are set up with lazy getters (`Object.defineProperty`), not plain assignments. Node.js v24's scanner can't see them, so it rejects the entire import.

## The fix

Don't ask Node.js to figure out the names. Just grab the whole module and pull out what you need at runtime:

```js
// Before (fails — Node.js must detect names statically):
import { BaseWindow, BrowserWindow, app } from "electron";

// After (works — default import always succeeds, destructuring happens at runtime):
import electron from "electron";
const { BaseWindow, BrowserWindow, app } = electron;
```

A small Rollup plugin in `electron.vite.config.ts` does this rewrite automatically on the built output. No source files were changed.

## One-liner

> Node.js v24 can't see some Electron exports at parse time, so we grab the whole module first and unpack it at runtime instead.
