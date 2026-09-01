import React, { useEffect, useRef, useState } from 'react';

// Declaration for window globals MP4Box and DataStream
declare global {
  interface Window {
    MP4Box?: any;
    DataStream?: any;
  }
}

export const GenoTraceSection: React.FC<{
  onBeginHere?: () => void;
  onDiscoverNow?: () => void;
  onReadMore?: () => void;
}> = ({ onBeginHere, onDiscoverNow, onReadMore }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const sec0Ref = useRef<HTMLDivElement>(null);
  const sec1Ref = useRef<HTMLDivElement>(null);
  const sec2Ref = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Ensure MP4Box CDN script is loaded
    if (!window.MP4Box) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mp4box@0.5.2/dist/mp4box.all.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
    const overlay = overlayRef.current;
    const sections = [sec0Ref.current, sec1Ref.current, sec2Ref.current];

    if (!container || !video || !canvas || !ctx) return;
    const videoSrc = video.src;

    // Geometry calculation
    let start = 0;
    let end = 0;
    let span = 1;

    function updateGeometry() {
      if (!container) return;
      start = container.offsetTop;
      end = start + container.offsetHeight - window.innerHeight;
      span = Math.max(1, end - start);
    }

    updateGeometry();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedUpdateGeometry = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateGeometry, 100);
    };

    window.addEventListener('resize', debouncedUpdateGeometry);
    window.addEventListener('orientationchange', debouncedUpdateGeometry);

    // Time Mapping
    const MAX_TIME = 7.5;
    let duration = MAX_TIME;

    function onMetadataLoaded() {
      if (video && video.duration && !isNaN(video.duration)) {
        duration = Math.min(video.duration, MAX_TIME);
      } else {
        duration = MAX_TIME;
      }
      if (canvas && video && video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      } else if (canvas) {
        canvas.width = 1280;
        canvas.height = 720;
      }
      if (video) video.pause();
    }

    if (video.readyState >= 1) {
      onMetadataLoaded();
    } else {
      video.addEventListener('loadedmetadata', onMetadataLoaded);
    }

    // Motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Lerp Constants
    const LERP_TAU = 8;
    const SNAP = 0.002;
    let target = 0;
    let current = 0;
    let lastTime = performance.now();
    let animFrameId: number;

    function updateSections(p: number) {
      const sectionIndex = Math.min(2, Math.floor(p * 3));
      sections.forEach((sec, idx) => {
        if (!sec) return;
        if (idx === sectionIndex) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      if (overlay) {
        if (window.scrollY > start + span + window.innerHeight) {
          overlay.style.display = 'none';
        } else {
          overlay.style.display = '';
        }
      }
    }

    function render(t: number) {
      if (bankReady && bank.length > 0) {
        drawFromBank(t);
      } else {
        if (video && !video.seeking && Math.abs(video.currentTime - t) > 0.01) {
          try {
            video.currentTime = t;
          } catch (e) {
            // ignore
          }
        }
      }
    }

    function update(now: number) {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const scrollY = window.scrollY;
      const p = Math.max(0, Math.min(1, (scrollY - start) / span));
      target = p * Math.min(duration, MAX_TIME);

      if (prefersReducedMotion) {
        current = target;
      } else {
        current += (target - current) * (1 - Math.exp(-dt * LERP_TAU));
        if (Math.abs(target - current) < SNAP) {
          current = target;
        }
      }

      render(current);
      updateSections(p);

      animFrameId = requestAnimationFrame(update);
    }

    animFrameId = requestAnimationFrame(update);

    // WebCodecs + MP4Box Frame Bank
    const LEAD = 24;
    const LRU_MAX = 30;
    let bankReady = false;
    let bankFailed = false;
    const bank: Array<{ ts: number; blob: Blob }> = [];
    const bitmapLRU = new Map<number, ImageBitmap>();
    let lastDrawnIndex = -1;

    async function buildFrameBank() {
      if (!video) return;
      if (prefersReducedMotion) return;
      if (
        typeof VideoDecoder === 'undefined' ||
        typeof window.MP4Box === 'undefined' ||
        typeof window.DataStream === 'undefined'
      ) {
        return;
      }

      try {
        const response = await fetch(videoSrc);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const mp4boxFile = window.MP4Box.createFile();
        (arrayBuffer as any).fileStart = 0;

        let videoTrack: any = null;
        let decodedCount = 0;
        let lastPromise = Promise.resolve();

        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });

        function processFrame(vf: VideoFrame) {
          lastPromise = lastPromise.then(async () => {
            try {
              if (offscreenCanvas.width !== vf.codedWidth || offscreenCanvas.height !== vf.codedHeight) {
                offscreenCanvas.width = vf.codedWidth || video?.videoWidth || 1280;
                offscreenCanvas.height = vf.codedHeight || video?.videoHeight || 720;
              }
              if (offscreenCtx) offscreenCtx.drawImage(vf, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
              const ts = vf.timestamp;
              vf.close();

              const blob = await new Promise<Blob | null>(resolve => {
                offscreenCanvas.toBlob(resolve, 'image/webp', 0.82);
              });

              if (blob) {
                bank.push({ ts, blob });
              }
            } catch (e) {
              console.error('Frame blob error', e);
            }
          });
        }

        const decoder = new VideoDecoder({
          output: vf => {
            decodedCount++;
            processFrame(vf);
          },
          error: e => {
            console.error('VideoDecoder error', e);
            bankFailed = true;
          }
        });

        mp4boxFile.onReady = function (info: any) {
          if (!info || !info.videoTracks || info.videoTracks.length === 0) {
            bankFailed = true;
            return;
          }

          videoTrack = info.videoTracks[0];

          let description: Uint8Array | null = null;
          const s = videoTrack.avcC || videoTrack.hvcC || videoTrack.vpcC || videoTrack.av1C;
          if (s) {
            try {
              const stream = new window.DataStream(undefined, 0, window.DataStream.BIG_ENDIAN);
              s.write(stream);
              description = new Uint8Array(stream.buffer, 8);
            } catch (e) {
              // fallback
            }
          }

          const config: VideoDecoderConfig = {
            codec: videoTrack.codec,
            codedWidth: videoTrack.track_width,
            codedHeight: videoTrack.track_height
          };
          if (description) {
            config.description = description;
          }

          try {
            decoder.configure(config);
            mp4boxFile.setExtractionOptions(videoTrack.id, null, { nbSamples: Infinity });
            mp4boxFile.start();
          } catch (err) {
            console.error('Decoder configuration error', err);
            bankFailed = true;
          }
        };

        mp4boxFile.onSamples = async function (track_id: number, ref: any, samples: any[]) {
          for (let i = 0; i < samples.length; i++) {
            if (bankFailed) break;

            const sample = samples[i];
            while (i - decodedCount > LEAD && !bankFailed) {
              await new Promise(r => setTimeout(r, 10));
            }

            if (bankFailed) break;

            const type = sample.is_sync ? 'key' : 'delta';
            const timestamp = (sample.cts * 1e6) / sample.timescale;
            const duration = (sample.duration * 1e6) / sample.timescale;

            try {
              decoder.decode(
                new EncodedVideoChunk({
                  type,
                  timestamp,
                  duration,
                  data: sample.data
                })
              );
            } catch (e) {
              console.error('Decode chunk error', e);
            }
          }

          try {
            await decoder.flush();
          } catch (e) {
            // ignore
          }
          await lastPromise;

          bank.sort((a, b) => a.ts - b.ts);
          if (bank.length > 0) {
            bankReady = true;
          }
        };

        mp4boxFile.appendBuffer(arrayBuffer);
        mp4boxFile.flush();
      } catch (e) {
        console.error('Frame bank setup error', e);
        bankFailed = true;
      }
    }

    function nearestIndex(tMicros: number) {
      if (bank.length === 0) return 0;
      let low = 0;
      let high = bank.length - 1;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (bank[mid].ts === tMicros) return mid;
        if (bank[mid].ts < tMicros) low = mid + 1;
        else high = mid - 1;
      }

      if (low >= bank.length) return bank.length - 1;
      if (high < 0) return 0;
      return Math.abs(bank[low].ts - tMicros) < Math.abs(bank[high].ts - tMicros) ? low : high;
    }

    async function getBitmap(index: number) {
      if (index < 0 || index >= bank.length) return null;
      if (bitmapLRU.has(index)) {
        const bm = bitmapLRU.get(index)!;
        bitmapLRU.delete(index);
        bitmapLRU.set(index, bm);
        return bm;
      }

      try {
        const bm = await createImageBitmap(bank[index].blob);
        bitmapLRU.set(index, bm);
        if (bitmapLRU.size > LRU_MAX) {
          const oldestKey = bitmapLRU.keys().next().value;
          if (oldestKey !== undefined) {
            const oldestBm = bitmapLRU.get(oldestKey);
            oldestBm?.close();
            bitmapLRU.delete(oldestKey);
          }
        }
        return bm;
      } catch (e) {
        return null;
      }
    }

    function warm(i: number) {
      for (let offset = -1; offset <= 2; offset++) {
        const idx = i + offset;
        if (idx >= 0 && idx < bank.length && !bitmapLRU.has(idx)) {
          getBitmap(idx);
        }
      }
    }

    async function drawFromBank(t: number) {
      if (!ctx || !canvas) return;
      const tMicros = t * 1e6;
      const idx = nearestIndex(tMicros);
      if (idx === lastDrawnIndex && bitmapLRU.has(idx)) {
        return;
      }

      warm(idx);
      const bm = await getBitmap(idx);
      if (bm) {
        if (canvas.width !== bm.width || canvas.height !== bm.height) {
          canvas.width = bm.width;
          canvas.height = bm.height;
        }
        ctx.drawImage(bm, 0, 0, canvas.width, canvas.height);
        canvas.classList.add('is-live');
        lastDrawnIndex = idx;
      }
    }

    if (document.readyState === 'complete') {
      buildFrameBank();
    } else {
      window.addEventListener('load', buildFrameBank);
    }

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', debouncedUpdateGeometry);
      window.removeEventListener('orientationchange', debouncedUpdateGeometry);
    };
  }, []);

  return (
    <div style={{ position: 'relative', backgroundColor: '#000', color: '#fff', width: '100%', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://db.onlinewebfonts.com/c/95cecf452d3208890088a5b4c19c7ecf?family=Helvetica+Neue+ME');

        .genotrace-nav {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 100;
          padding: 0 48px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Helvetica Neue ME', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .genotrace-nav__inner {
          max-width: 1400px;
          height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .genotrace-nav__logo {
          font-size: 1.25rem;
          font-weight: 500;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.01em;
        }

        .genotrace-nav__links {
          display: flex;
          gap: 40px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .genotrace-nav__links a {
          font-size: 0.9375rem;
          font-weight: 300;
          opacity: 0.9;
          color: #fff;
          text-decoration: none;
          transition: opacity 0.3s ease;
        }

        .genotrace-nav__links a:hover {
          opacity: 1;
        }

        .genotrace-btn {
          font-family: 'Helvetica Neue ME', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 0.8125rem;
          font-weight: 400;
          padding: 5px 12px;
          border-radius: 0;
          letter-spacing: 0.02em;
          transition: all 0.3s ease;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          box-sizing: border-box;
        }

        .genotrace-btn--primary {
          background-color: #fff;
          color: #000;
          border: 1px solid #fff;
        }

        .genotrace-btn--primary:hover {
          background-color: transparent;
          color: #fff;
        }

        .genotrace-btn--outline {
          background-color: transparent;
          color: #fff;
          border: none;
          padding: 8px 0;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .genotrace-btn--outline:hover {
          opacity: 0.7;
        }

        .genotrace-hamburger {
          position: relative;
          width: 32px;
          height: 24px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: none;
          padding: 0;
          z-index: 101;
        }

        .genotrace-hamburger-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: #fff;
          border-radius: 1px;
          transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
                      opacity 0.4s cubic-bezier(0.23, 1, 0.32, 1),
                      top 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .genotrace-hamburger-line:nth-child(1) { top: 2px; }
        .genotrace-hamburger-line:nth-child(2) { top: 11px; }
        .genotrace-hamburger-line:nth-child(3) { top: 20px; }

        .genotrace-hamburger.active .genotrace-hamburger-line:nth-child(1) {
          top: 11px;
          transform: rotate(45deg);
        }

        .genotrace-hamburger.active .genotrace-hamburger-line:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }

        .genotrace-hamburger.active .genotrace-hamburger-line:nth-child(3) {
          top: 11px;
          transform: rotate(-45deg);
        }

        .genotrace-mobile-menu {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 99;
          background: rgba(0, 0, 0, 0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 48px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: opacity 0.5s cubic-bezier(0.23, 1, 0.32, 1),
                      transform 0.5s cubic-bezier(0.23, 1, 0.32, 1),
                      visibility 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .genotrace-mobile-menu.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .genotrace-scroll-video {
          position: relative;
          width: 100%;
          height: 500vh;
          font-family: 'Helvetica Neue ME', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        video#scrollVideo {
          position: sticky;
          top: 0;
          width: 100%;
          height: 100vh;
          object-fit: cover;
          z-index: 1;
          display: block;
        }

        .genotrace-scroll-canvas {
          position: sticky;
          top: 0;
          width: 100%;
          height: 100vh;
          object-fit: cover;
          z-index: 2;
          opacity: 0;
          transition: opacity 200ms linear;
          margin-top: -100vh;
          pointer-events: none;
          display: block;
        }

        .genotrace-scroll-canvas.is-live {
          opacity: 1;
        }

        .genotrace-content-overlay {
          position: sticky;
          top: 0;
          height: 100vh;
          margin-top: -100vh;
          z-index: 3;
          pointer-events: none;
        }

        .genotrace-section-content {
          position: absolute;
          inset: 0;
          display: flex;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .genotrace-section-content.active {
          opacity: 1;
          pointer-events: auto;
        }

        .genotrace-section-content--1 {
          align-items: flex-end;
          justify-content: flex-start;
          padding-bottom: 48px;
          padding-left: 24px;
        }

        .genotrace-section-content--2 {
          align-items: flex-start;
          justify-content: flex-end;
          padding-top: 72px;
        }

        .genotrace-section-content--3 {
          align-items: flex-end;
          justify-content: flex-end;
        }

        .genotrace-content {
          max-width: 480px;
          padding: 64px;
        }

        .genotrace-content h1 {
          font-size: clamp(2rem, 3vw, 2.25rem);
          font-weight: 400;
          line-height: 1.2;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
          color: #fff;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1),
                      transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .genotrace-content p {
          font-size: clamp(0.875rem, 1.2vw, 1.125rem);
          font-weight: 300;
          line-height: 1.5;
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(20px);
          color: #fff;
          transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1),
                      transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .genotrace-content .genotrace-btn {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1),
                      transform 0.6s cubic-bezier(0.23, 1, 0.32, 1),
                      background-color 0.3s ease,
                      color 0.3s ease;
        }

        .genotrace-section-content.active .genotrace-content h1 {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.1s;
        }

        .genotrace-section-content.active .genotrace-content p {
          opacity: 0.85;
          transform: translateY(0);
          transition-delay: 0.25s;
        }

        .genotrace-section-content.active .genotrace-content .genotrace-btn {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.4s;
        }

        @media (max-width: 768px) {
          .genotrace-nav {
            padding: 0 24px;
          }
          .genotrace-nav__inner {
            height: 64px;
          }
          .genotrace-nav__links,
          .genotrace-nav__cta {
            display: none;
          }
          .genotrace-hamburger {
            display: block;
          }
          .genotrace-content {
            max-width: 100%;
            padding: 32px 24px;
          }
          .genotrace-content h1 {
            font-size: 1.75rem;
          }
          .genotrace-section-content--2 {
            justify-content: flex-start;
            align-items: flex-start;
            padding-top: 72px;
          }
          .genotrace-section-content--3 {
            justify-content: flex-start;
            align-items: flex-end;
          }
        }
      `}</style>

      {/* Sub-Header Navigation */}
      <nav className="genotrace-nav">
        <div className="genotrace-nav__inner">
          <a href="#" className="genotrace-nav__logo">GenoTrace</a>
          <ul className="genotrace-nav__links">
            <li><a href="#">Testing</a></li>
            <li><a href="#">Traits</a></li>
            <li><a href="#">Science</a></li>
            <li><a href="#">Story</a></li>
          </ul>
          <button onClick={onBeginHere} className="genotrace-btn genotrace-btn--primary genotrace-nav__cta">Begin Here</button>
          <button
            className={`genotrace-hamburger ${mobileMenuOpen ? 'active' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="genotrace-hamburger-line"></span>
            <span className="genotrace-hamburger-line"></span>
            <span className="genotrace-hamburger-line"></span>
          </button>
        </div>
      </nav>

      {/* Full-screen Mobile Menu */}
      <div className={`genotrace-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          <li><a href="#" style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Testing</a></li>
          <li><a href="#" style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Traits</a></li>
          <li><a href="#" style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Science</a></li>
          <li><a href="#" style={{ fontSize: '1.75rem', fontWeight: 300, color: '#fff', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>Story</a></li>
        </ul>
        <button onClick={() => { setMobileMenuOpen(false); onBeginHere?.(); }} className="genotrace-btn genotrace-btn--primary">Begin Here</button>
      </div>

      {/* 500vh Scroll-Scrubbed Video Hero Container */}
      <div ref={containerRef} className="genotrace-scroll-video">
        <video
          ref={videoRef}
          id="scrollVideo"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_183659_804e0948-c701-4565-b56b-a99c78f9bfba.mp4"
          muted
          playsInline
          preload="auto"
        ></video>
        <canvas ref={canvasRef} id="scrollCanvas" className="genotrace-scroll-canvas" aria-hidden="true"></canvas>

        {/* Content Overlay */}
        <div ref={overlayRef} className="genotrace-content-overlay">
          {/* Section 0 */}
          <div ref={sec0Ref} className="genotrace-section-content genotrace-section-content--1 active" data-section="0">
            <div className="genotrace-content">
              <h1>Learn what your genes reveal about you and your roots.</h1>
              <p>Explore your heritage and connect with kin through one easy DNA kit.</p>
            </div>
          </div>

          {/* Section 1 */}
          <div ref={sec1Ref} className="genotrace-section-content genotrace-section-content--2" data-section="1">
            <div className="genotrace-content">
              <h1>Reveal the journeys encoded in your blood.</h1>
              <p>Map your lineage across centuries and civilizations.</p>
              <button onClick={onDiscoverNow} className="genotrace-btn genotrace-btn--primary">Discover Now</button>
            </div>
          </div>

          {/* Section 2 */}
          <div ref={sec2Ref} className="genotrace-section-content genotrace-section-content--3" data-section="2">
            <div className="genotrace-content">
              <h1>Where data meets origin.</h1>
              <p>Cutting-edge genetic insights built on years of discovery.</p>
              <button onClick={onReadMore} className="genotrace-btn genotrace-btn--outline">Read More</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
