import { SCHEMA_VERSION } from "@/storage/keys";

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[N]는 schemaVersion N의 데이터를 N+1로 변환한다.
 * 등록되지 않은 버전은 schemaVersion 필드만 증가시키는 항등 변환으로 처리한다.
 */
export const migrations: Record<number, Migration> = {};

export function applyMigrations(data: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  let current = data;
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    const migrate = migrations[version];
    current = migrate ? migrate(current) : { ...current, schemaVersion: version + 1 };
  }
  return current;
}
