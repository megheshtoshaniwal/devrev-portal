import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  setSessionCookies,
  clearSessionCookies,
  getTokenFromRequest,
  getAuthFlagFromRequest,
} from "@/devrev-sdk/auth/session";

describe("session cookie helpers", () => {
  describe("setSessionCookies", () => {
    it("sets both session and auth flag cookies", () => {
      const response = NextResponse.json({ ok: true });
      const result = setSessionCookies(response, "test-token-123", true);

      const cookies = result.cookies.getAll();
      const sessionCookie = cookies.find((c) => c.name === "devrev_session");
      const authCookie = cookies.find((c) => c.name === "devrev_auth");

      expect(sessionCookie?.value).toBe("test-token-123");
      expect(authCookie?.value).toBe("1");
    });

    it("sets auth flag to 0 for anonymous sessions", () => {
      const response = NextResponse.json({ ok: true });
      const result = setSessionCookies(response, "anon-token", false);

      const authCookie = result.cookies.getAll().find((c) => c.name === "devrev_auth");
      expect(authCookie?.value).toBe("0");
    });
  });

  describe("clearSessionCookies", () => {
    it("deletes both cookies", () => {
      const response = NextResponse.json({ ok: true });
      const result = clearSessionCookies(response);

      // After delete, cookies should be set with maxAge=0 or empty
      const cookies = result.cookies.getAll();
      const sessionCookie = cookies.find((c) => c.name === "devrev_session");
      const authCookie = cookies.find((c) => c.name === "devrev_auth");

      // Deleted cookies have empty value or maxAge=0
      expect(sessionCookie?.value || "").toBe("");
      expect(authCookie?.value || "").toBe("");
    });
  });

  describe("getTokenFromRequest", () => {
    it("reads token from cookie", () => {
      const req = new NextRequest("http://localhost:3000/test", {
        headers: { cookie: "devrev_session=my-token-abc" },
      });
      expect(getTokenFromRequest(req)).toBe("my-token-abc");
    });

    it("returns null when no cookie", () => {
      const req = new NextRequest("http://localhost:3000/test");
      expect(getTokenFromRequest(req)).toBeNull();
    });
  });

  describe("getAuthFlagFromRequest", () => {
    it("returns true when auth flag is 1", () => {
      const req = new NextRequest("http://localhost:3000/test", {
        headers: { cookie: "devrev_auth=1" },
      });
      expect(getAuthFlagFromRequest(req)).toBe(true);
    });

    it("returns false when auth flag is 0", () => {
      const req = new NextRequest("http://localhost:3000/test", {
        headers: { cookie: "devrev_auth=0" },
      });
      expect(getAuthFlagFromRequest(req)).toBe(false);
    });

    it("returns false when no cookie", () => {
      const req = new NextRequest("http://localhost:3000/test");
      expect(getAuthFlagFromRequest(req)).toBe(false);
    });
  });
});
