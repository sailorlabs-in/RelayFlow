import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useAppDispatch } from '../store';
import {
  localSetSelfVoiceChannel,
  setActiveChannel,
} from '../store/slices/groupsSlice';
import { setActiveConversation } from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import { Avatar } from './Avatar';
import { showToast } from './toast';

interface VoiceDashboardProps {
  groupId: string;
  channel: {
    id: string;
    name: string;
  };
  voiceStates: Record<
    string,
    {
      userId: string;
      groupId: string;
      channelId: string;
      isMuted: boolean;
      isDeafened: boolean;
    }
  >;
  groupMembers: any[];
  currentUser: any;
  isViewed?: boolean;
}

interface VoiceParticipantMediaProps {
  stream: MediaStream | null;
  isMe: boolean;
  showCameraFeed: boolean;
}

const VoiceParticipantMedia = ({
  stream,
  isMe,
  showCameraFeed,
}: VoiceParticipantMediaProps): React.JSX.Element => {
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

  return (
    <>
      {hasVideoTrack && (showCameraFeed || !isMe) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
      ) : null}
    </>
  );
};

interface BackgroundAudioPlayerProps {
  stream: MediaStream | null;
  volume: number;
  isSelfDeafened: boolean;
}

const BackgroundAudioPlayer = ({
  stream,
  volume,
  isSelfDeafened,
}: BackgroundAudioPlayerProps): React.JSX.Element => {
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

/* ─── SVG Icon Helpers ─── */
const IconMic = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
  </svg>
);
const IconMicOff = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconHeadphones = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
  </svg>
);
const IconHeadphonesOff = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconCamera = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconScreen = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-[18px] h-[18px]"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <polyline points="8 21 12 17 16 21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const IconDisconnect = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className="w-[18px] h-[18px]"
  >
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-5.33-5.34A19.79 19.79 0 0 1 2 3.18 2 2 0 0 1 4 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 8.91c1.07 1.27 2.2 2.4 3.47 3.47z" />
    <line
      x1="1"
      y1="1"
      x2="23"
      y2="23"
      stroke="currentColor"
      strokeWidth="2.5"
    />
  </svg>
);
const IconExpand = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-3.5 h-3.5"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ─── Control Button with Tooltip ─── */
const CtrlBtn = ({
  label,
  onClick,
  variant,
  children,
}: {
  label: string;
  onClick: () => void;
  variant: 'off' | 'on' | 'muted' | 'screen-on' | 'disconnect';
  children: React.ReactNode;
}) => {
  const base =
    'voice-ctrl-btn relative flex items-center justify-center border-none cursor-pointer shrink-0 transition-all duration-150';
  const variants: Record<string, string> = {
    off: 'w-[42px] h-[42px] rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)]',
    on: 'w-[42px] h-[42px] rounded-xl bg-[var(--accent-primary)] text-white shadow-[0_2px_10px_rgba(56,189,248,0.35)]',
    muted:
      'w-[42px] h-[42px] rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]',
    'screen-on':
      'w-[42px] h-[42px] rounded-xl bg-[#43b581] text-white shadow-[0_2px_10px_rgba(67,181,129,0.35)] hover:bg-[#3ca374]',
    disconnect:
      'w-[50px] h-[42px] rounded-3xl bg-[var(--danger)] text-white hover:bg-red-600 hover:shadow-[0_2px_14px_rgba(239,68,68,0.4)]',
  };

  return (
    <button
      title={label}
      onClick={onClick}
      className={`${base} ${variants[variant]} active:scale-[0.92]`}
    >
      {children}
      <span className="voice-ctrl-tooltip absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 scale-[0.92] px-2.5 py-1.5 rounded-md bg-[#111] text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none opacity-0 transition-all duration-150 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        {label}
      </span>
    </button>
  );
};

export const VoiceDashboard = ({
  groupId: _groupId,
  channel,
  voiceStates,
  groupMembers,
  currentUser,
  isViewed = false,
}: VoiceDashboardProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  // Portal target state and effect
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Volume states
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});
  const [micVolume, setMicVolume] = useState<number>(1.0);

  // Web Audio and raw capture stream refs for local mic gain
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const rawLocalStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isViewed) {
      const el = document.getElementById('voice-dashboard-portal-container');
      if (el) {
        setPortalTarget(el);
      } else {
        const interval = setInterval(() => {
          const element = document.getElementById(
            'voice-dashboard-portal-container',
          );
          if (element) {
            setPortalTarget(element);
            clearInterval(interval);
          }
        }, 50);
        return () => clearInterval(interval);
      }
    } else {
      setPortalTarget(null);
    }
    return undefined;
  }, [isViewed, channel.id]);

  // Find all users in this channel
  const channelVoiceStates = Object.values(voiceStates || {}).filter(
    (vs) => vs.channelId === channel.id,
  );

  // Local mock states for video/screen share
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Speaking status state: maps userId -> boolean
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>(
    {},
  );

  // Self voice state from Redux
  const selfVoiceState = currentUser ? voiceStates[currentUser.id] : null;
  const isSelfMuted = selfVoiceState?.isMuted || false;
  const isSelfDeafened = selfVoiceState?.isDeafened || false;

  // ── Focus View State ──
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  // WebRTC Refs & State
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(
    null,
  );
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const candidatesQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const closePeerConnection = (userId: string) => {
    const pc = peersRef.current[userId];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      delete peersRef.current[userId];
    }
    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
    delete candidatesQueueRef.current[userId];
  };

  const processQueuedCandidates = async (userId: string) => {
    const pc = peersRef.current[userId];
    if (!pc) {
      return;
    }
    const queue = candidatesQueueRef.current[userId] || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding queued ICE candidate:', err);
        }
      }
    }
  };

  const initiatePeerConnection = (
    targetUserId: string,
    isInitiator: boolean,
  ) => {
    if (peersRef.current[targetUserId]) {
      return peersRef.current[targetUserId];
    }

    console.log(
      `🎙 WebRTC: Initiating connection with ${targetUserId} (initiator: ${isInitiator})`,
    );

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    peersRef.current[targetUserId] = pc;

    // Add local stream tracks to this peer
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketManager.sendVoiceSignal(targetUserId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = () => {
      console.log(`🎙 WebRTC: Received remote track from ${targetUserId}`);
      const newStream = new MediaStream();
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track) {
          newStream.addTrack(receiver.track);
        }
      });
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: newStream,
      }));
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        closePeerConnection(targetUserId);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          console.log(`🎙 WebRTC: Creating offer for ${targetUserId}`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketManager.sendVoiceSignal(targetUserId, {
            type: 'offer',
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error('Negotiation offer error:', err);
        }
      };
    }

    return pc;
  };

  const renegotiate = async (targetUserId: string) => {
    const pc = peersRef.current[targetUserId];
    if (!pc) {
      return;
    }
    try {
      console.log(`🎙 WebRTC: Renegotiating connection with ${targetUserId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketManager.sendVoiceSignal(targetUserId, {
        type: 'offer',
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('Renegotiate offer error:', err);
    }
  };

  const handleVoiceSignal = async (e: Event) => {
    const { senderUserId, signal } = (e as CustomEvent).detail;
    if (senderUserId === currentUser?.id) {
      return;
    }

    let pc = peersRef.current[senderUserId];

    if (signal.type === 'offer') {
      if (!pc) {
        pc = initiatePeerConnection(senderUserId, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketManager.sendVoiceSignal(senderUserId, {
        type: 'answer',
        sdp: pc.localDescription,
      });
      processQueuedCandidates(senderUserId);
    } else if (signal.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        processQueuedCandidates(senderUserId);
      }
    } else if (signal.type === 'ice-candidate') {
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.warn('Error adding ICE candidate:', err);
          }
        } else {
          if (!candidatesQueueRef.current[senderUserId]) {
            candidatesQueueRef.current[senderUserId] = [];
          }
          candidatesQueueRef.current[senderUserId].push(signal.candidate);
        }
      }
    }
  };

  // Sync microphone volume state updates to the GainNode
  useEffect(() => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = micVolume;
    }
  }, [micVolume]);

  // Local media stream capture
  useEffect(() => {
    let active = true;

    const startLocalStream = async () => {
      try {
        console.log('🎙 WebRTC: Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        rawLocalStreamRef.current = stream;
        let processedStream = stream;

        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(stream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = micVolume;
            const destination = audioContext.createMediaStreamDestination();
            source.connect(gainNode);
            gainNode.connect(destination);

            micAudioContextRef.current = audioContext;
            micGainNodeRef.current = gainNode;
            processedStream = destination.stream;
          }
        } catch (e) {
          console.error('Failed to initialize Web Audio API for mic gain:', e);
        }

        localStreamRef.current = processedStream;
        setLocalStreamState(processedStream);

        // Ensure mic mute state matches redux initial state
        processedStream.getAudioTracks().forEach((track) => {
          track.enabled = !isSelfMuted;
        });

        // Connect to existing users in channel
        channelVoiceStates.forEach((vs) => {
          if (vs.userId !== currentUser?.id && !peersRef.current[vs.userId]) {
            const isInitiator = currentUser?.id < vs.userId;
            initiatePeerConnection(vs.userId, isInitiator);
          }
        });
      } catch (err) {
        console.error('Failed to get local stream:', err);
        showToast.error(
          'Could not access microphone. Please check permissions.',
        );
      }
    };

    startLocalStream();

    window.addEventListener('voice-signal', handleVoiceSignal);

    return () => {
      active = false;
      window.removeEventListener('voice-signal', handleVoiceSignal);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      if (rawLocalStreamRef.current) {
        rawLocalStreamRef.current.getTracks().forEach((t) => t.stop());
        rawLocalStreamRef.current = null;
      }

      if (micAudioContextRef.current) {
        micAudioContextRef.current.close().catch((err) => console.warn(err));
        micAudioContextRef.current = null;
        micGainNodeRef.current = null;
      }

      Object.keys(peersRef.current).forEach((uid) => {
        closePeerConnection(uid);
      });
    };
  }, [channel.id]);

  // Synchronize peer connections when participants list changes
  useEffect(() => {
    if (!localStreamRef.current) {
      return;
    }

    const currentMemberIds = channelVoiceStates.map((vs) => vs.userId);

    // Close connections for users who left
    Object.keys(peersRef.current).forEach((uid) => {
      if (!currentMemberIds.includes(uid)) {
        closePeerConnection(uid);
      }
    });

    // Establish connections to new users
    channelVoiceStates.forEach((vs) => {
      if (vs.userId !== currentUser?.id && !peersRef.current[vs.userId]) {
        const isInitiator = currentUser?.id < vs.userId;
        initiatePeerConnection(vs.userId, isInitiator);
      }
    });
  }, [channelVoiceStates, currentUser?.id]);

  // Handle local mute status changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isSelfMuted;
      });
    }
  }, [isSelfMuted]);

  // Real-time audio amplitude speaking detection
  useEffect(() => {
    if (!localStreamState) {
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const analysers: Record<string, AnalyserNode> = {};
    const sources: any[] = [];

    const setupAnalyser = (stream: MediaStream, userId: string) => {
      if (stream.getAudioTracks().length === 0) {
        return;
      }
      try {
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analysers[userId] = analyser;
        sources.push(source);
      } catch (err) {
        console.warn('Failed to setup audio analyser:', err);
      }
    };

    setupAnalyser(localStreamState, currentUser?.id);

    Object.entries(remoteStreams).forEach(([uid, stream]) => {
      setupAnalyser(stream, uid);
    });

    const dataArray = new Uint8Array(128);
    const interval = setInterval(() => {
      const newSpeaking: Record<string, boolean> = {};

      Object.entries(analysers).forEach(([uid, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        newSpeaking[uid] = average > 12;
      });

      setSpeakingUsers(newSpeaking);
    }, 150);

    return () => {
      clearInterval(interval);
      sources.forEach((s) => s.disconnect());
      audioContext.close();
    };
  }, [localStreamState, remoteStreams, currentUser?.id]);

  // ── Camera Toggle ──
  const handleToggleCamera = async () => {
    if (isCameraOn) {
      const videoTrack = localStreamRef.current
        ?.getVideoTracks()
        .find(
          (t) =>
            !t.label.includes('screen') &&
            !t.label.includes('monitor') &&
            t.kind === 'video',
        );
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current?.removeTrack(videoTrack);

        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track === videoTrack);
          if (sender) {
            pc.removeTrack(sender);
          }
        });

        Object.keys(peersRef.current).forEach((uid) => {
          renegotiate(uid);
        });
      }
      setIsCameraOn(false);
    } else {
      try {
        console.log('🎙 Requesting camera permission...');
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const cameraTrack = cameraStream.getVideoTracks()[0];

        const localStream = localStreamRef.current;
        if (localStream) {
          localStream.addTrack(cameraTrack);
          setLocalStreamState(new MediaStream(localStream.getTracks()));

          Object.values(peersRef.current).forEach((pc) => {
            pc.addTrack(cameraTrack, localStream);
          });

          Object.keys(peersRef.current).forEach((uid) => {
            renegotiate(uid);
          });
        }
        setIsCameraOn(true);
      } catch (err) {
        console.error('Failed to get camera media:', err);
        showToast.error('Could not access camera. Please check permissions.');
      }
    }
  };

  // ── Screen Share Toggle ──
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      const videoTrack = localStreamRef.current
        ?.getVideoTracks()
        .find(
          (t) =>
            t.label.includes('screen') ||
            t.label.includes('monitor') ||
            t.kind === 'video',
        );
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current?.removeTrack(videoTrack);

        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track === videoTrack);
          if (sender) {
            pc.removeTrack(sender);
          }
        });

        Object.keys(peersRef.current).forEach((uid) => {
          renegotiate(uid);
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        console.log('🎙 Requesting screen share permission...');
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        const localStream = localStreamRef.current;
        if (localStream) {
          localStream.addTrack(screenTrack);
          setLocalStreamState(new MediaStream(localStream.getTracks()));

          Object.values(peersRef.current).forEach((pc) => {
            pc.addTrack(screenTrack, localStream);
          });

          Object.keys(peersRef.current).forEach((uid) => {
            renegotiate(uid);
          });
        }

        screenTrack.onended = () => {
          if (localStreamRef.current) {
            localStreamRef.current.removeTrack(screenTrack);
            setLocalStreamState(
              new MediaStream(localStreamRef.current.getTracks()),
            );
          }
          Object.values(peersRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track === screenTrack);
            if (sender) {
              pc.removeTrack(sender);
            }
          });
          Object.keys(peersRef.current).forEach((uid) => {
            renegotiate(uid);
          });
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Failed to get screen media:', err);
      }
    }
  };

  const handleToggleMute = () => {
    if (!currentUser) {
      return;
    }
    const isMuted = !isSelfMuted;
    const isDeafened = isSelfDeafened;
    socketManager.updateVoiceState(isMuted, isDeafened);
  };

  const handleToggleDeafen = () => {
    if (!currentUser) {
      return;
    }
    const isDeafened = !isSelfDeafened;
    const isMuted = isDeafened ? true : isSelfMuted;
    socketManager.updateVoiceState(isMuted, isDeafened);
  };

  const handleDisconnectVoice = () => {
    dispatch(setActiveChannel(null));
    dispatch(setActiveConversation(null));
    dispatch(localSetSelfVoiceChannel(null));
    socketManager.leaveVoice();
  };

  // ── Determine who is streaming (has video tracks) ──
  const streamingUsers = useMemo(() => {
    const streaming: string[] = [];

    // Check if current user is streaming
    if (
      currentUser &&
      localStreamState &&
      localStreamState.getVideoTracks().length > 0 &&
      (isCameraOn || isScreenSharing)
    ) {
      streaming.push(currentUser.id);
    }

    // Check remote streams for video
    Object.entries(remoteStreams).forEach(([uid, stream]) => {
      if (stream.getVideoTracks().length > 0) {
        streaming.push(uid);
      }
    });

    return streaming;
  }, [
    localStreamState,
    remoteStreams,
    currentUser,
    isCameraOn,
    isScreenSharing,
  ]);

  const hasAnyStreaming = streamingUsers.length > 0;

  // Auto-focus first streamer
  useEffect(() => {
    if (
      hasAnyStreaming &&
      (!focusedUserId || !streamingUsers.includes(focusedUserId))
    ) {
      setFocusedUserId(streamingUsers[0]);
    }
    if (!hasAnyStreaming) {
      setFocusedUserId(null);
    }
  }, [hasAnyStreaming, streamingUsers, focusedUserId]);

  // ── Helper to get username display ──
  const getUserDisplay = (userId: string) => {
    const isMe = userId === currentUser?.id;
    if (isMe) {
      return 'You';
    }
    const member = groupMembers.find((m) => m.userId === userId);
    const profile = member?.user;
    if (!profile) {
      return 'User';
    }
    return profile.username
      ? `@${profile.username}`
      : profile.displayName || profile.email.split('@')[0];
  };

  // ── Render ──
  return (
    <>
      {/* Hidden audio players that are always in the DOM as long as we are in the call */}
      <div style={{ display: 'none' }}>
        {Object.entries(remoteStreams).map(([uid, stream]) => (
          <BackgroundAudioPlayer
            key={uid}
            stream={stream}
            volume={userVolumes[uid] !== undefined ? userVolumes[uid] : 0.8}
            isSelfDeafened={isSelfDeafened}
          />
        ))}
      </div>

      {/* Conditionally portal the UI when viewed */}
      {isViewed &&
        portalTarget &&
        ReactDOM.createPortal(
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-chat)] relative select-none">
            {/* Decorative backdrop glow */}
            <div className="absolute top-[20%] left-[30%] w-[300px] h-[300px] rounded-full bg-[var(--accent-primary)] opacity-5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[30%] w-[350px] h-[350px] rounded-full bg-[rgba(114,137,218,0.15)] opacity-5 blur-[140px] pointer-events-none" />

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-2.5">
              {channelVoiceStates.length === 0 ? (
                /* ── Empty Channel State ── */
                <div className="text-center text-[var(--text-muted)] flex flex-col items-center gap-3 animate-fade-in">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-12 h-12 stroke-[var(--accent-primary)] opacity-60"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <span className="text-[14px]">
                    No one is in this voice channel.
                  </span>
                </div>
              ) : hasAnyStreaming ? (
                /* ════════════════════════════════════════════════════
             DISCORD FOCUS MODE — Focus View + Participant Strip
             ════════════════════════════════════════════════════ */
                <div className="flex flex-1 gap-2.5 overflow-hidden min-h-0 w-full h-full">
                  {/* ── Focus View (large stream area) ── */}
                  <div
                    className="flex-1 relative rounded-2xl overflow-hidden bg-[rgba(0,0,0,0.35)] border border-[var(--glass-border)] flex items-center justify-center min-h-0"
                    style={{
                      animation:
                        'voiceFocusIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    }}
                  >
                    {focusedUserId &&
                      (() => {
                        const isMe = focusedUserId === currentUser?.id;
                        const activeStream = isMe
                          ? localStreamState
                          : remoteStreams[focusedUserId] || null;
                        const focusedVs = channelVoiceStates.find(
                          (vs) => vs.userId === focusedUserId,
                        );
                        const hasVideo =
                          activeStream &&
                          activeStream.getVideoTracks().length > 0;

                        return (
                          <>
                            {/* Video Element */}
                            {hasVideo && (
                              <FocusVideo stream={activeStream} isMe={isMe} />
                            )}

                            {/* Self-sharing overlay (when you're the focused user and screen sharing) */}
                            {isMe && isScreenSharing && !hasVideo && (
                              <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-[4]"
                                style={{
                                  animation: 'voiceFocusIn 0.4s ease forwards',
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  className="w-12 h-12 stroke-[var(--accent-primary)] opacity-60"
                                >
                                  <rect
                                    x="2"
                                    y="3"
                                    width="20"
                                    height="14"
                                    rx="2"
                                    ry="2"
                                  />
                                  <polyline points="8 21 12 17 16 21" />
                                  <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                                <span className="text-[15px] font-semibold text-[var(--text-muted)] tracking-wide">
                                  You are screen sharing
                                </span>
                              </div>
                            )}

                            {/* No video — show avatar in center */}
                            {!hasVideo && !(isMe && isScreenSharing) && (
                              <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                  {speakingUsers[focusedUserId] &&
                                    !focusedVs?.isMuted && (
                                      <div
                                        className="absolute inset-[-4px] rounded-full border-[2.5px] border-[var(--accent-primary)] pointer-events-none"
                                        style={{
                                          animation:
                                            'voiceSpeakingGlow 1.5s ease-in-out infinite',
                                        }}
                                      />
                                    )}
                                  <Avatar
                                    letter={getUserDisplay(
                                      focusedUserId,
                                    )[0].toUpperCase()}
                                    url={(() => {
                                      const member = groupMembers.find(
                                        (m) => m.userId === focusedUserId,
                                      );
                                      return (
                                        member?.user?.avatarThumbnailUrl ||
                                        member?.user?.avatarUrl
                                      );
                                    })()}
                                    size="lg"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Bottom overlay — name + badges */}
                            <div className="absolute bottom-0 left-0 right-0 px-4 py-3.5 bg-gradient-to-t from-[rgba(0,0,0,0.72)] to-transparent flex items-end justify-between pointer-events-none z-[5]">
                              <div className="flex items-center gap-2 pointer-events-auto">
                                <span className="text-[14px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                                  {getUserDisplay(focusedUserId)}
                                </span>
                                {streamingUsers.includes(focusedUserId) && (
                                  <span
                                    className="voice-live-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ed4245] text-[9px] font-extrabold uppercase text-white tracking-wide leading-none"
                                    style={{
                                      animation:
                                        'voiceLivePulse 2s ease-in-out infinite',
                                      boxShadow:
                                        '0 0 8px rgba(237, 66, 69, 0.4)',
                                    }}
                                  >
                                    LIVE
                                  </span>
                                )}
                                {/* Sound bars when speaking */}
                                {speakingUsers[focusedUserId] &&
                                  !focusedVs?.isMuted && (
                                    <div className="flex gap-0.5 items-end h-3 bg-[rgba(0,0,0,0.45)] px-1.5 py-1 rounded-md pointer-events-auto">
                                      <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-1 rounded-full" />
                                      <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-2 rounded-full" />
                                      <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-3 rounded-full" />
                                    </div>
                                  )}
                              </div>
                              <div className="flex items-center gap-1.5 pointer-events-auto">
                                {focusedVs?.isMuted && (
                                  <span className="p-1 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center border border-[var(--danger-border)]">
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      className="w-3 h-3"
                                    >
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                                      <line
                                        x1="1"
                                        y1="1"
                                        x2="23"
                                        y2="23"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                      />
                                    </svg>
                                  </span>
                                )}
                                {focusedVs?.isDeafened && (
                                  <span className="p-1 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center border border-[var(--danger-border)]">
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      className="w-3 h-3"
                                    >
                                      <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                                      <line
                                        x1="1"
                                        y1="1"
                                        x2="23"
                                        y2="23"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                  </div>

                  {/* ── Participant Strip (right sidebar) ── */}
                  <div className="w-[220px] min-w-[220px] flex flex-col gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar">
                    {channelVoiceStates.map((vs) => {
                      const member = groupMembers.find(
                        (m) => m.userId === vs.userId,
                      );
                      const profile = member?.user;
                      if (!profile) {
                        return null;
                      }

                      const isMe = vs.userId === currentUser?.id;
                      const isSpeaking =
                        speakingUsers[vs.userId] && !vs.isMuted;
                      const activeStream = isMe
                        ? localStreamState
                        : remoteStreams[vs.userId] || null;
                      const hasVideo =
                        activeStream &&
                        activeStream.getVideoTracks().length > 0;
                      const isStreaming = streamingUsers.includes(vs.userId);
                      const isFocused = vs.userId === focusedUserId;

                      return (
                        <div
                          key={vs.userId}
                          onClick={() => setFocusedUserId(vs.userId)}
                          className={`voice-card relative flex flex-col items-center justify-center aspect-[16/10] rounded-[10px] overflow-hidden cursor-pointer shrink-0 transition-all duration-200
                      ${
                        isFocused
                          ? 'border-2 border-[var(--accent-primary)] bg-[rgba(56,189,248,0.08)]'
                          : 'border-[1.5px] border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.025)] hover:scale-[1.015]'
                      }
                      ${isSpeaking && !isFocused ? 'border-[var(--accent-primary)] shadow-[0_0_12px_rgba(56,189,248,0.2)]' : ''}
                    `}
                        >
                          {/* Video preview */}
                          <VoiceParticipantMedia
                            stream={activeStream}
                            isMe={isMe}
                            showCameraFeed={isCameraOn || isScreenSharing}
                          />

                          {/* Avatar fallback when no video */}
                          {(!hasVideo ||
                            (isMe && !isCameraOn && !isScreenSharing)) && (
                            <div className="relative flex items-center justify-center z-[2]">
                              {isSpeaking && (
                                <div
                                  className="absolute inset-[-3px] rounded-full border-[2.5px] border-[var(--accent-primary)] pointer-events-none"
                                  style={{
                                    animation:
                                      'voiceSpeakingGlow 1.5s ease-in-out infinite',
                                  }}
                                />
                              )}
                              <Avatar
                                letter={(profile.username ||
                                  profile.displayName ||
                                  profile.email ||
                                  'U')[0].toUpperCase()}
                                url={
                                  profile.avatarThumbnailUrl ||
                                  profile.avatarUrl
                                }
                                size="sm"
                              />
                            </div>
                          )}

                          {/* Expand button (appears on hover) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedUserId(vs.userId);
                            }}
                            className="voice-expand-btn absolute top-1.5 right-1.5 w-[26px] h-[26px] rounded-md border-none bg-[rgba(0,0,0,0.55)] backdrop-blur-sm text-white cursor-pointer flex items-center justify-center opacity-0 scale-[0.85] transition-all duration-150 z-[4]"
                            title="Focus on this user"
                          >
                            <IconExpand />
                          </button>

                          {/* Card Footer — name + badges */}
                          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 px-1.5 py-1 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent z-[3]">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[10px] font-semibold text-white truncate max-w-[80px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                                  {isMe
                                    ? 'You'
                                    : profile.username
                                      ? `@${profile.username}`
                                      : profile.displayName ||
                                        profile.email.split('@')[0]}
                                </span>
                                {isSpeaking && (
                                  <div className="flex gap-[2px] items-end h-2.5">
                                    <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-1 rounded-full" />
                                    <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-2 rounded-full" />
                                    <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-3 rounded-full" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {isStreaming && (
                                  <span
                                    className="voice-live-badge inline-flex items-center gap-[3px] px-1 py-[1px] rounded bg-[#ed4245] text-[8px] font-extrabold uppercase text-white leading-none"
                                    style={{
                                      animation:
                                        'voiceLivePulse 2s ease-in-out infinite',
                                      boxShadow:
                                        '0 0 8px rgba(237, 66, 69, 0.4)',
                                    }}
                                  >
                                    LIVE
                                  </span>
                                )}
                                {vs.isMuted && (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--danger)"
                                    strokeWidth="2.5"
                                    className="w-[11px] h-[11px] opacity-80"
                                  >
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                                    <line
                                      x1="1"
                                      y1="1"
                                      x2="23"
                                      y2="23"
                                      stroke="var(--danger)"
                                      strokeWidth="2.5"
                                    />
                                  </svg>
                                )}
                                {vs.isDeafened && (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--danger)"
                                    strokeWidth="2.5"
                                    className="w-[11px] h-[11px] opacity-80"
                                  >
                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                                    <line
                                      x1="1"
                                      y1="1"
                                      x2="23"
                                      y2="23"
                                      stroke="var(--danger)"
                                      strokeWidth="2.5"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Volume slider for remote users */}
                            {!isMe && (
                              <div
                                className="flex items-center gap-1 bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5 rounded backdrop-blur-sm self-start text-white text-[9px] mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className="w-3 h-3 shrink-0 opacity-80"
                                >
                                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                </svg>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={
                                    userVolumes[vs.userId] !== undefined
                                      ? userVolumes[vs.userId]
                                      : 0.8
                                  }
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setUserVolumes((prev) => ({
                                      ...prev,
                                      [vs.userId]: val,
                                    }));
                                  }}
                                  className="w-14 h-0.5 bg-[rgba(255,255,255,0.2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                                />
                                <span className="w-4 text-right font-mono text-[8px] opacity-80">
                                  {Math.round(
                                    (userVolumes[vs.userId] !== undefined
                                      ? userVolumes[vs.userId]
                                      : 0.8) * 100,
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ════════════════════════════════════════════════════
             GRID MODE — No one streaming, standard avatar grid
             ════════════════════════════════════════════════════ */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 w-full max-w-[900px] content-center">
                  {channelVoiceStates.map((vs) => {
                    const member = groupMembers.find(
                      (m) => m.userId === vs.userId,
                    );
                    const profile = member?.user;
                    if (!profile) {
                      return null;
                    }

                    const isMe = vs.userId === currentUser?.id;
                    const isSpeaking = speakingUsers[vs.userId] && !vs.isMuted;
                    const activeStream = isMe
                      ? localStreamState
                      : remoteStreams[vs.userId] || null;

                    return (
                      <div
                        key={vs.userId}
                        className={`relative flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border overflow-hidden backdrop-blur-md transition-all duration-300
                    ${
                      isSpeaking
                        ? 'border-[var(--accent-primary)] shadow-[0_0_15px_rgba(114,137,218,0.2)] bg-[rgba(114,137,218,0.08)] scale-[1.02]'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.015)]'
                    }`}
                      >
                        {/* Dynamic Audio/Video Render element */}
                        <VoiceParticipantMedia
                          stream={activeStream}
                          isMe={isMe}
                          showCameraFeed={isCameraOn || isScreenSharing}
                        />

                        {/* Standard overlay if video is off */}
                        {(!activeStream ||
                          activeStream.getVideoTracks().length === 0) && (
                          <div className="relative flex items-center justify-center">
                            {isSpeaking && (
                              <div className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)] animate-ping opacity-60 scale-[1.1]" />
                            )}
                            <Avatar
                              letter={(profile.username ||
                                profile.displayName ||
                                profile.email ||
                                'U')[0].toUpperCase()}
                              url={
                                profile.avatarThumbnailUrl || profile.avatarUrl
                              }
                              size="lg"
                            />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                          {vs.isMuted && (
                            <span className="p-1 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center border border-[var(--danger-border)]">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-3 h-3"
                              >
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
                                <line
                                  x1="1"
                                  y1="1"
                                  x2="23"
                                  y2="23"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                />
                              </svg>
                            </span>
                          )}
                          {vs.isDeafened && (
                            <span className="p-1 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center border border-[var(--danger-border)]">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-3 h-3"
                              >
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                                <line
                                  x1="1"
                                  y1="1"
                                  x2="23"
                                  y2="23"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                />
                              </svg>
                            </span>
                          )}
                        </div>

                        {/* Left Bottom Name & Speaker indicator */}
                        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 max-w-[85%] z-10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate bg-[rgba(0,0,0,0.45)] px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-sm">
                              {isMe
                                ? 'You'
                                : profile.username
                                  ? `@${profile.username}`
                                  : profile.displayName ||
                                    profile.email.split('@')[0]}
                            </span>

                            {/* Speaking Soundbar visualizer */}
                            {isSpeaking && (
                              <div className="flex gap-0.5 items-end h-3 bg-[rgba(0,0,0,0.45)] px-1.5 py-1 rounded-md">
                                <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-1 rounded-full" />
                                <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-2 rounded-full" />
                                <span className="w-[2px] bg-[var(--accent-primary)] animate-sound-bar-3 rounded-full" />
                              </div>
                            )}
                          </div>

                          {/* Volume slider for remote users */}
                          {!isMe && (
                            <div
                              className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.55)] px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm text-white text-[10px] w-fit"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-3 h-3 shrink-0 opacity-85"
                              >
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              </svg>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={
                                  userVolumes[vs.userId] !== undefined
                                    ? userVolumes[vs.userId]
                                    : 0.8
                                }
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setUserVolumes((prev) => ({
                                    ...prev,
                                    [vs.userId]: val,
                                  }));
                                }}
                                className="w-16 h-1 bg-[rgba(255,255,255,0.2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                              />
                              <span className="w-5 text-right font-mono text-[9px] opacity-90">
                                {Math.round(
                                  (userVolumes[vs.userId] !== undefined
                                    ? userVolumes[vs.userId]
                                    : 0.8) * 100,
                                )}
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════
         CONTROL BAR — Refined Discord-style
         ════════════════════════════════════════════════════ */}
            <div className="voice-control-bar relative flex items-center justify-center gap-1.5 px-4 py-2.5 mx-auto mb-2.5 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-md z-20">
              {/* Camera */}
              <CtrlBtn
                label={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                onClick={handleToggleCamera}
                variant={isCameraOn ? 'on' : 'off'}
              >
                <IconCamera />
              </CtrlBtn>

              {/* Screen Share */}
              <CtrlBtn
                label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                onClick={handleToggleScreenShare}
                variant={isScreenSharing ? 'screen-on' : 'off'}
              >
                <IconScreen />
              </CtrlBtn>

              {/* Divider */}
              <div className="w-px h-6 bg-[var(--glass-border)] mx-1 shrink-0" />

              {/* Mic */}
              <div className="flex items-center gap-1.5">
                <CtrlBtn
                  label={isSelfMuted ? 'Unmute' : 'Mute'}
                  onClick={handleToggleMute}
                  variant={isSelfMuted ? 'muted' : 'off'}
                >
                  {isSelfMuted ? <IconMicOff /> : <IconMic />}
                </CtrlBtn>
                <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.2)] px-2 py-1.5 rounded-xl border border-[var(--glass-border)] h-[42px]">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={micVolume}
                    onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                    title="Microphone Input Gain (0% - 200%)"
                    className="w-14 h-1 bg-[rgba(255,255,255,0.2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                  />
                  <span className="text-[9px] font-mono text-[var(--text-muted)] w-6 text-right">
                    {Math.round(micVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Deafen */}
              <CtrlBtn
                label={isSelfDeafened ? 'Undeafen' : 'Deafen'}
                onClick={handleToggleDeafen}
                variant={isSelfDeafened ? 'muted' : 'off'}
              >
                {isSelfDeafened ? <IconHeadphonesOff /> : <IconHeadphones />}
              </CtrlBtn>

              {/* Divider */}
              <div className="w-px h-6 bg-[var(--glass-border)] mx-1 shrink-0" />

              {/* Disconnect */}
              <CtrlBtn
                label="Disconnect"
                onClick={handleDisconnectVoice}
                variant="disconnect"
              >
                <IconDisconnect />
              </CtrlBtn>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
};

/* ─── Focus Video Sub-Component ─── */
const FocusVideo = ({
  stream,
  isMe,
}: {
  stream: MediaStream;
  isMe: boolean;
}) => {
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
