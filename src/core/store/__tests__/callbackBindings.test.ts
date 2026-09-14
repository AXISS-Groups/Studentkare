import { describe, expect, it } from 'vitest';
import { AppStores } from '@/store/AppStores';
import { CampViewModel } from '@/features/camp/viewmodel/CampViewModel';
import { ChatViewModel } from '@/features/chat/viewmodel/ChatViewModel';

describe('observable callbacks passed to views', () => {
  it('retains store ownership for destructured callbacks', () => {
    const stores = new AppStores();
    const { updateStudent } = stores.student;
    const { triggerEmergency, cancelEmergency } = stores.emergency;
    updateStudent({ fullName: 'Callback test' });
    triggerEmergency();
    expect(stores.student.student.fullName).toBe('Callback test');
    expect(stores.emergency.emergencyActive).toBe(true);
    cancelEmergency();
    expect(stores.emergency.emergencyActive).toBe(false);
  });
  it('retains ViewModel ownership for text inputs', () => {
    const stores = new AppStores();
    const camp = new CampViewModel(stores.camp, stores.student);
    const chat = new ChatViewModel(stores.chat);
    const { setDoctorNote } = camp;
    const { setInputText } = chat;
    setDoctorNote('Reviewed');
    setInputText('Question for my clinician');
    expect(camp.doctorNoteInput).toBe('Reviewed');
    expect(chat.inputText).toBe('Question for my clinician');
  });
});
