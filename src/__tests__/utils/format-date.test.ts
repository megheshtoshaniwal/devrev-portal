import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatRelativeTime, formatDateTime } from "@/devrev-sdk/utils/format-date";

describe("formatDate", () => {
  it("formats ISO date string to readable format", () => {
    expect(formatDate("2026-04-15T10:30:00Z")).toBe("Apr 15, 2026");
  });

  it("formats different months correctly", () => {
    expect(formatDate("2026-01-01T00:00:00Z")).toBe("Jan 1, 2026");
    expect(formatDate("2026-12-25T00:00:00Z")).toBe("Dec 25, 2026");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for less than 1 hour", () => {
    expect(formatRelativeTime("2026-04-23T11:30:00Z")).toBe("Just now");
  });

  it("returns hours ago for same day", () => {
    expect(formatRelativeTime("2026-04-23T09:00:00Z")).toBe("3h ago");
  });

  it("returns days ago for same week", () => {
    expect(formatRelativeTime("2026-04-21T12:00:00Z")).toBe("2d ago");
  });

  it("returns formatted date for older than a week", () => {
    const result = formatRelativeTime("2026-04-10T12:00:00Z");
    expect(result).toContain("Apr");
    expect(result).toContain("10");
  });
});

describe("formatDateTime", () => {
  it("includes date and time", () => {
    const result = formatDateTime("2026-04-15T14:30:00Z");
    expect(result).toContain("Apr");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});
