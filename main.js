// main.js - GenoTrace Scroll-Scrubbed Landing Page

document.addEventListener('DOMContentLoaded', () => {
  // --- Hamburger & Mobile Menu ---
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-menu a');

  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !mobileMenu.classList.contains('open');
    if (isOpen) {
      hamburger.classList.add('active');
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    } else {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  hamburger?.addEventListener('click', () => toggleMenu());
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // --- Scroll Video & Canvas Setup ---
  const container = document.querySelector('.scroll-video');
  const video = document.getElementById('scrollVideo');
  const canvas = document.getElementById('scrollCanvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const overlay = document.querySelector('.content-overlay');
  const sections = document.querySelectorAll('.section-content');

  // Geometry
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

  let debounceTimer;
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
    if (video.duration && !isNaN(video.duration)) {
      duration = Math.min(video.duration, MAX_TIME);
    } else {
      duration = MAX_TIME;
    }
    if (canvas && video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    } else if (canvas) {
      canvas.width = 1280;
      canvas.height = 720;
    }
    video.pause();
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

  function updateSections(p) {
    const sectionIndex = Math.min(2, Math.floor(p * 3));
    sections.forEach((sec, idx) => {
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

  function render(t) {
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

  function update(now) {
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

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);

  // --- WebCodecs + MP4Box Frame Bank ---
  const LEAD = 24;
  const LRU_MAX = 30;
  let bankReady = false;
  let bankFailed = false;
  const bank = []; // Array of { ts: number, blob: Blob }
  const bitmapLRU = new Map(); // key: index -> ImageBitmap
  let lastDrawnIndex = -1;

  async function buildFrameBank() {
    if (prefersReducedMotion) return;
    if (
      typeof VideoDecoder === 'undefined' ||
      typeof window.MP4Box === 'undefined' ||
      typeof window.DataStream === 'undefined'
    ) {
      console.log('WebCodecs or MP4Box unavailable; using HTML5 video scrubbing fallback.');
      return;
    }

    try {
      const response = await fetch(video.src);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();

      const mp4boxFile = window.MP4Box.createFile();
      arrayBuffer.fileStart = 0;

      let videoTrack = null;
      let decodedCount = 0;
      let lastPromise = Promise.resolve();

      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });

      function processFrame(vf) {
        lastPromise = lastPromise.then(async () => {
          try {
            if (offscreenCanvas.width !== vf.codedWidth || offscreenCanvas.height !== vf.codedHeight) {
              offscreenCanvas.width = vf.codedWidth || video.videoWidth || 1280;
              offscreenCanvas.height = vf.codedHeight || video.videoHeight || 720;
            }
            offscreenCtx.drawImage(vf, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const ts = vf.timestamp;
            vf.close();

            const blob = await new Promise(resolve => {
              offscreenCanvas.toBlob(resolve, 'image/webp', 0.82);
            });

            if (blob) {
              bank.push({ ts, blob });
            }
          } catch (e) {
            console.error('Frame blob processing error', e);
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

      mp4boxFile.onReady = function (info) {
        if (!info || !info.videoTracks || info.videoTracks.length === 0) {
          bankFailed = true;
          return;
        }

        videoTrack = info.videoTracks[0];

        // Extract codec description if available
        let description = null;
        const s = videoTrack.avcC || videoTrack.hvcC || videoTrack.vpcC || videoTrack.av1C;
        if (s) {
          try {
            const stream = new window.DataStream(undefined, 0, window.DataStream.BIG_ENDIAN);
            s.write(stream);
            description = new Uint8Array(stream.buffer, 8); // Skip 8-byte box header
          } catch (e) {
            // fallback without description
          }
        }

        const config = {
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

      mp4boxFile.onSamples = async function (track_id, ref, samples) {
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
          // ignore flush error
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

  function nearestIndex(tMicros) {
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

  async function getBitmap(index) {
    if (index < 0 || index >= bank.length) return null;
    if (bitmapLRU.has(index)) {
      const bm = bitmapLRU.get(index);
      bitmapLRU.delete(index);
      bitmapLRU.set(index, bm);
      return bm;
    }

    try {
      const bm = await createImageBitmap(bank[index].blob);
      bitmapLRU.set(index, bm);
      if (bitmapLRU.size > LRU_MAX) {
        const oldestKey = bitmapLRU.keys().next().value;
        const oldestBm = bitmapLRU.get(oldestKey);
        oldestBm?.close();
        bitmapLRU.delete(oldestKey);
      }
      return bm;
    } catch (e) {
      return null;
    }
  }

  function warm(i) {
    for (let offset = -1; offset <= 2; offset++) {
      const idx = i + offset;
      if (idx >= 0 && idx < bank.length && !bitmapLRU.has(idx)) {
        getBitmap(idx);
      }
    }
  }

  async function drawFromBank(t) {
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
});
