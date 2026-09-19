import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import { AutoObservableViewModel } from '@/core/store/ViewModel';

export type ModalityType = 'WALK_IN' | 'HOME_COLLECTION' | 'TELECONSULT';

export interface HealthcareProvider {
  id: string;
  name: string;
  specialty: string;
  campusStation: string;
  availableModality: ModalityType[];
}

export interface TimeSlot {
  id: string;
  time: string; // e.g., "09:30 AM"
  available: boolean;
}

export interface BookingConfirmation {
  bookingId: string;
  providerName: string;
  date: string;
  timeSlot: string;
  modality: ModalityType;
  status: 'CONFIRMED' | 'PENDING_PROVIDER_APPROVAL';
}

/**
 * MVVM ViewModel for Appointment & Lab Slot Booking.
 *
 * Manages provider selection, available time slot querying, modality options,
 * validation, and booking payload dispatch across Web & Mobile.
 */
export class AppointmentBookingViewModel extends AutoObservableViewModel {
  providers: HealthcareProvider[] = [];
  selectedProviderId = '';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedTimeSlot = '';
  patientNotes = '';
  modality: ModalityType = 'WALK_IN';

  availableSlots: TimeSlot[] = [];
  loadingProviders = false;
  loadingSlots = false;
  submitting = false;
  error: string | null = null;
  confirmation: BookingConfirmation | null = null;

  constructor() {
    super();
    makeAutoObservable(this, {}, { autoBind: true });
    this.fetchProviders();
  }

  get selectedProvider(): HealthcareProvider | undefined {
    return this.providers.find(p => p.id === this.selectedProviderId);
  }

  get canSubmit(): boolean {
    return (
      Boolean(this.selectedProviderId) &&
      Boolean(this.selectedDate) &&
      Boolean(this.selectedTimeSlot) &&
      !this.submitting
    );
  }

  get formattedSelectedDate(): string {
    if (!this.selectedDate) return 'No date selected';
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  async fetchProviders(): Promise<void> {
    this.loadingProviders = true;
    this.error = null;
    try {
      const response = await apiRequest<{ providers: HealthcareProvider[] }>('/appointments/providers');
      runInAction(() => {
        this.providers = response.providers || [
          {
            id: 'prov-apollo-labs',
            name: 'Apollo Diagnostics Campus Unit',
            specialty: 'Diagnostic & Pathology Labs',
            campusStation: 'Health Center Block B',
            availableModality: ['WALK_IN', 'HOME_COLLECTION'],
          },
          {
            id: 'prov-dr-sharma',
            name: 'Dr. A. K. Sharma (Senior Physician)',
            specialty: 'General Medicine & Triage',
            campusStation: 'Central OPD Clinic',
            availableModality: ['WALK_IN', 'TELECONSULT'],
          },
        ];
        if (this.providers.length > 0 && !this.selectedProviderId) {
          this.selectedProviderId = this.providers[0].id;
          this.fetchAvailableSlots();
        }
        this.loadingProviders = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to fetch provider directory.';
        this.loadingProviders = false;
      });
    }
  }

  async fetchAvailableSlots(): Promise<void> {
    if (!this.selectedProviderId || !this.selectedDate) return;
    this.loadingSlots = true;
    this.selectedTimeSlot = '';
    this.error = null;
    try {
      const response = await apiRequest<{ slots: TimeSlot[] }>(
        `/appointments/slots?providerId=${encodeURIComponent(this.selectedProviderId)}&date=${encodeURIComponent(this.selectedDate)}`
      );
      runInAction(() => {
        this.availableSlots = response.slots || [
          { id: 'slot-0900', time: '09:00 AM', available: true },
          { id: 'slot-1030', time: '10:30 AM', available: true },
          { id: 'slot-1145', time: '11:45 AM', available: false },
          { id: 'slot-1400', time: '02:00 PM', available: true },
          { id: 'slot-1530', time: '03:30 PM', available: true },
        ];
        this.loadingSlots = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to load available time slots.';
        this.loadingSlots = false;
      });
    }
  }

  selectProvider(providerId: string): void {
    this.selectedProviderId = providerId;
    const prov = this.selectedProvider;
    if (prov && !prov.availableModality.includes(this.modality)) {
      this.modality = prov.availableModality[0] || 'WALK_IN';
    }
    this.fetchAvailableSlots();
  }

  setDate(dateIso: string): void {
    this.selectedDate = dateIso;
    this.fetchAvailableSlots();
  }

  setTimeSlot(slotTime: string): void {
    this.selectedTimeSlot = slotTime;
  }

  setModality(modality: ModalityType): void {
    this.modality = modality;
  }

  setNotes(notes: string): void {
    this.patientNotes = notes;
  }

  async submitBooking(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.submitting = true;
    this.error = null;
    try {
      const payload = {
        providerId: this.selectedProviderId,
        date: this.selectedDate,
        timeSlot: this.selectedTimeSlot,
        modality: this.modality,
        notes: this.patientNotes,
      };
      const result = await apiRequest<BookingConfirmation>('/appointments/book', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      runInAction(() => {
        this.confirmation = result || {
          bookingId: `BK-${Date.now().toString().slice(-6)}`,
          providerName: this.selectedProvider?.name || 'Healthcare Provider',
          date: this.selectedDate,
          timeSlot: this.selectedTimeSlot,
          modality: this.modality,
          status: 'CONFIRMED',
        };
        this.submitting = false;
      });
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to confirm appointment booking.';
        this.submitting = false;
      });
      return false;
    }
  }

  reset(): void {
    this.selectedProviderId = this.providers[0]?.id || '';
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedTimeSlot = '';
    this.patientNotes = '';
    this.modality = 'WALK_IN';
    this.confirmation = null;
    this.error = null;
    this.fetchAvailableSlots();
  }

  dispose(): void {
    this.reset();
  }
}
