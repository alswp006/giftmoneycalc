import { useCallback, useEffect, useState } from "react";
import type { GiftRecord } from "@/lib/types";
import { queryRecords, subscribeRecords } from "@/lib/records";

export function useRecords(): {
  records: GiftRecord[];
  loading: boolean;
  reload: () => void;
} {
  const [records, setRecords] = useState<GiftRecord[]>(() => queryRecords());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setRecords(queryRecords());
  }, []);

  useEffect(() => {
    setRecords(queryRecords());
    setLoading(false);

    const unsubscribe = subscribeRecords((next) => {
      setRecords(next);
    });

    return unsubscribe;
  }, []);

  return { records, loading, reload };
}
