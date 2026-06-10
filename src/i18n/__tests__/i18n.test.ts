import { describe, it, expect } from "vitest";
import en from "@/i18n/en.json";
import ru from "@/i18n/ru.json";

describe("i18n translations", () => {
  it("has all top-level keys in English", () => {
    const keys = Object.keys(en);
    expect(keys).toContain("app");
    expect(keys).toContain("nav");
    expect(keys).toContain("chat");
    expect(keys).toContain("call");
    expect(keys).toContain("settings");
    expect(keys).toContain("common");
  });

  it("has all top-level keys in Russian", () => {
    const keys = Object.keys(ru);
    expect(keys).toContain("app");
    expect(keys).toContain("nav");
    expect(keys).toContain("chat");
    expect(keys).toContain("call");
    expect(keys).toContain("settings");
    expect(keys).toContain("common");
  });

  it("EN and RU have same structure", () => {
    const checkStructure = (a: any, b: any, path = "") => {
      for (const key of Object.keys(a)) {
        const fullPath = path ? `${path}.${key}` : key;
        expect(b[key], `Missing key ${fullPath} in RU`).toBeDefined();
        if (typeof a[key] === "object" && a[key] !== null) {
          checkStructure(a[key], b[key], fullPath);
        }
      }
    };
    checkStructure(en, ru);
    checkStructure(ru, en);
  });

  it("RU translations are in Russian", () => {
    // Check that Russian text contains Cyrillic characters
    expect(ru.nav.chats).toMatch(/[а-яА-Я]/);
    expect(ru.chat.send).toMatch(/[а-яА-Я]/);
    expect(ru.settings.title).toMatch(/[а-яА-Я]/);
  });

  it("EN translations are in English", () => {
    expect(en.nav.chats).toBe("Chats");
    expect(en.chat.send).toBe("Send");
    expect(en.settings.title).toBe("Settings");
  });
});
