"use client";

import * as React from "react";
import { Smile, Paperclip, Send, Mic, X, FileText, Image as ImageIcon, Film, Music, CornerUpRight, Square, Trash2, Sticker as StickerIcon, MapPin, Rows, BellOff, Clipboard, Eye, EyeOff, CircleDot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplyPreview } from "@/types";
import { StickerPicker } from "./sticker-picker";
import { StickerPanel } from "./sticker-panel";
import { EmojiPicker } from "./emoji-picker";
import { SchedulePicker } from "./schedule-picker";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { ClipboardHistory, useClipboardHistory } from "./clipboard-history";
import { VideoCircleRecorder } from "./video-circle-recorder";
import { InlineBotResults } from "./inline-bot-results";
import { GifPanel } from "./gif-panel";
import { ContactPickerModal } from "./contact-picker-modal";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number; // 0..100; -1 = не загружается
  error?: string;
}

export interface SendAttachment {
  type: "IMAGE" | "VIDEO" | "AUDIO" | "VOICE" | "FILE" | "STICKER" | "LOCATION";
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface MessageInputProps {
  onSend: (
    text: string,
    attachments: SendAttachment[],
    opts?: {
      replyToId?: string;
      mentions?: string[];
      ttlSeconds?: number;
      location?: { lat: number; lng: number; placeName?: string; liveLocationMinutes?: number };
      keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
      scheduledFor?: string;
      isSilent?: boolean;
      isViewOnce?: boolean;
      contact?: { userId: string; displayName: string; username: string; avatarUrl: string | null };
    },
  ) => void | Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  replyTo?: ReplyPreview | null;
  onCancelReply?: () => void;
  chatId?: string;
  participants?: Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>;
  defaultTtlSeconds?: number;
  isSecretChat?: boolean;
}

export function MessageInput({
  onSend,
  onTyping,
  placeholder = "Message",
  disabled,
  className,
  replyTo,
  onCancelReply,
  chatId,
  participants = [],
  defaultTtlSeconds,
  isSecretChat = false,
}: MessageInputProps) {
  const [value, setValue] = React.useState("");
  const [isFocused, setFocused] = React.useState(false);
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  const [recordingAnalyser, setRecordingAnalyser] = React.useState<AnalyserNode | null>(null);
  const recordingCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const recordingAnimRef = React.useRef<number>(0);
  const [stickerPickerOpen, setStickerPickerOpen] = React.useState(false);
  const [stickerPanelOpen, setStickerPanelOpen] = React.useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [mentionState, setMentionState] = React.useState<{
    active: boolean;
    query: string;
    start: number;
  }>({ active: false, query: "", start: 0 });
  const [selectedMentions, setSelectedMentions] = React.useState<string[]>([]);
  const [ttlSeconds, setTtlSeconds] = React.useState<number | null>(defaultTtlSeconds ?? null);
  const [voiceTranscript, setVoiceTranscript] = React.useState<string>("");
  const [keyboardBuilderOpen, setKeyboardBuilderOpen] = React.useState(false);
  const [keyboardRows, setKeyboardRows] = React.useState<Array<Array<{ text: string; url?: string; callback_data?: string }>>>([]);
  const [scheduledFor, setScheduledFor] = React.useState<string | null>(null);
  const [isSilent, setIsSilent] = React.useState(false);
  const [spoilerMode, setSpoilerMode] = React.useState(false);
  const [viewOnce, setViewOnce] = React.useState(false);
  const [clipboardOpen, setClipboardOpen] = React.useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = React.useState(false);
  const [liveLocationMinutes, setLiveLocationMinutes] = React.useState<number | null>(null);
  const [videoCircleOpen, setVideoCircleOpen] = React.useState(false);
  const [gifPanelOpen, setGifPanelOpen] = React.useState(false);
  const [contactPickerOpen, setContactPickerOpen] = React.useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = React.useState(false);
  const [inlineBotState, setInlineBotState] = React.useState<{
    active: boolean;
    botId: string;
    botUsername: string;
    query: string;
    start: number;
  }>({ active: false, botId: "", botUsername: "", query: "", start: 0 });
  const [inlineResults, setInlineResults] = React.useState<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    thumbnail_url: string;
    content: string;
  }>>([]);
  const [inlineLoading, setInlineLoading] = React.useState(false);
  const inlineDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardHistory = useClipboardHistory();
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const recordingChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = React.useRef<number>(0);
  const speech = useSpeechRecognition("ru-RU");

  // Cleanup на unmount
  React.useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounter = React.useRef(0);

  // ============================================================
  // Drafts persistence (per chatId)
  // ============================================================
  const draftKey = React.useMemo(
    () => (chatId ? `nextx:draft:${chatId}` : null),
    [chatId],
  );

  // Load draft on mount/chatId change
  React.useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved !== null) setValue(saved);
    } catch {
      // localStorage может быть недоступен (SSR, private mode)
    }
  }, [draftKey]);

  // Save draft on change (debounced через setTimeout в самом change)
  const draftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleValueChange = React.useCallback(
    (next: string) => {
      setValue(next);
      if (!draftKey) return;
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        try {
          if (next.length === 0) {
            localStorage.removeItem(draftKey);
          } else {
            localStorage.setItem(draftKey, next);
          }
        } catch {
          // ignore
        }
      }, 250);
    },
    [draftKey],
  );

  // ============================================================
  // @mention detection
  // ============================================================
  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) {
      setMentionState({ active: false, query: "", start: 0 });
      return;
    }
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx < 0) {
      setMentionState({ active: false, query: "", start: 0 });
      return;
    }
    const segment = before.slice(atIdx + 1);
    if (/[\s\n]/.test(segment)) {
      setMentionState({ active: false, query: "", start: 0 });
      return;
    }
    if (atIdx > 0 && !/[\s\n]/.test(before[atIdx - 1])) {
      setMentionState({ active: false, query: "", start: 0 });
      return;
    }
    setMentionState({ active: true, query: segment, start: atIdx });
  }, [value]);

  // ============================================================
  // Inline bot detection (@botname query pattern)
  // ============================================================
  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) {
      setInlineBotState({ active: false, botId: "", botUsername: "", query: "", start: 0 });
      return;
    }
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match = before.match(/@(\w+)\s+(.+)$/);
    if (match && participants.some((p) => p.username.toLowerCase() === match[1].toLowerCase())) {
      setInlineBotState({
        active: true,
        botId: participants.find((p) => p.username.toLowerCase() === match[1].toLowerCase())?.id ?? "",
        botUsername: match[1],
        query: match[2],
        start: before.lastIndexOf(`@${match[1]}`),
      });
    } else {
      setInlineBotState({ active: false, botId: "", botUsername: "", query: "", start: 0 });
      setInlineResults([]);
    }
  }, [value, participants]);

  // Fetch inline bot results
  React.useEffect(() => {
    if (!inlineBotState.active || !inlineBotState.botId || inlineBotState.query.length < 1) {
      setInlineResults([]);
      return;
    }
    if (inlineDebounceRef.current) clearTimeout(inlineDebounceRef.current);
    inlineDebounceRef.current = setTimeout(async () => {
      setInlineLoading(true);
      try {
        const res = await fetch(`/api/bots/${inlineBotState.botId}/inline`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: inlineBotState.query }),
        });
        if (res.ok) {
          const data = await res.json();
          setInlineResults(data.results ?? []);
        }
      } catch {
        setInlineResults([]);
      } finally {
        setInlineLoading(false);
      }
    }, 300);
    return () => {
      if (inlineDebounceRef.current) clearTimeout(inlineDebounceRef.current);
    };
  }, [inlineBotState]);

  const insertInlineResult = React.useCallback(
    (content: string) => {
      const before = value.slice(0, inlineBotState.start);
      const afterCursor = value.slice(inlineBotState.start + 1 + inlineBotState.botUsername.length + 1 + inlineBotState.query.length);
      const next = before + content + afterCursor;
      handleValueChange(next);
      setInlineBotState({ active: false, botId: "", botUsername: "", query: "", start: 0 });
      setInlineResults([]);
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) {
          const pos = before.length + content.length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      });
    },
    [value, inlineBotState, handleValueChange],
  );

  const mentionCandidates = React.useMemo(() => {
    if (!mentionState.active) return [];
    const q = mentionState.query.toLowerCase();
    return participants
      .filter((p) => {
        if (!q) return true;
        return (
          p.username.toLowerCase().startsWith(q) ||
          p.displayName.toLowerCase().startsWith(q)
        );
      })
      .slice(0, 6);
  }, [mentionState, participants]);

  const insertMention = React.useCallback(
    (user: { id: string; username: string; displayName: string }) => {
      const before = value.slice(0, mentionState.start);
      const afterCursor = value.slice(mentionState.start + 1 + mentionState.query.length);
      const replacement = `@${user.username} `;
      const next = before + replacement + afterCursor;
      handleValueChange(next);
      setSelectedMentions((prev) =>
        prev.includes(user.id) ? prev : [...prev, user.id],
      );
      setMentionState({ active: false, query: "", start: 0 });
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) {
          const pos = before.length + replacement.length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
        }
      });
    },
    [value, mentionState, handleValueChange],
  );

  // Sync selectedMentions with current text on @ removal
  React.useEffect(() => {
    if (selectedMentions.length === 0) return;
    const present = selectedMentions.filter((id) => {
      const user = participants.find((p) => p.id === id);
      if (!user) return true;
      return value.includes(`@${user.username}`);
    });
    if (present.length !== selectedMentions.length) {
      setSelectedMentions(present);
    }
  }, [value, participants, selectedMentions]);

  const canSend =
    !disabled && !isUploading && (value.trim().length > 0 || attachments.length > 0);

  // Cleanup preview URLs
  React.useEffect(() => {
    return () => {
      attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = React.useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const next: PendingAttachment[] = list.map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        progress: -1,
      };
    });
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const inferKind = (file: File): SendAttachment["type"] => {
    if (file.type.startsWith("image/")) return "IMAGE";
    if (file.type.startsWith("video/")) return "VIDEO";
    if (file.type === "audio/webm" || file.type === "audio/ogg") return "VOICE";
    if (file.type.startsWith("audio/")) return "AUDIO";
    return "FILE";
  };

  const updateProgress = React.useCallback((id: string, progress: number) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, progress } : a)),
    );
  }, []);

  const uploadOne = React.useCallback(
    async (att: PendingAttachment): Promise<SendAttachment> => {
      return new Promise<SendAttachment>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/uploads", true);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateProgress(att.id, pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as {
                url: string;
                fileName: string;
                fileSize: number;
                mimeType: string;
                type: SendAttachment["type"];
              };
              resolve({
                type: data.type ?? inferKind(att.file),
                url: data.url,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
              });
            } catch (err) {
              reject(err instanceof Error ? err : new Error("invalid_response"));
            }
          } else {
            reject(new Error(`upload_failed_${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("network_error"));
        xhr.onabort = () => reject(new Error("aborted"));
        const fd = new FormData();
        fd.append("file", att.file);
        xhr.send(fd);
      });
    },
    [updateProgress],
  );

  const handleSend = React.useCallback(async () => {
    if (!canSend) return;
    const text = value.trim();
    setValue("");
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }
    setIsUploading(true);
    try {
      const uploaded: SendAttachment[] = [];
      for (const att of attachments) {
        try {
          uploaded.push(await uploadOne(att));
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
      // Очищаем превью
      attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      setAttachments([]);
      // Encrypt text for secret chats
      let finalText = text;
      if (isSecretChat && chatId && text) {
        try {
          const { encryptForChat, hasSharedKey } = await import("@/lib/e2ee-store");
          if (hasSharedKey(chatId)) {
            finalText = await encryptForChat(chatId, text);
          }
        } catch {
          // If encryption fails, send plaintext (should not happen)
        }
      }
      // Wrap in spoiler delimiters if spoiler mode is on
      if (spoilerMode && finalText && !finalText.startsWith("||")) {
        finalText = `||${finalText}||`;
      }

      await onSend(finalText, uploaded, {
        replyToId: replyTo?.id,
        mentions: selectedMentions.length > 0 ? selectedMentions : undefined,
        ttlSeconds: ttlSeconds ?? undefined,
        keyboard: keyboardRows.length > 0 ? keyboardRows : undefined,
        scheduledFor: scheduledFor ?? undefined,
        isSilent: isSilent || undefined,
        isViewOnce: viewOnce || undefined,
      });
      setSelectedMentions([]);
      setTtlSeconds(defaultTtlSeconds ?? null);
      setKeyboardRows([]);
      setScheduledFor(null);
      setKeyboardBuilderOpen(false);
      setViewOnce(false);
      setSpoilerMode(false);
    } finally {
      setIsUploading(false);
      taRef.current?.focus();
    }
  }, [canSend, value, attachments, onSend, replyTo?.id, selectedMentions, ttlSeconds, defaultTtlSeconds, spoilerMode, isSilent, viewOnce, keyboardRows, scheduledFor]);

  const shareLocation = React.useCallback(async (minutes?: number) => {
    if (disabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      window.alert("Геолокация не поддерживается");
      return;
    }
    try {
      setIsUploading(true);
      setLocationMenuOpen(false);
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      // Опциональный reverse-geocode через Nominatim (OSM, бесплатно, без ключа)
      let placeName: string | undefined;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`,
          { headers: { "User-Agent": "nextx/1.0" } },
        );
        if (r.ok) {
          const j = (await r.json()) as { display_name?: string };
          if (j.display_name) {
            placeName = j.display_name.split(",").slice(0, 2).join(",").trim();
          }
        }
      } catch {
        // ignore
      }
      await onSend(
        `${lat.toFixed(6)},${lng.toFixed(6)}`,
        [],
        {
          replyToId: replyTo?.id,
          mentions: selectedMentions.length > 0 ? selectedMentions : undefined,
          ttlSeconds: ttlSeconds ?? undefined,
          location: {
            lat,
            lng,
            placeName,
            liveLocationMinutes: minutes ?? undefined,
          },
        },
      );
      setSelectedMentions([]);
      setTtlSeconds(defaultTtlSeconds ?? null);
    } catch (err) {
      console.error("Geolocation failed:", err);
      window.alert("Не удалось получить геопозицию");
    } finally {
      setIsUploading(false);
      taRef.current?.focus();
    }
  }, [disabled, onSend, replyTo?.id, selectedMentions, ttlSeconds, defaultTtlSeconds]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && mentionCandidates.length > 0) {
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertMention(mentionCandidates[0]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ============================================================
  // Voice recording
  // ============================================================
  const startRecording = React.useCallback(async () => {
    setRecordingError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setRecordingError("Микрофон не поддерживается");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // Setup analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setRecordingAnalyser(analyser);
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Cleanup tracks
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        // Остановить распознавание речи, если было запущено
        if (speech.isListening) speech.stop();
        const transcript = speech.transcript.trim();
        const chunks = recordingChunksRef.current;
        const usedMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: usedMime });
        const ext = usedMime.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: usedMime,
        });
        recordingChunksRef.current = [];
        // Upload + send
        setIsUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/uploads", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          if (!res.ok) throw new Error(`upload_failed_${res.status}`);
          const data = (await res.json()) as {
            url: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
            type: "VOICE";
          };
          // Текст расшифровки идёт в content (caption-style), как в Telegram
          await onSend(transcript, [
            {
              type: "VOICE",
              url: data.url,
              fileName: data.fileName,
              fileSize: data.fileSize,
              mimeType: data.mimeType,
            },
          ]);
          speech.reset();
          setVoiceTranscript("");
        } catch (err) {
          console.error("Voice upload failed:", err);
          setRecordingError("Не удалось отправить");
        } finally {
          setIsUploading(false);
        }
      };
      recorder.start();
      recordingStartRef.current = Date.now();
      setRecordingTime(0);
      setIsRecording(true);
      // Запустить распознавание речи, если поддерживается
      if (speech.isSupported) {
        speech.reset();
        try { speech.start(); } catch { /* permission denied etc. */ }
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 250);
    } catch (err) {
      console.error("getUserMedia failed:", err);
      setRecordingError("Нет доступа к микрофону");
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [onSend, speech]);

  // Waveform canvas animation during recording
  React.useEffect(() => {
    if (!recordingAnalyser || !recordingCanvasRef.current || !isRecording) return;
    const canvas = recordingCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = recordingAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      recordingAnimRef.current = requestAnimationFrame(draw);
      recordingAnalyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const y = (canvas.height - barHeight) / 2;
        ctx.fillStyle = "hsl(0, 80%, 55%)";
        ctx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + 1;
        if (x > canvas.width) break;
      }
    };
    draw();
    return () => cancelAnimationFrame(recordingAnimRef.current);
  }, [recordingAnalyser, isRecording]);

  const stopAndSendRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    recorder.stop();
  }, []);

  const cancelRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      // Подменяем onstop, чтобы не отправлять
      const origOnStop = recorder.onstop;
      recorder.onstop = () => {
        origOnStop;
        // ничего не делаем
      };
      recorder.stop();
    }
    recordingChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const handleStickerSelect = React.useCallback(
    async (sticker: { url: string; stickerId: string }) => {
      setStickerPickerOpen(false);
      await onSend("", [
        {
          type: "STICKER",
          url: sticker.url,
          fileName: `sticker-${sticker.stickerId}`,
          fileSize: 0,
          mimeType: "image/png",
        },
      ]);
    },
    [onSend],
  );

  // Autosize 1..6 строк
  React.useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  // Drag & drop
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // Paste image
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col border-t border-border bg-background px-3 pt-2",
        isDragging && "ring-2 ring-primary ring-inset",
        className,
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <AttachmentChip
              key={att.id}
              att={att}
              onRemove={() => removeAttachment(att.id)}
            />
          ))}
        </div>
      )}

      {replyTo && (
        <div className="mb-1.5 flex items-stretch gap-2 overflow-hidden rounded-lg border-l-2 border-primary bg-foreground/[0.04] px-2 py-1.5">
          <CornerUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-primary">
              {replyTo.sender.displayName}
            </div>
            <div className="truncate text-[12.5px] text-foreground/70">
              {replyTo.content
                ? replyTo.content
                : replyTo.type === "IMAGE"
                  ? "📷 Фото"
                  : replyTo.type === "VIDEO"
                    ? "🎥 Видео"
                    : replyTo.type === "AUDIO"
                      ? "🎵 Аудио"
                      : replyTo.type === "VOICE"
                        ? "🎤 Голосовое"
                        : replyTo.type === "FILE"
                          ? `📎 ${replyTo.fileName ?? "Файл"}`
                          : ""}
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Отменить ответ"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/10 text-sm font-medium text-primary">
          Перетащите файлы сюда
        </div>
      )}

      {inlineBotState.active && inlineResults.length > 0 && (
        <InlineBotResults
          results={inlineResults}
          onSelect={insertInlineResult}
          onClose={() => {
            setInlineBotState({ active: false, botId: "", botUsername: "", query: "", start: 0 });
            setInlineResults([]);
          }}
        />
      )}

      {stickerPanelOpen && (
        <StickerPanel
          onClose={() => setStickerPanelOpen(false)}
          onSelectSticker={handleStickerSelect}
        />
      )}

      <GifPanel
        open={gifPanelOpen}
        onSelect={async (url: string) => {
          setGifPanelOpen(false);
          setIsUploading(true);
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], `gif-${Date.now()}.gif`, { type: "image/gif" });
            const fd = new FormData();
            fd.append("file", file);
            const uploadRes = await fetch("/api/uploads", {
              method: "POST",
              body: fd,
              credentials: "include",
            });
            if (uploadRes.ok) {
              const data = await uploadRes.json();
              await onSend("", [
                {
                  type: "IMAGE",
                  url: data.url,
                  fileName: data.fileName,
                  fileSize: data.fileSize,
                  mimeType: data.mimeType,
                },
              ]);
            }
          } catch {
            // ignore
          } finally {
            setIsUploading(false);
          }
        }}
        onClose={() => setGifPanelOpen(false)}
      />

      {recordingError && (
        <div className="mb-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[12px] text-destructive">
          {recordingError}
          <button
            type="button"
            onClick={() => setRecordingError(null)}
            className="ml-2 text-destructive/70 hover:text-destructive"
            aria-label="Закрыть"
          >
            <X className="inline h-3 w-3" />
          </button>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={cancelRecording}
            aria-label="Отменить запись"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-destructive/10 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
              <span className="text-[13px] font-medium tabular-nums text-destructive">
                {formatRecordingTime(recordingTime)}
              </span>
              <span className="ml-auto text-[12px] text-muted-foreground">
                {speech.isSupported ? "Запись + расшифровка" : "Запись…"}
              </span>
            </div>
            <canvas ref={recordingCanvasRef} width={200} height={32} className="h-8 w-full" />
            {speech.isSupported && speech.transcript && (
              <p className="max-h-12 overflow-y-auto text-[12px] italic text-muted-foreground">
                {speech.transcript}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={stopAndSendRecording}
            aria-label="Отправить голосовое"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:brightness-110"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-end gap-2 pb-2">
        {mentionState.active && mentionCandidates.length > 0 && (
          <div className="pointer-events-auto absolute bottom-full left-12 right-12 z-40 mb-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
            <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Упоминание
            </div>
            {mentionCandidates.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(u)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    u.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{u.displayName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    @{u.username}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiPickerOpen((v) => !v)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Эмодзи"
          >
            <Smile className="h-5 w-5" />
          </button>
          <EmojiPicker
            open={emojiPickerOpen}
            onSelect={(emoji) => {
              setEmojiPickerOpen(false);
              const ta = taRef.current;
              if (ta) {
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const newValue = value.slice(0, start) + emoji + value.slice(end);
                setValue(newValue);
                setTimeout(() => {
                  ta.selectionStart = ta.selectionEnd = start + emoji.length;
                  ta.focus();
                }, 0);
              } else {
                setValue((t) => t + emoji);
              }
            }}
            onClose={() => setEmojiPickerOpen(false)}
            className="bottom-full mb-2 left-0"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setStickerPanelOpen((v) => !v)}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
              stickerPanelOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-label="Стикеры"
            title="Стикеры"
          >
            <StickerIcon className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setGifPanelOpen((v) => !v)}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
            gifPanelOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-label="GIF"
          title="GIF"
        >
          GIF
        </button>

        {/* Keyboard builder panel */}
        {keyboardBuilderOpen && (
          <KeyboardBuilder
            rows={keyboardRows}
            onChange={setKeyboardRows}
          />
        )}

        <div className="flex flex-1 items-end rounded-2xl bg-secondary px-3 py-1.5">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              handleValueChange(e.target.value);
              onTyping?.();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={placeholder}
            className={cn(
              "flex w-full resize-none border-0 bg-transparent text-[14.5px] leading-relaxed",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-40",
            )}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Прикрепить файл"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setClipboardOpen((v) => !v)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="История буфера обмена"
            title="Буфер обмена"
          >
            <Clipboard className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setLocationMenuOpen((v) => !v)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Поделиться геопозицией"
            title="Геопозиция"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setContactPickerOpen(true)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Отправить контакт"
            title="Контакт"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setKeyboardBuilderOpen((o) => !o)}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
              keyboardBuilderOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-label="Inline-кнопки"
            title="Inline-кнопки"
          >
            <Rows className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSilent((v) => !v)}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
              isSilent
                ? "bg-amber-500/10 text-amber-600"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-label="Тихая отправка"
            title={isSilent ? "Тихое сообщение включено" : "Тихая отправка"}
          >
            <BellOff className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSpoilerMode((v) => !v)}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
              spoilerMode
                ? "bg-purple-500/10 text-purple-600"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-label="Спойлер"
            title={spoilerMode ? "Режим спойлера включён" : "Скрыть текст как спойлер"}
          >
            <EyeOff className="h-4 w-4" />
          </button>
          {attachments.length > 0 && (
            <button
              type="button"
              onClick={() => setViewOnce((v) => !v)}
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                viewOnce
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-label="Одноразовое медиа"
              title={viewOnce ? "Одноразовое фото/видео включено" : "Сделать одноразовым"}
            >
              {viewOnce ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        <SchedulePicker
          scheduledFor={scheduledFor}
          onSchedule={setScheduledFor}
        />

        {chatId && (
          <button
            type="button"
            onClick={() => setVideoCircleOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Видео-круг"
            title="Видео-круг"
          >
            <CircleDot className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (canSend) {
              void handleSend();
            } else {
              void startRecording();
            }
          }}
          disabled={isUploading}
          aria-label={canSend ? "Отправить" : "Записать голосовое"}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
            canSend
              ? "bg-primary text-primary-foreground hover:brightness-110"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {canSend ? (
            <Send className="h-4 w-4" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
        </div>
      )}
      <ClipboardHistory
        open={clipboardOpen}
        onClose={() => setClipboardOpen(false)}
        onSelect={(text) => {
          handleValueChange(value ? value + " " + text : text);
          taRef.current?.focus();
        }}
      />
      {locationMenuOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
          onClick={() => setLocationMenuOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Поделиться местоположением</h3>
              <button
                type="button"
                onClick={() => setLocationMenuOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={() => void shareLocation()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Отправить текущее местоположение</div>
                  <div className="text-[11px] text-muted-foreground">Статичная точка на карте</div>
                </div>
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => setLiveLocationMinutes(15)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                </span>
                <div className="text-left">
                  <div className="font-medium">Поделиться местоположением в реальном времени</div>
                  <div className="text-[11px] text-muted-foreground">Другие увидят ваше перемещение</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {liveLocationMinutes !== null && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
          onClick={() => setLiveLocationMinutes(null)}
        >
          <div
            className="mx-4 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Время обновления</h3>
              <button
                type="button"
                onClick={() => setLiveLocationMinutes(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              {[
                { label: "15 минут", value: 15 },
                { label: "1 час", value: 60 },
                { label: "8 часов", value: 480 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setLiveLocationMinutes(null);
                    void shareLocation(opt.value);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {chatId && (
        <VideoCircleRecorder
          open={videoCircleOpen}
          onClose={() => setVideoCircleOpen(false)}
          onSent={() => onSend("", [])}
          chatId={chatId}
        />
      )}
      <ContactPickerModal
        open={contactPickerOpen}
        onClose={() => setContactPickerOpen(false)}
        onSelect={async (contact) => {
          setContactPickerOpen(false);
          setIsUploading(true);
          try {
            await onSend("", [], {
              contact: {
                userId: contact.id,
                displayName: contact.displayName,
                username: contact.username,
                avatarUrl: contact.avatarUrl,
              },
            });
          } finally {
            setIsUploading(false);
          }
        }}
      />
    </div>
  );
}

function AttachmentChip({
  att,
  onRemove,
}: {
  att: PendingAttachment;
  onRemove: () => void;
}) {
  const { file, previewUrl, progress } = att;
  const isImage = file.type.startsWith("image/");
  const isUploading = progress >= 0 && progress < 100;
  const Icon = isImage
    ? ImageIcon
    : file.type.startsWith("video/")
      ? Film
      : file.type.startsWith("audio/")
        ? Music
        : FileText;
  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 pr-7">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-9 w-9 rounded object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="max-w-[160px] truncate text-xs font-medium">
          {file.name}
        </div>
        <div className="text-[10.5px] text-muted-foreground">
          {isUploading
            ? `Загрузка… ${progress}%`
            : att.error
              ? `Ошибка: ${att.error}`
              : formatSize(file.size)}
        </div>
        {isUploading && (
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Удалить"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRecordingTime(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

type KeyboardButton = { text: string; url?: string; callback_data?: string };

function KeyboardBuilder({
  rows,
  onChange,
}: {
  rows: KeyboardButton[][];
  onChange: (rows: KeyboardButton[][]) => void;
}) {
  const [newButtonText, setNewButtonText] = React.useState("");
  const [newButtonUrl, setNewButtonUrl] = React.useState("");
  const [editingRow, setEditingRow] = React.useState<number | null>(null);

  const addRow = () => {
    if (!newButtonText.trim()) return;
    const btn: KeyboardButton = { text: newButtonText.trim() };
    if (newButtonUrl.trim()) btn.url = newButtonUrl.trim();
    else btn.callback_data = newButtonText.trim().toLowerCase().replace(/\s+/g, "_");
    const next = [...rows, [btn]];
    onChange(next);
    setNewButtonText("");
    setNewButtonUrl("");
  };

  const addSiblingButton = (rowIdx: number) => {
    if (!newButtonText.trim()) return;
    const btn: KeyboardButton = { text: newButtonText.trim() };
    if (newButtonUrl.trim()) btn.url = newButtonUrl.trim();
    else btn.callback_data = newButtonText.trim().toLowerCase().replace(/\s+/g, "_");
    const next = rows.map((r, i) => (i === rowIdx ? [...r, btn] : r));
    onChange(next);
    setNewButtonText("");
    setNewButtonUrl("");
  };

  const removeButton = (rowIdx: number, btnIdx: number) => {
    const next = rows
      .map((r, i) => (i === rowIdx ? r.filter((_, bi) => bi !== btnIdx) : r))
      .filter((r) => r.length > 0);
    onChange(next);
    setEditingRow(null);
  };

  return (
    <div className="mb-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Inline-кнопки</p>
      {rows.map((row, ri) => (
        <div key={ri} className="mb-1.5 flex flex-wrap gap-1">
          {row.map((btn, bi) => (
            <span
              key={bi}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
            >
              {btn.text}
              {btn.url && <span className="text-muted-foreground">(link)</span>}
              <button
                type="button"
                onClick={() => removeButton(ri, bi)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setEditingRow(ri)}
            className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            + кнопка
          </button>
        </div>
      ))}
      {/* Add new row or sibling button */}
      <div className="flex flex-col gap-1.5 border-t border-border pt-2">
        <input
          type="text"
          value={newButtonText}
          onChange={(e) => setNewButtonText(e.target.value)}
          placeholder="Текст кнопки"
          maxLength={64}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (editingRow !== null) addSiblingButton(editingRow);
              else addRow();
            }
          }}
          className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-sm outline-none focus:border-primary"
        />
        <input
          type="url"
          value={newButtonUrl}
          onChange={(e) => setNewButtonUrl(e.target.value)}
          placeholder="URL (необязательно)"
          maxLength={200}
          className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (editingRow !== null) addSiblingButton(editingRow);
              else addRow();
            }}
            disabled={!newButtonText.trim()}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            {editingRow !== null ? "Добавить в ряд" : "Добавить ряд"}
          </button>
          {editingRow !== null && (
            <button
              type="button"
              onClick={() => setEditingRow(null)}
              className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Новый ряд
            </button>
          )}
        </div>
      </div>
      {rows.length > 0 && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {rows.length} {rows.length === 1 ? "ряд" : "рядов"} ·{" "}
          {rows.reduce((sum, r) => sum + r.length, 0)} кнопок
        </p>
      )}
    </div>
  );
}
