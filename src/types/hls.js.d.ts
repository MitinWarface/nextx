declare module "hls.js" {
  export default class Hls {
    static isSupported(): boolean;
    static Events: Record<string, string>;
    constructor(config?: Record<string, any>);
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
    currentLevel: number;
    levels: Array<{ height: number; width: number }>;
  }
}
