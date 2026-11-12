import { describe, expect, it } from "vitest";
import {
  hashBaseProps,
  getResponsiveState,
  storeAutoOverrides,
  resetDeviceOverrides,
  markResponsiveCustom,
  hasDeviceOverrides,
} from "@/lib/create/device-overrides";

describe("hashBaseProps", () => {
  it("returns a hex string", () => {
    const h = hashBaseProps({ columns: 3 });
    expect(typeof h).toBe("string");
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it("is deterministic", () => {
    expect(hashBaseProps({ columns: 3, align: "left" })).toBe(
      hashBaseProps({ columns: 3, align: "left" }),
    );
  });

  it("differs for different props", () => {
    expect(hashBaseProps({ columns: 3 })).not.toBe(hashBaseProps({ columns: 4 }));
  });

  it("excludes deviceOverrides from the hash", () => {
    const base = { columns: 3 };
    const withOverrides = { columns: 3, deviceOverrides: { mobile: { columns: 1 } } };
    expect(hashBaseProps(base)).toBe(hashBaseProps(withOverrides));
  });
});

describe("getResponsiveState", () => {
  it("returns auto when no deviceOverrides present", () => {
    expect(getResponsiveState({ columns: 3 })).toBe("auto");
  });

  it("returns auto when deviceOverrides is empty object", () => {
    expect(getResponsiveState({ columns: 3, deviceOverrides: {} })).toBe("auto");
  });

  it("returns auto when overrides are in auto mode with current hash", () => {
    const base = { columns: 3 };
    const withAuto = storeAutoOverrides(base, { mobile: { columns: 1 } });
    expect(getResponsiveState(withAuto)).toBe("auto");
  });

  it("returns needs-review when base props changed after auto overrides", () => {
    const originalBase = { columns: 3 };
    const withAutoOverrides = storeAutoOverrides(originalBase, { mobile: { columns: 1 } });
    const changedBase = { ...withAutoOverrides, columns: 4 };
    expect(getResponsiveState(changedBase)).toBe("needs-review");
  });

  it("returns custom when overrides are in custom mode", () => {
    const base = { columns: 3 };
    const withCustom = markResponsiveCustom({ ...base, deviceOverrides: { mobile: { columns: 2 } } });
    expect(getResponsiveState(withCustom)).toBe("custom");
  });
});

describe("storeAutoOverrides", () => {
  it("stores overrides under deviceOverrides", () => {
    const result = storeAutoOverrides({ columns: 3 }, { mobile: { columns: 1 }, tablet: { columns: 2 } });
    expect((result.deviceOverrides as Record<string, unknown>)?.mobile).toEqual({ columns: 1 });
    expect((result.deviceOverrides as Record<string, unknown>)?.tablet).toEqual({ columns: 2 });
  });

  it("stores _state.mode as auto with baseHash", () => {
    const base = { columns: 3 };
    const result = storeAutoOverrides(base, { mobile: { columns: 1 } });
    const state = (result.deviceOverrides as Record<string, unknown>)?._state as Record<string, unknown>;
    expect(state?.mode).toBe("auto");
    expect(state?.baseHash).toBe(hashBaseProps(base));
  });

  it("preserves non-deviceOverrides props", () => {
    const result = storeAutoOverrides({ columns: 3, align: "left" }, {});
    expect(result.columns).toBe(3);
    expect(result.align).toBe("left");
  });
});

describe("resetDeviceOverrides", () => {
  it("removes deviceOverrides entirely", () => {
    const props = { columns: 3, deviceOverrides: { mobile: { columns: 1 } } };
    const result = resetDeviceOverrides(props);
    expect(result.deviceOverrides).toBeUndefined();
  });

  it("preserves other props", () => {
    const result = resetDeviceOverrides({ columns: 3, align: "left", deviceOverrides: { mobile: {} } });
    expect(result.columns).toBe(3);
    expect(result.align).toBe("left");
  });
});

describe("markResponsiveCustom", () => {
  it("sets _state.mode to custom", () => {
    const props = { columns: 3, deviceOverrides: { mobile: { columns: 2 } } };
    const result = markResponsiveCustom(props);
    const state = (result.deviceOverrides as Record<string, unknown>)?._state as Record<string, unknown>;
    expect(state?.mode).toBe("custom");
  });

  it("preserves existing override keys", () => {
    const props = { columns: 3, deviceOverrides: { mobile: { columns: 2 }, tablet: { columns: 3 } } };
    const result = markResponsiveCustom(props);
    expect((result.deviceOverrides as Record<string, unknown>)?.mobile).toEqual({ columns: 2 });
    expect((result.deviceOverrides as Record<string, unknown>)?.tablet).toEqual({ columns: 3 });
  });
});

describe("hasDeviceOverrides", () => {
  it("returns false when no deviceOverrides", () => {
    expect(hasDeviceOverrides({ columns: 3 }, "mobile")).toBe(false);
  });

  it("returns false when device bucket is empty or only _state", () => {
    const props = storeAutoOverrides({ columns: 3 }, {});
    expect(hasDeviceOverrides(props, "mobile")).toBe(false);
  });

  it("returns true when device bucket has non-internal keys", () => {
    const props = storeAutoOverrides({ columns: 3 }, { mobile: { columns: 1 } });
    expect(hasDeviceOverrides(props, "mobile")).toBe(true);
  });

  it("checks the specified device only", () => {
    const props = storeAutoOverrides({ columns: 3 }, { mobile: { columns: 1 } });
    expect(hasDeviceOverrides(props, "tablet")).toBe(false);
  });
});
