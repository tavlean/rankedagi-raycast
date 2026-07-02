import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { deriveDatasetCollections } from "./collections";
import { DEFAULT_DATA_URL } from "./constants";
import { Dataset } from "./types";

type Preferences = {
  dataUrl?: string;
};

export function useDataset() {
  const preferences = getPreferenceValues<Preferences>();
  const dataUrl = preferences.dataUrl || DEFAULT_DATA_URL;
  const fetchState = useFetch<Dataset>(dataUrl, {
    // Explicit parse: production serves the prerendered JSON as
    // application/octet-stream (static host, extension-less path), and
    // useFetch's default parser falls back to text() for non-JSON content
    // types — which would silently break every list.
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as Dataset;
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Could not refresh RankedAGI data",
    },
  });

  return useMemo(() => {
    return {
      ...fetchState,
      ...deriveDatasetCollections(fetchState.data),
    };
  }, [fetchState]);
}
