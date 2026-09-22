/// <reference types="vite/client" />

/* YouTube IFrame Player API global types */
interface YTPlayerOptions {
  videoId: string;
  host?: string;
  width?: number | string;
  height?: number | string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onError?: (event: { data: number }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
}

interface YTPlayerInstance {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance;
}

interface Window {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}
