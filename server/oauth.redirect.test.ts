import { describe, expect, it } from "vitest";
import { isPreviewHostname } from "../client/src/const";

describe("OAuth redirect host guard", () => {
  it("recognizes temporary WebDev preview hosts", () => {
    expect(isPreviewHostname("3000-i095dn45q5z6dce8houv0-9f2c85e4.sg2.manus.computer")).toBe(true);
    expect(isPreviewHostname("app.example.com")).toBe(false);
    expect(isPreviewHostname("app.manus.space")).toBe(false);
  });
});
