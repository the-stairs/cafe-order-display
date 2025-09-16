"use client";

import { useCallback, useRef, useEffect } from "react";

interface UseSoundOptions {
  volume?: number;
  playbackRate?: number;
}

interface UseSoundReturn {
  play: () => void;
  stop: () => void;
  resume: () => Promise<void>;
  isPlaying: boolean;
}

/**
 * 사운드 재생을 위한 커스텀 훅
 * Web Audio API를 사용하여 "딩동" 효과음을 생성합니다.
 */
export function useSound(
  soundUrl?: string,
  options: UseSoundOptions = {}
): UseSoundReturn {
  const { volume = 0.5, playbackRate = 1 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  // AudioContext 초기화
  useEffect(() => {
    if (typeof window !== "undefined" && window.AudioContext) {
      audioContextRef.current = new AudioContext();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // "딩동" 사운드 생성 함수
  const createDingDongSound = useCallback(() => {
    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const gainNode = context.createGain();

    // 첫 번째 음 (딩)
    const oscillator1 = context.createOscillator();
    oscillator1.type = "sine";
    oscillator1.frequency.setValueAtTime(800, context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(
      600,
      context.currentTime + 0.1
    );

    // 두 번째 음 (동)
    const oscillator2 = context.createOscillator();
    oscillator2.type = "sine";
    oscillator2.frequency.setValueAtTime(500, context.currentTime + 0.15);
    oscillator2.frequency.exponentialRampToValueAtTime(
      400,
      context.currentTime + 0.3
    );

    // 볼륨 설정
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, context.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(
      volume * 0.8,
      context.currentTime + 0.16
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      context.currentTime + 0.35
    );

    // 연결
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(context.destination);

    // 재생
    oscillator1.start(context.currentTime);
    oscillator1.stop(context.currentTime + 0.15);

    oscillator2.start(context.currentTime + 0.15);
    oscillator2.stop(context.currentTime + 0.4);

    // 재생 상태 관리
    isPlayingRef.current = true;
    setTimeout(() => {
      isPlayingRef.current = false;
    }, 400);
  }, [volume]);

  // MP3 파일 재생 함수 (실제 파일이 있을 경우)
  const playAudioFile = useCallback(
    (url: string) => {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.playbackRate = playbackRate;

      audio.play().catch((error) => {
        console.warn("Audio playback failed:", error);
        // 오디오 파일 재생 실패 시 Web Audio API로 폴백
        createDingDongSound();
      });

      isPlayingRef.current = true;
      audio.addEventListener("ended", () => {
        isPlayingRef.current = false;
      });
    },
    [volume, playbackRate, createDingDongSound]
  );

  // 재생 함수
  const play = useCallback(() => {
    if (isPlayingRef.current) return;

    // AudioContext가 suspended 상태면 resume
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (soundUrl) {
      playAudioFile(soundUrl);
    } else {
      createDingDongSound();
    }
  }, [soundUrl, playAudioFile, createDingDongSound]);

  // 정지 함수 (Web Audio API로 생성된 음은 자동으로 정지됨)
  const stop = useCallback(() => {
    isPlayingRef.current = false;
  }, []);

  // iOS/Safari 호환성을 위한 AudioContext 활성화 함수
  const resume = useCallback(async () => {
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      try {
        await audioContextRef.current.resume();
        console.log("AudioContext resumed for iOS/Safari compatibility");
      } catch (error) {
        console.warn("Failed to resume AudioContext:", error);
      }
    }
  }, []);

  return {
    play,
    stop,
    resume,
    isPlaying: isPlayingRef.current,
  };
}
