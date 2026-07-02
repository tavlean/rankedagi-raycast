import { Cache, getPreferenceValues } from "@raycast/api";
import { DEFAULT_DATA_URL } from "./constants";
import { Dataset } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_KEY = "payload";
const cache = new Cache({ namespace: "dataset" });

type Preferences = {
  dataUrl?: string;
};

type CachedDataset = {
  timestamp: number;
  data: Dataset;
};

export async function loadDataset(): Promise<Dataset> {
  const preferences = getPreferenceValues<Preferences>();
  const dataUrl = preferences.dataUrl || DEFAULT_DATA_URL;
  const cached = readCachedDataset();

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await fetch(dataUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as Dataset;
    cache.set(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data } satisfies CachedDataset));
    return data;
  } catch (error) {
    if (cached) {
      return cached.data;
    }

    throw error;
  }
}

function readCachedDataset(): CachedDataset | undefined {
  const raw = cache.get(CACHE_KEY);

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as CachedDataset;
    return parsed?.data ? parsed : undefined;
  } catch {
    return undefined;
  }
}
