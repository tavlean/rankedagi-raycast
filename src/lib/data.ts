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
