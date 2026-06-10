/**
 * User-Agent parser for device tracking.
 * Extracts platform, browser, and a human-readable device name.
 */
export interface ParsedUA {
  platform: string;
  browser: string | null;
  deviceName: string;
}

const MOBILE_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const IOS_RE = /iPhone|iPad|iPod/;
const ANDROID_RE = /Android/;
const CHROME_RE = /Chrome\/([\d.]+)/;
const FIREFOX_RE = /Firefox\/([\d.]+)/;
const SAFARI_RE = /Version\/([\d.]+).*Safari/;
const EDGE_RE = /Edg\/([\d.]+)/;

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { platform: "Unknown", browser: null, deviceName: "Unknown Device" };

  const isMobile = MOBILE_RE.test(ua);
  const isIOS = IOS_RE.test(ua);
  const isAndroid = ANDROID_RE.test(ua);

  let platform: string;
  let browser: string | null = null;
  let deviceName: string;

  // Platform
  if (isIOS) {
    platform = "iOS";
    const match = ua.match(/OS ([\d_]+)/);
    platform += match ? ` ${match[1].replace(/_/g, ".")}` : "";
  } else if (isAndroid) {
    platform = "Android";
    const match = ua.match(/Android ([\d.]+)/);
    platform += match ? ` ${match[1]}` : "";
  } else if (ua.includes("Windows")) {
    platform = "Windows";
    const match = ua.match(/Windows NT ([\d.]+)/);
    if (match) {
      const ntMap: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
      platform += ` ${ntMap[match[1]] ?? match[1]}`;
    }
  } else if (ua.includes("Mac OS X")) {
    platform = "macOS";
    const match = ua.match(/Mac OS X ([\d_]+)/);
    platform += match ? ` ${match[1].replace(/_/g, ".")}` : "";
  } else if (ua.includes("Linux")) {
    platform = "Linux";
  } else {
    platform = "Web";
  }

  // Browser
  const edgeMatch = ua.match(EDGE_RE);
  if (edgeMatch) {
    browser = `Edge ${edgeMatch[1]}`;
  } else {
    const chromeMatch = ua.match(CHROME_RE);
    const safariMatch = ua.match(SAFARI_RE);
    const firefoxMatch = ua.match(FIREFOX_RE);

    if (chromeMatch && !safariMatch) {
      browser = `Chrome ${chromeMatch[1]}`;
    } else if (firefoxMatch) {
      browser = `Firefox ${firefoxMatch[1]}`;
    } else if (safariMatch && !chromeMatch) {
      browser = `Safari ${safariMatch[1]}`;
    }
  }

  // Device name
  if (isMobile) {
    if (isIOS) {
      const match = ua.match(/iPhone/);
      deviceName = match ? "iPhone" : "iPad";
    } else if (isAndroid) {
      const match = ua.match(/;\s*([^;)]+)\s*Build/);
      deviceName = match ? match[1].trim() : "Android Device";
    } else {
      deviceName = "Mobile Device";
    }
  } else {
    deviceName = browser ? `${browser.split(" ")[0]} on ${platform.split(" ")[0]}` : platform;
  }

  return { platform, browser, deviceName };
}
