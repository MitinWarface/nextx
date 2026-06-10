"use client";

import * as React from "react";
import {
  RoomEvent,
  Track,
  type Room,
  type TrackPublication,
  type Participant,
} from "livekit-client";

export function LivekitParticipantVideo({
  participant,
  name,
  isLocal = false,
  kind = "VIDEO",
}: {
  participant: Participant;
  name: string;
  isLocal?: boolean;
  kind?: "AUDIO" | "VIDEO";
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [videoTrack, setVideoTrack] = React.useState<TrackPublication | null>(null);
  const [audioTrack, setAudioTrack] = React.useState<TrackPublication | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);

  React.useEffect(() => {
    const sync = () => {
      const vt = participant.getTrackPublication(Track.Source.Camera);
      const at = participant.getTrackPublication(Track.Source.Microphone);
      setVideoTrack(vt ?? null);
      setAudioTrack(at ?? null);
      setIsMuted(!at || at.isMuted);
    };

    sync();
    const onPub = () => sync();
    const onUnpub = () => sync();
    participant.on("trackPublished" as any, onPub);
    participant.on("trackUnpublished" as any, onUnpub);
    participant.on("trackMuted" as any, onPub);
    participant.on("trackUnmuted" as any, onPub);

    return () => {
      participant.off("trackPublished" as any, onPub);
      participant.off("trackUnpublished" as any, onUnpub);
      participant.off("trackMuted" as any, onPub);
      participant.off("trackUnmuted" as any, onPub);
    };
  }, [participant]);

  React.useEffect(() => {
    if (kind === "VIDEO" && videoRef.current && videoTrack?.track) {
      videoTrack.track.attach(videoRef.current);
      return () => {
        videoTrack.track?.detach(videoRef.current!);
      };
    }
  }, [videoTrack, kind]);

  React.useEffect(() => {
    if (audioRef.current && audioTrack?.track) {
      audioTrack.track.attach(audioRef.current);
      return () => {
        audioTrack.track?.detach(audioRef.current!);
      };
    }
  }, [audioTrack]);

  if (kind === "AUDIO") {
    return <audio ref={audioRef} autoPlay playsInline muted={isLocal} />;
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="h-full w-full object-cover"
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[11px] text-white">
        {name}
      </div>
      {isMuted && (
        <div className="absolute right-2 top-2 rounded-full bg-red-500/80 p-1">
          <MicOffIcon />
        </div>
      )}
    </div>
  );
}

function MicOffIcon() {
  return (
    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .5-.04 1-.11 1.46" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function LivekitRoomGrid({
  room,
  localName,
}: {
  room: Room;
  localName: string;
}) {
  const [participants, setParticipants] = React.useState<Participant[]>([]);

  React.useEffect(() => {
    const sync = () => {
      const list: Participant[] = [];
      if (room.localParticipant) {
        list.push(room.localParticipant);
      }
      room.remoteParticipants.forEach((p) => list.push(p));
      setParticipants(list);
    };

    sync();
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    room.on(RoomEvent.Connected, sync);
    room.on(RoomEvent.Disconnected, sync);

    return () => {
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
      room.off(RoomEvent.Connected, sync);
      room.off(RoomEvent.Disconnected, sync);
    };
  }, [room]);

  const cols = participants.length <= 2 ? 1 : participants.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-2 p-4"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {participants.map((p) => (
        <LivekitParticipantVideo
          key={p.identity}
          participant={p}
          name={p.identity === room.localParticipant?.identity ? localName : (p.name || p.identity)}
          isLocal={p.identity === room.localParticipant?.identity}
          kind="VIDEO"
        />
      ))}
    </div>
  );
}
