import { describe, it } from "vitest";
import { safeCalculate, snapToLadder } from "../src/lib/calc";

describe("qa probe", () => {
  it("spec vectors", () => {
    const cases: Array<[string, any, string]> = [
      ["A wedding/coworker/3/seoul_etc/attend/general",
        { eventType: "wedding", relation: "coworker", intimacy: 3, region: "seoul_etc", attendance: "attend", venue: "general" },
        "SPEC: rec 50000, range 30000~70000"],
      ["B wedding/closeFriend/5/seoul_gangnam/attend/hotel",
        { eventType: "wedding", relation: "closeFriend", intimacy: 5, region: "seoul_gangnam", attendance: "attend", venue: "hotel" },
        "SPEC: rec 200000, range 150000~300000"],
      ["C funeral/acquaintance/1/local/absent",
        { eventType: "funeral", relation: "acquaintance", intimacy: 1, region: "local", attendance: "absent", venue: null },
        "SPEC: rec 30000, range 30000~50000"],
      ["D firstBirthday/family/4/metro/attend",
        { eventType: "firstBirthday", relation: "family", intimacy: 4, region: "metro", attendance: "attend", venue: null },
        "SPEC: rec 100000, range 70000~150000"],
    ];
    for (const [name, inp, exp] of cases) {
      console.log(name, "=> ACTUAL", JSON.stringify(safeCalculate(inp)), "|", exp);
    }

    console.log("--- factor sensitivity using THIS APP's own vocabulary ---");
    const b = { eventType: "wedding", relation: "friend", intimacy: 3, region: "metro", attendance: "attend", venue: null };
    console.log("baseline            ", JSON.stringify(safeCalculate(b)));
    console.log("intimacy=1          ", JSON.stringify(safeCalculate({ ...b, intimacy: 1 })));
    console.log("intimacy=5          ", JSON.stringify(safeCalculate({ ...b, intimacy: 5 })));
    console.log("region=region(지방) ", JSON.stringify(safeCalculate({ ...b, region: "region" })));
    console.log("attendance=absent   ", JSON.stringify(safeCalculate({ ...b, attendance: "absent" })));
    console.log("attendance=host     ", JSON.stringify(safeCalculate({ ...b, attendance: "host" })));

    console.log("--- ladder tie-break (SPEC: tie => larger) ---");
    console.log("snapToLadder(60000) =>", snapToLadder(60000), "(midpoint of 50000/70000)");
    console.log("snapToLadder(15000) =>", snapToLadder(15000), "(midpoint of 10000/20000)");

    console.log("--- hotel bonus reachability ---");
    const hb = { eventType: "wedding", relation: "friend", intimacy: 3, region: "metro", attendance: "attend" };
    console.log("wedding/friend general", JSON.stringify(safeCalculate({ ...hb, venue: "general" })));
    console.log("wedding/friend hotel  ", JSON.stringify(safeCalculate({ ...hb, venue: "hotel" })));
    const hb2 = { ...hb, relation: "acquaintance" };
    console.log("wedding/acq general   ", JSON.stringify(safeCalculate({ ...hb2, venue: "general" })));
    console.log("wedding/acq hotel     ", JSON.stringify(safeCalculate({ ...hb2, venue: "hotel" })));
  });
});
