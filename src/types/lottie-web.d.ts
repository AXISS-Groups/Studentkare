declare module 'lottie-web' {
  export interface AnimationItem {
    play(): void;
    stop(): void;
    pause(): void;
    destroy(): void;
    setSpeed(speed: number): void;
    goToAndStop(frame: number, isFrame?: boolean): void;
    goToAndPlay(frame: number, isFrame?: boolean): void;
    setDirection(direction: 1 | -1): void;
    getDuration(inFrames?: boolean): number;
    addEventListener(name: string, callback: () => void): void;
    removeEventListener(name: string, callback: () => void): void;
    totalFrames: number;
    currentFrame: number;
    loop: boolean;
    isPaused: boolean;
  }

  export interface LottiePlayer {
    loadAnimation(params: {
      container: Element;
      renderer?: 'svg' | 'canvas' | 'html';
      loop?: boolean;
      autoplay?: boolean;
      animationData?: unknown;
      path?: string;
      name?: string;
    }): AnimationItem;
    destroy(name?: string): void;
  }

  const lottie: LottiePlayer;
  export default lottie;
}

declare module 'lottie-web/build/player/lottie_light' {
  import lottie from 'lottie-web';
  export default lottie;
}
