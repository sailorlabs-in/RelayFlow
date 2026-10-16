import React, { useEffect, useRef } from 'react';

export interface VoiceParticipantMediaProps {
  stream: MediaStream | null;
  isMe: boolean;
  showCameraFeed: boolean;
}

export const VoiceParticipantMedia: React.FC<VoiceParticipantMediaProps> = ({
  stream,
  isMe,
  showCameraFeed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTrackId = stream?.getVideoTracks()[0]?.id;

  useEffect(() => {
    if (videoRef.current && stream) {
      const hasVideo = stream.getVideoTracks().length > 0;
      if (hasVideo && (showCameraFeed || !isMe)) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, videoTrackId, showCameraFeed, isMe]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0;

  if (!hasVideoTrack || (!showCameraFeed && isMe)) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMe}
      className="absolute inset-0 w-full h-full object-cover bg-black"
    />
  );
};

export interface BackgroundAudioPlayerProps {
  stream: MediaStream | null;
  volume: number;
  isSelfDeafened: boolean;
}

export const BackgroundAudioPlayer: React.FC<BackgroundAudioPlayerProps> = ({
  stream,
  volume,
  isSelfDeafened,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isSelfDeafened ? 0 : volume;
    }
  }, [volume, isSelfDeafened]);

  return (
    <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
  );
};

export interface FocusVideoProps {
  stream: MediaStream | null;
  isMe: boolean;
}

export const FocusVideo: React.FC<FocusVideoProps> = ({ stream, isMe }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMe}
      className="w-full h-full object-contain bg-black"
    />
  );
};
