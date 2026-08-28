import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/settings";

export function useSettings(): {
  settings: AppSettings | null;
  save: (settings: AppSettings) => Promise<void>;
  saving: boolean;
} {
  const [settings, setSettings] = useState<AppSettings | null>(() => getSettings());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const save = useCallback(async (next: AppSettings) => {
    setSaving(true);
    try {
      const result = saveSettings(next);
      if (result.ok) {
        setSettings(result.data);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, save, saving };
}
