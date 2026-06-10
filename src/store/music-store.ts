import { create } from "zustand";

export interface MusicTrackData {
  id: string;
  title: string;
  artist: string | null;
  fileId: string;
  duration: number | null;
  coverId: string | null;
  user?: { id: string; username: string; displayName: string };
}

interface MusicState {
  currentTrack: MusicTrackData | null;
  queue: MusicTrackData[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  playlistOpen: boolean;
  setCurrentTrack: (track: MusicTrackData | null) => void;
  setQueue: (tracks: MusicTrackData[], startIndex?: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  togglePlaylist: () => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  playlistOpen: false,
  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: !!track }),
  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      queueIndex: startIndex,
      currentTrack: tracks[startIndex] ?? null,
      isPlaying: true,
      currentTime: 0,
    }),
  nextTrack: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < queue.length - 1) {
      set({
        queueIndex: queueIndex + 1,
        currentTrack: queue[queueIndex + 1],
        isPlaying: true,
        currentTime: 0,
      });
    }
  },
  prevTrack: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    if (queueIndex > 0) {
      set({
        queueIndex: queueIndex - 1,
        currentTrack: queue[queueIndex - 1],
        isPlaying: true,
        currentTime: 0,
      });
    }
  },
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setCurrentTime: (time) => set({ currentTime: time }),
  togglePlaylist: () => set((s) => ({ playlistOpen: !s.playlistOpen })),
}));
