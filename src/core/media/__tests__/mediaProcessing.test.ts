import { describe, it, expect, beforeEach } from 'vitest';
import { MediaProcessingPipeline } from '../mediaProcessingPipeline';

describe('MediaProcessingPipeline (P49)', () => {
  let pipeline: MediaProcessingPipeline;

  beforeEach(() => {
    pipeline = new MediaProcessingPipeline();
  });

  it('processes valid JPEG file upload and returns time-bound signed URL', () => {
    const raw = Buffer.from('mock-jpeg-image-data-with-exif');
    const result = pipeline.processUploadedMedicalMedia({
      filename: 'lab_report.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: raw.length,
      rawBuffer: raw
    });

    expect(result.exifStripped).toBe(true);
    expect(result.signedUrl).toContain('https://vault.studentkare.co/docs/');
    expect(result.expiresAt).toBeDefined();
  });

  it('rejects unsupported mime types', () => {
    expect(() =>
      pipeline.processUploadedMedicalMedia({
        filename: 'malicious.exe',
        mimeType: 'image/jpeg' as any, // override type for test
        sizeBytes: 100,
        rawBuffer: Buffer.from('exe')
      })
    ).not.toThrow(); // Valid jpeg allowed

    expect(() =>
      pipeline.processUploadedMedicalMedia({
        filename: 'script.js',
        mimeType: 'text/javascript' as any,
        sizeBytes: 100,
        rawBuffer: Buffer.from('script')
      })
    ).toThrow(/Unsupported media type/);
  });
});
