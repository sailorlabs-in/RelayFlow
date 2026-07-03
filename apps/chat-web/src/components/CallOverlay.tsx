import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { acceptCall, endCall } from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import { Avatar } from './Avatar';
import { showToast } from './toast';

export const CallOverlay: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeCall = useAppSelector((state) => state.chat.activeCall);
  const userProfiles = useAppSelector((state) => state.chat.userProfiles);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Connected Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall?.status === 'connected') {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeCall?.status]);

  // Clean up and initialize WebRTC
  useEffect(() => {
    if (activeCall?.status === 'connected') {
      startWebRTC();
    } else {
      cleanupWebRTC();
    }
    return () => {
      cleanupWebRTC();
    };
  }, [activeCall?.status]);

  // Sync Local Video Ref
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const hasVideo = localStream.getVideoTracks().length > 0;
      if (hasVideo) {
        localVideoRef.current.srcObject = localStream;
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream, isCameraOn, isScreenSharing]);

  // Sync Remote Video Ref
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const renegotiateCall = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      return;
    }
    const targetId = activeCall?.isInitiator
      ? activeCall.targetUserId
      : activeCall?.callerId;
    if (!targetId) {
      return;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketManager.sendVoiceSignal(targetId, {
        type: 'offer',
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('Call renegotiation offer error:', err);
    }
  };

  const startWebRTC = async () => {
    try {
      cleanupWebRTC();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));

      const targetId = activeCall?.isInitiator
        ? activeCall.targetUserId
        : activeCall?.callerId;
      if (!targetId || !activeCall) {
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketManager.sendVoiceSignal(targetId, {
            type: 'ice-candidate',
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      if (activeCall.isInitiator) {
        pc.onnegotiationneeded = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketManager.sendVoiceSignal(targetId, {
              type: 'offer',
              sdp: pc.localDescription,
            });
          } catch (err) {
            console.error('Call offer negotiation error:', err);
          }
        };
      }

      const handleSignal = async (e: Event) => {
        const { senderUserId, signal } = (e as CustomEvent).detail;
        if (senderUserId !== targetId) {
          return;
        }

        try {
          if (signal.type === 'offer') {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.sdp),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketManager.sendVoiceSignal(targetId, {
              type: 'answer',
              sdp: pc.localDescription,
            });
          } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.sdp),
            );
          } else if (signal.type === 'ice-candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (signalErr) {
          console.error('Error handling voice signal during call:', signalErr);
        }
      };

      window.addEventListener('voice-signal', handleSignal);
      (pc as any)._signalHandler = handleSignal;
    } catch (err) {
      console.error('Failed to initialize WebRTC call:', err);
      showToast.error('Could not access microphone.');
      handleHangup();
    }
  };

  const cleanupWebRTC = () => {
    if (peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      if ((pc as any)._signalHandler) {
        window.removeEventListener('voice-signal', (pc as any)._signalHandler);
      }
      pc.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCameraOn(false);
    setIsScreenSharing(false);
  };

  const handleAccept = () => {
    if (!activeCall) {
      return;
    }
    socketManager.acceptDmCall(activeCall.callerId, activeCall.conversationId);
    dispatch(acceptCall());
  };

  const handleReject = () => {
    if (!activeCall) {
      return;
    }
    socketManager.rejectDmCall(activeCall.callerId, activeCall.conversationId);
    dispatch(endCall());
  };

  const handleHangup = () => {
    if (!activeCall) {
      return;
    }
    const targetId = activeCall.isInitiator
      ? activeCall.targetUserId
      : activeCall.callerId;
    socketManager.hangupDmCall(targetId, activeCall.conversationId);
    dispatch(endCall());
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleCamera = async () => {
    const pc = peerConnectionRef.current;
    const localStream = localStreamRef.current;
    if (!pc || !localStream) {
      return;
    }

    if (isCameraOn) {
      const videoTrack = localStream
        .getVideoTracks()
        .find((t) => !t.label.includes('screen'));
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);

        const sender = pc.getSenders().find((s) => s.track === videoTrack);
        if (sender) {
          pc.removeTrack(sender);
        }
        renegotiateCall();
      }
      setIsCameraOn(false);
      setLocalStream(new MediaStream(localStream.getTracks()));
    } else {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        if (cameraTrack) {
          localStream.addTrack(cameraTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));

          pc.addTrack(cameraTrack, localStream);
          renegotiateCall();
          setIsCameraOn(true);
        }
      } catch (err) {
        console.error('Failed to get camera media:', err);
        showToast.error('Could not access camera.');
      }
    }
  };

  const handleToggleScreenShare = async () => {
    const pc = peerConnectionRef.current;
    const localStream = localStreamRef.current;
    if (!pc || !localStream) {
      return;
    }

    if (isScreenSharing) {
      const screenTrack = localStream
        .getVideoTracks()
        .find((t) => t.label.includes('screen') || t.label.includes('monitor'));
      if (screenTrack) {
        screenTrack.stop();
        localStream.removeTrack(screenTrack);

        const sender = pc.getSenders().find((s) => s.track === screenTrack);
        if (sender) {
          pc.removeTrack(sender);
        }
        renegotiateCall();
      }
      setIsScreenSharing(false);
      setLocalStream(new MediaStream(localStream.getTracks()));
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          // Label as screen
          Object.defineProperty(screenTrack, 'label', {
            value: 'screen',
            writable: true,
          });
          localStream.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));

          pc.addTrack(screenTrack, localStream);
          renegotiateCall();
          setIsScreenSharing(true);

          screenTrack.onended = () => {
            localStream.removeTrack(screenTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
            const sender = pc.getSenders().find((s) => s.track === screenTrack);
            if (sender) {
              pc.removeTrack(sender);
            }
            renegotiateCall();
            setIsScreenSharing(false);
          };
        }
      } catch (err) {
        console.error('Failed to get screen media:', err);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!activeCall) {
    return null;
  }

  const otherUserId = activeCall.isInitiator
    ? activeCall.targetUserId
    : activeCall.callerId;
  const otherProfile = userProfiles[otherUserId];
  const otherName =
    otherProfile?.displayName ||
    otherProfile?.username ||
    activeCall.callerName ||
    'User';
  const otherLetter = otherName.charAt(0).toUpperCase();

  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0;
  const hasRemoteVideo =
    remoteStream && remoteStream.getVideoTracks().length > 0;
  const isWidescreen =
    activeCall.status === 'connected' && (hasLocalVideo || hasRemoteVideo);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(4,6,12,0.92)] backdrop-blur-lg p-4">
      {/* Invisible remote audio output when video is not displayed */}
      {!hasRemoteVideo && remoteStream && (
        <audio
          ref={(el) => {
            if (el) {
              el.srcObject = remoteStream;
            }
          }}
          autoPlay
        />
      )}

      <div
        className={`bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] shadow-(--glass-shadow) flex flex-col transition-all duration-300 relative overflow-hidden
          ${
            isWidescreen
              ? 'w-full max-w-4xl aspect-video rounded-[32px]'
              : 'w-88 p-6 rounded-[24px] items-center justify-center text-center'
          }`}
      >
        {isWidescreen ? (
          /* Widescreen Video Calling Screen */
          <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 box-border bg-black/40">
            {/* Remote Video (takes up full background) */}
            {hasRemoteVideo ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : (
              /* Remote User Avatar Placeholder when they have no camera active */
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-900/60 z-0">
                <div className="w-24 h-24 rounded-full border-2 border-glass overflow-hidden flex items-center justify-center bg-theme-sidebar/50 mb-4">
                  <Avatar
                    letter={otherLetter}
                    url={
                      otherProfile?.avatarThumbnailUrl ||
                      otherProfile?.avatarUrl
                    }
                    size="lg"
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {otherName}
                </h3>
                <span className="text-sm text-theme-muted">
                  No camera stream
                </span>
              </div>
            )}

            {/* Local Video (Floating PIP Overlay) */}
            {hasLocalVideo && (
              <div className="absolute top-6 right-6 w-48 aspect-video rounded-2xl border-[1.5px] border-glass overflow-hidden shadow-2xl z-10 bg-black/50">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Top HUD Row */}
            <div className="flex justify-between items-start z-10 w-full">
              <div className="bg-black/40 backdrop-blur-md border border-glass px-4 py-2 rounded-2xl text-left">
                <h4 className="text-white font-bold text-sm m-0 leading-tight">
                  {otherName}
                </h4>
                <span className="text-xs text-green-400 font-semibold tracking-wide uppercase mt-1 inline-block">
                  Connected • {formatDuration(callDuration)}
                </span>
              </div>
            </div>

            {/* Bottom HUD Controls row */}
            <div className="flex justify-center items-center gap-4 z-10 w-full">
              {/* Camera Toggle Button */}
              <button
                onClick={handleToggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center border border-glass cursor-pointer active:scale-95 transition-all
                  ${isCameraOn ? 'bg-green-500 border-transparent text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>

              {/* Screen Share Toggle Button */}
              <button
                onClick={handleToggleScreenShare}
                className={`w-12 h-12 rounded-full flex items-center justify-center border border-glass cursor-pointer active:scale-95 transition-all
                  ${isScreenSharing ? 'bg-green-500 border-transparent text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                title={
                  isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </button>

              {/* Microphone Toggle Button */}
              <button
                onClick={handleToggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center border border-glass cursor-pointer active:scale-95 transition-all
                  ${isMuted ? 'bg-red-500 border-transparent text-white' : 'bg-black/40 hover:bg-black/60 text-white'}`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>

              {/* End/Hang Up Button */}
              <button
                onClick={handleHangup}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white border-none cursor-pointer shadow-lg shadow-red-500/25"
                title="Hang Up"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-6 h-6 rotate-[135deg]"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Compact Audio / Ringing Calling Dialog */
          <>
            <div className="relative mb-6">
              {(activeCall.status === 'calling' ||
                activeCall.status === 'incoming') && (
                <>
                  <div className="absolute inset-0 rounded-full bg-(--accent-primary) opacity-20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-(--accent-primary) opacity-30 animate-pulse" />
                </>
              )}
              <div className="w-20 h-20 rounded-full border-2 border-glass overflow-hidden flex items-center justify-center bg-theme-sidebar/50">
                <Avatar
                  letter={otherLetter}
                  url={
                    otherProfile?.avatarThumbnailUrl || otherProfile?.avatarUrl
                  }
                  size="lg"
                />
              </div>
            </div>

            <h3 className="text-lg font-bold text-theme-primary mb-1">
              {otherName}
            </h3>

            <p className="text-xs text-theme-muted mb-8 uppercase tracking-wider font-semibold">
              {activeCall.status === 'calling' && 'Ringing...'}
              {activeCall.status === 'incoming' && 'Incoming Call...'}
              {activeCall.status === 'connected' &&
                `Connected • ${formatDuration(callDuration)}`}
              {activeCall.status === 'rejected' && 'Call Busy'}
            </p>

            <div className="flex gap-4">
              {activeCall.status === 'incoming' ? (
                <>
                  <button
                    onClick={handleAccept}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white border-none cursor-pointer shadow-lg shadow-green-500/20"
                    title="Accept"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-6 h-6"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  <button
                    onClick={handleReject}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white border-none cursor-pointer shadow-lg shadow-red-500/20"
                    title="Decline"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-6 h-6"
                    >
                      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                      <line x1="23" y1="1" x2="1" y2="23" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  {activeCall.status === 'connected' && (
                    <>
                      {/* Connected Mute Button */}
                      <button
                        onClick={handleToggleMute}
                        className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all border border-glass cursor-pointer ${isMuted ? 'bg-red-500 text-white border-transparent' : 'bg-transparent text-theme-primary hover:bg-theme-input'}`}
                        title={
                          isMuted ? 'Unmute microphone' : 'Mute microphone'
                        }
                      >
                        {isMuted ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-5 h-5"
                          >
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-5 h-5"
                          >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        )}
                      </button>

                      {/* Camera Button (Connected State Only) */}
                      <button
                        onClick={handleToggleCamera}
                        className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all border border-glass cursor-pointer ${isCameraOn ? 'bg-green-500 text-white border-transparent' : 'bg-transparent text-theme-primary hover:bg-theme-input'}`}
                        title={
                          isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-5 h-5"
                        >
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect
                            x="1"
                            y="5"
                            width="15"
                            height="14"
                            rx="2"
                            ry="2"
                          />
                        </svg>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleHangup}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white border-none cursor-pointer shadow-lg shadow-red-500/20"
                    title="Hang Up"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-6 h-6 rotate-[135deg]"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
