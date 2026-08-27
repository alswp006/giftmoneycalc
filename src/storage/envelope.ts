import { CORRUPT_KEY_PREFIX, SCHEMA_VERSION } from "@/storage/keys";
import { applyMigrations } from "@/storage/migrations";

type Envelope = { schemaVersion: number };

export type EnvelopeResult<T> =
  | { ok: true; value: T; code?: undefined }
  | { ok: false; code: "CORRUPTED" | "READ_ONLY_VERSION" | "QUOTA_EXCEEDED"; value?: undefined };

function isQuotaExceededError(err: unknown): boolean {
  return err instanceof Error && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
}

function hasValidSchemaVersion(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).schemaVersion === "number" &&
    Number.isInteger((value as Record<string, unknown>).schemaVersion)
  );
}

export async function readEnvelope<T extends Envelope>(key: string, fallback: T): Promise<EnvelopeResult<T>> {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return { ok: true, value: fallback };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.setItem(`${CORRUPT_KEY_PREFIX}${key}`, raw);
      localStorage.setItem(key, JSON.stringify(fallback));
      return { ok: false, code: "CORRUPTED" };
    }

    if (!hasValidSchemaVersion(parsed)) {
      localStorage.setItem(`${CORRUPT_KEY_PREFIX}${key}`, raw);
      localStorage.setItem(key, JSON.stringify(fallback));
      return { ok: false, code: "CORRUPTED" };
    }

    if (parsed.schemaVersion > SCHEMA_VERSION) {
      return { ok: false, code: "READ_ONLY_VERSION" };
    }

    if (parsed.schemaVersion < SCHEMA_VERSION) {
      const migrated = applyMigrations(parsed as Record<string, unknown>, parsed.schemaVersion) as unknown as T;
      localStorage.setItem(key, JSON.stringify(migrated));
      return { ok: true, value: migrated };
    }

    return { ok: true, value: parsed as T };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { ok: false, code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, code: "CORRUPTED" };
  }
}

export async function writeEnvelope<T extends Envelope>(key: string, data: T): Promise<EnvelopeResult<T>> {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { ok: true, value: data };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { ok: false, code: "QUOTA_EXCEEDED" };
    }
    throw err;
  }
}
