import { makeAutoObservable, runInAction } from 'mobx';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import { evaluateCrisisGate } from '@/ai/core/crisisGate';
import { ApiError } from '@/data/services/http';
import { MedicineInfoRepository } from '../data/MedicineInfoRepository';
import type { AgeBand, MedicineDetail, MedicineSummary, PickedPhoto, ReaderState } from '../data/MedicineInfoRepository';
import { bandOptions, labelFormsFor } from '../model/ageBands';
import type { BandOption, LabelForm } from '../model/ageBands';

/**
 * Medicine information (M2MedicineInfo, Tier 1; plan
 * docs/plans/tier1-medicine-info-2026-10-22.md, approved by Krishna Chintakayala
 * 2026-10-22). One view model for the web phone frame, the public page and Expo.
 *
 * - Crisis first: any text typed (or corrected from a photo) goes through the
 *   on-device crisis gate before a request; a crisis never sends the text. The
 *   server's own gate is a backstop (status CRISIS).
 * - Photos: read on the server only when the reader is switched on; otherwise
 *   the screen says so and offers "Type what's printed". Matches are never
 *   picked for the person: they confirm one, or say none of them is it.
 * - Age band: chosen here and never sent; the answer is filtered on the device
 *   from the reviewed label entries the server returned.
 */
const HTTP_NOT_FOUND = 404;

export type Phase = 'idle' | 'loading' | 'ready' | 'error';
export type PhotoPhase = 'idle' | 'reading' | 'confirm' | 'noMatch' | 'noText' | 'notConfigured' | 'unavailable' | 'failed' | 'error';
export type DetailPhase = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export class MedicineInfoViewModel implements ViewModel {
  query = '';
  /** The text the current results are for. */
  searched = '';
  searchPhase: Phase = 'idle';
  results: MedicineSummary[] = [];
  /** A crisis phrase was typed: the crisis help shows and no search runs. */
  crisis = false;

  reader: ReaderState | null = null;
  photoPhase: PhotoPhase = 'idle';
  /** What the reader found printed (the person may correct it), or what they typed instead. */
  printed = '';
  /** "Type what's printed on the strip" is open. */
  typing = false;
  candidates: MedicineSummary[] = [];

  detailPhase: DetailPhase = 'idle';
  detail: MedicineDetail | null = null;
  band: AgeBand | null = null;
  /** The medicine last opened (for "Try again"). */
  openedId: string | null = null;

  private version = 0;
  private disposed = false;

  constructor(private readonly repo: MedicineInfoRepository = new MedicineInfoRepository()) {
    makeAutoObservable<MedicineInfoViewModel, 'repo' | 'version' | 'disposed'>(this, { repo: false, version: false, disposed: false }, { autoBind: true });
  }

  get bands(): BandOption[] {
    return bandOptions();
  }

  get bandOption(): BandOption | null {
    return this.bands.find((b) => b.band === this.band) ?? null;
  }

  get labelForms(): LabelForm[] {
    return this.detail && this.band ? labelFormsFor(this.detail, this.band) : [];
  }

  get minChars(): number {
    return getSetting('medicine_info.search_min_chars');
  }

  get canSearch(): boolean {
    return this.query.trim().length >= this.minChars;
  }

  /** Opens with a medicine (from the shop) or a query (from Home search), and checks whether photos can be read. */
  start(initial: { medicineId?: string | null; query?: string | null } = {}): void {
    // A remount (React strict mode, a revisited screen) starts again after dispose().
    this.disposed = false;
    void this.loadReader();
    if (initial.medicineId) void this.open(initial.medicineId);
    else if (initial.query) {
      this.setQuery(initial.query);
      void this.submit();
    }
  }

  private async loadReader(): Promise<void> {
    try {
      const res = await this.repo.readerStatus();
      if (!this.disposed) runInAction(() => { this.reader = res.state; });
    } catch {
      // Unknown: the photo button still says what happened when tapped.
      if (!this.disposed) runInAction(() => { this.reader = null; });
    }
  }

  setQuery(text: string): void {
    this.query = text;
    if (this.crisis && !evaluateCrisisGate(text).isCrisis) this.crisis = false;
  }

  /** True when the text is a crisis phrase: the crisis help shows and nothing is sent. Fails closed. */
  private gate(text: string): boolean {
    const crisis = evaluateCrisisGate(text).isCrisis;
    if (crisis) {
      this.crisis = true;
      this.results = [];
      this.candidates = [];
      this.searchPhase = 'idle';
    }
    return crisis;
  }

  async submit(): Promise<void> {
    const text = this.query.trim();
    if (this.gate(text)) return;
    this.crisis = false;
    if (text.length < this.minChars) return;
    const version = ++this.version;
    this.closeDetail();
    this.searched = text;
    this.searchPhase = 'loading';
    try {
      const res = await this.repo.search(text);
      if (version !== this.version || this.disposed) return;
      runInAction(() => {
        if (res.status === 'CRISIS') {
          this.crisis = true;
          this.results = [];
          this.searchPhase = 'idle';
          return;
        }
        this.results = res.results;
        this.searchPhase = 'ready';
      });
    } catch {
      if (version === this.version && !this.disposed) runInAction(() => { this.searchPhase = 'error'; });
    }
  }

  async readPhoto(photo: PickedPhoto): Promise<void> {
    const version = ++this.version;
    this.closeDetail();
    this.typing = false;
    this.candidates = [];
    this.photoPhase = 'reading';
    try {
      const res = await this.repo.readPhoto(photo);
      if (version !== this.version || this.disposed) return;
      runInAction(() => {
        this.printed = res.text;
        this.candidates = res.candidates;
        const byState: Record<typeof res.state, PhotoPhase> = {
          NOT_CONFIGURED: 'notConfigured', UNAVAILABLE: 'unavailable', NO_TEXT: 'noText', FAILED: 'failed',
          READ: res.candidates.length ? 'confirm' : 'noMatch',
        };
        this.photoPhase = byState[res.state];
        if (res.state === 'NOT_CONFIGURED' || res.state === 'UNAVAILABLE') this.reader = res.state;
      });
    } catch {
      if (version === this.version && !this.disposed) runInAction(() => { this.photoPhase = 'error'; });
    }
  }

  /** "Type what's printed on the strip": the same matching as a photo, from text the person types. */
  openTyping(): void {
    this.typing = true;
  }

  setPrinted(text: string): void {
    this.printed = text;
  }

  async matchPrinted(): Promise<void> {
    const text = this.printed.trim();
    if (this.gate(text)) return;
    this.crisis = false;
    if (text.length < this.minChars) return;
    const version = ++this.version;
    this.photoPhase = 'reading';
    try {
      const res = await this.repo.search(text);
      if (version !== this.version || this.disposed) return;
      runInAction(() => {
        if (res.status === 'CRISIS') {
          this.crisis = true;
          this.candidates = [];
          this.photoPhase = 'idle';
          return;
        }
        this.candidates = res.results;
        this.photoPhase = res.results.length ? 'confirm' : 'noMatch';
      });
    } catch {
      if (version === this.version && !this.disposed) runInAction(() => { this.photoPhase = 'error'; });
    }
  }

  /** The person says the printed medicine is this one. */
  confirm(candidate: MedicineSummary): void {
    void this.open(candidate.id);
  }

  /** "None of these": nothing is guessed; the screen says so and offers typing it. */
  noneOfThese(): void {
    this.candidates = [];
    this.photoPhase = 'noMatch';
  }

  closePhoto(): void {
    this.photoPhase = 'idle';
    this.candidates = [];
    this.printed = '';
    this.typing = false;
  }

  async open(medicineId: string): Promise<void> {
    const version = ++this.version;
    this.openedId = medicineId;
    this.detailPhase = 'loading';
    this.detail = null;
    this.band = null;
    try {
      const detail = await this.repo.medicine(medicineId);
      if (version !== this.version || this.disposed) return;
      runInAction(() => {
        this.detail = detail;
        this.detailPhase = 'ready';
      });
    } catch (error) {
      if (version !== this.version || this.disposed) return;
      const missing = error instanceof ApiError && error.status === HTTP_NOT_FOUND;
      runInAction(() => { this.detailPhase = missing ? 'missing' : 'error'; });
    }
  }

  retryDetail(): void {
    if (this.openedId) void this.open(this.openedId);
  }

  closeDetail(): void {
    this.detailPhase = 'idle';
    this.detail = null;
    this.band = null;
  }

  chooseBand(band: AgeBand): void {
    this.band = band;
  }

  clearBand(): void {
    this.band = null;
  }

  dispose(): void {
    this.disposed = true;
    this.version += 1;
  }

  reset(): void {
    this.version += 1;
    this.query = '';
    this.searched = '';
    this.searchPhase = 'idle';
    this.results = [];
    this.crisis = false;
    this.closePhoto();
    this.closeDetail();
  }
}
