import { describe, it, expect, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { mockTds } from "@/__tests__/__helpers__/mocks";

mockTds();

import { useNavigate } from "react-router-dom";

describe("tmp probe — inline hoisted router mock only", () => {
  it("reports whether the hoisted vi.mock registered", () => {
    console.log("INLINE ONLY MATCHES MOCK:", useNavigate() === mockNavigate);
    expect(true).toBe(true);
  });
});
