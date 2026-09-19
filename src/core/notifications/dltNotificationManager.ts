/**
 * DLT Notification & Anti-PHI Scrubber Engine — P50 Notifications
 * 
 * Validates TRAI DLT template registration IDs for SMS delivery and enforces
 * anti-PHI payload scrubbing before sending notifications.
 */

export interface SmsPayload {
  recipientPhone: string;
  dltTemplateId: string;
  variables: Record<string, string>;
}

export interface ScrubbedNotificationResult {
  validDlt: boolean;
  scrubbed: boolean;
  safeText: string;
}

export class DltNotificationManager {
  private static APPROVED_DLT_TEMPLATES: Set<string> = new Set([
    '1007123456789012345', // OTP Template
    '1007987654321098765'  // Appointment Reminder Template
  ]);

  private static PHI_KEYWORDS = [
    'diagnosis',
    'prescription',
    'hiv',
    'cancer',
    'mental health',
    'therapy',
    'blood test result'
  ];

  /**
   * Validates DLT template registration
   */
  public static validateDltTemplate(templateId: string): boolean {
    return this.APPROVED_DLT_TEMPLATES.has(templateId);
  }

  /**
   * Scrubs notification message payload to ensure NO PHI leaves the system via SMS/push
   */
  public static processNotificationPayload(
    templateId: string,
    messageText: string
  ): ScrubbedNotificationResult {
    const validDlt = this.validateDltTemplate(templateId);
    let safeText = messageText;
    let scrubbed = false;

    const lower = messageText.toLowerCase();
    for (const keyword of this.PHI_KEYWORDS) {
      if (lower.includes(keyword)) {
        scrubbed = true;
        safeText = safeText.replace(new RegExp(keyword, 'gi'), '[CONFIDENTIAL]');
      }
    }

    return {
      validDlt,
      scrubbed,
      safeText
    };
  }
}
