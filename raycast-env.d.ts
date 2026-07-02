/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Data URL - Override to a local RankedAGI dev server during development (e.g. http://127.0.0.1:5197/api/export). */
  "dataUrl": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-models` command */
  export type SearchModels = ExtensionPreferences & {}
  /** Preferences accessible in the `search-benchmarks` command */
  export type SearchBenchmarks = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-models` command */
  export type SearchModels = {}
  /** Arguments passed to the `search-benchmarks` command */
  export type SearchBenchmarks = {}
}

