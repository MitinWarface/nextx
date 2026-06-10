"use client";

import * as React from "react";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return getCtor() !== undefined;
}

export interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(
  lang: string = "ru-RU",
): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recRef = React.useRef<SpeechRecognitionLike | null>(null);
  const isSupported = getCtor() !== undefined;

  const start = React.useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("not_supported");
      return;
    }
    try {
      setTranscript("");
      setError(null);
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let combined = "";
        for (let i = 0; i < e.results.length; i++) {
          combined += e.results[i][0].transcript;
        }
        setTranscript(combined);
      };
      rec.onerror = (e) => {
        setError(e.error ?? "speech_error");
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      rec.start();
      recRef.current = rec;
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "speech_error");
      setIsListening(false);
    }
  }, [lang]);

  const stop = React.useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const reset = React.useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  React.useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return { isSupported, isListening, transcript, error, start, stop, reset };
}
