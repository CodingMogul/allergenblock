import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { Video, ResizeMode } from 'expo-av';

interface OnboardingVideoContextType {
  videoRef: React.RefObject<any>;
  videoUri: string | null;
  isReady: boolean;
  getPosition: () => Promise<number>;
  seekTo: (ms: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
}

const OnboardingVideoContext = createContext<OnboardingVideoContextType | undefined>(undefined);

export function OnboardingVideoProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<any>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const videoModule = require('../assets/OnboardTakePhoto.mp4');
    Asset.loadAsync(videoModule).then(() => {
      const asset = Asset.fromModule(videoModule);
      setVideoUri(asset.uri);
    });
  }, []);

  const getPosition = async () => {
    if (videoRef.current) {
      const status = await videoRef.current.getStatusAsync();
      return status.positionMillis || 0;
    }
    return 0;
  };

  const seekTo = async (ms: number) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(ms, { toleranceMillis: 100 });
    }
  };

  const play = async () => {
    if (videoRef.current) {
      await videoRef.current.playAsync();
    }
  };

  const pause = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
  };

  return (
    <OnboardingVideoContext.Provider value={{ videoRef, videoUri, isReady, getPosition, seekTo, play, pause }}>
      {/* Hidden video always mounted and playing in background */}
      {videoUri && (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
          resizeMode={ResizeMode.COVER}
          isLooping={false}
          isMuted
          shouldPlay={true}
          onLoad={() => setIsReady(true)}
        />
      )}
      {children}
    </OnboardingVideoContext.Provider>
  );
}

export function useOnboardingVideo() {
  const ctx = useContext(OnboardingVideoContext);
  if (!ctx) throw new Error('useOnboardingVideo must be used within an OnboardingVideoProvider');
  return ctx;
} 