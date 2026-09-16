import { makeAutoObservable } from 'mobx';
import { initialStudent } from '@/data/mockData';
import type { StudentProfile, LanguageCode } from '@/types';

/**
 * Domain store for the signed-in student profile and UI preferences.
 * Platform-agnostic (no DOM / no React) so it runs on web and native alike.
 */
export class StudentStore {
  student: StudentProfile = initialStudent;
  language: LanguageCode = 'EN';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setStudent(student: StudentProfile): void {
    this.student = student;
  }

  updateStudent(updates: Partial<StudentProfile>): void {
    this.student = { ...this.student, ...updates };
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
  }

  addPoints(points: number): void {
    this.student = { ...this.student, pointsBalance: this.student.pointsBalance + points };
  }
}
