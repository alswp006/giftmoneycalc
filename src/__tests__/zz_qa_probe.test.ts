// @vitest-environment jsdom
import { describe, it } from "vitest";
import { addHistoryItem, getHistoryList, HISTORY_STORAGE_KEY } from "../lib/storage";

describe("storage probe", () => {
  it("round trip + corrupt fallback + cap", () => {
    window.localStorage.clear();
    addHistoryItem({ recommended: 70000, rangeMin: 50000, rangeMax: 80000, createdAt: Date.now(), eventType: "wedding", relation: "friend" });
    console.log("roundtrip:", JSON.stringify(getHistoryList()));

    window.localStorage.setItem(HISTORY_STORAGE_KEY, "{not json");
    console.log("corrupt =>", JSON.stringify(getHistoryList()));
    window.localStorage.setItem(HISTORY_STORAGE_KEY, '{"a":1}');
    console.log("non-array =>", JSON.stringify(getHistoryList()));
    window.localStorage.setItem(HISTORY_STORAGE_KEY, "null");
    console.log("null =>", JSON.stringify(getHistoryList()));

    window.localStorage.clear();
    for (let i = 0; i < 35; i++) addHistoryItem({ recommended: i, rangeMin: 0, rangeMax: 0, createdAt: i });
    console.log("cap after 35 inserts =", getHistoryList().length, "first =", getHistoryList()[0].recommended);
  });
});
