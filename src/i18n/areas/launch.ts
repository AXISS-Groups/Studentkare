/**
 * Launch, onboarding and sign-out boards (canvas page 1 and WebLoggedOut), WP-02.
 * English is the source; Telugu and Hindi must define every key (the type
 * enforces it). te/hi are unreviewed first drafts — see REVIEW_STATUS.
 * "Student Kare", "ABHA", "WhatsApp", 112 and helpline names stay in English.
 */
export const launchEn = {
  // Brand wordmark: "Student" + "Kare" (Georgia italic). A name, not translated.
  'launch.brand.student': 'Student',
  'launch.brand.kare': 'Kare',
  'launch.brand.strap': 'Your health, your record',

  // Splash (Main · SplashPulse · SplashVault)
  'launch.splash.pulse.title1': 'Care that keeps',
  'launch.splash.pulse.title2': 'your rhythm.',
  'launch.splash.pulse.body': 'A little care. A healthier every day.',
  'launch.splash.vault.title1': 'Everything for your',
  'launch.splash.vault.title2': 'health, in one place.',
  'launch.splash.vault.body': 'Your records stay yours — you choose who sees them.',
  'launch.splash.chip.label': 'What Student Kare covers',
  'launch.splash.chip.doctors': 'Doctors',
  'launch.splash.chip.labs': 'Lab tests',
  'launch.splash.chip.records': 'Records',
  'launch.splash.art.morning': 'A friendly doctor waving hello',
  'launch.splash.art.afternoon': 'A glossy 3D heart, beating gently',
  'launch.splash.art.evening': 'A small clinic building — care close to your campus',
  'launch.splash.private': 'Private by default',

  // Onboarding 1–3
  'launch.welcome.campusArt': 'A small clinic building — care close to your campus',
  'launch.create.countryCode': '+91',
  'launch.create.phonePlaceholder': '00000 00000',
} as const;

export const launchTe: Record<keyof typeof launchEn, string> = {
  'launch.brand.student': 'Student',
  'launch.brand.kare': 'Kare',
  'launch.brand.strap': 'మీ ఆరోగ్యం, మీ రికార్డు',

  'launch.splash.pulse.title1': 'మీ లయకు తగ్గ',
  'launch.splash.pulse.title2': 'సంరక్షణ.',
  'launch.splash.pulse.body': 'కొంచెం శ్రద్ధ. ప్రతిరోజూ కొంచెం ఆరోగ్యంగా.',
  'launch.splash.vault.title1': 'మీ ఆరోగ్యానికి కావలసినవన్నీ,',
  'launch.splash.vault.title2': 'ఒకే చోట.',
  'launch.splash.vault.body': 'మీ రికార్డులు మీవే — ఎవరు చూడాలో మీరే నిర్ణయిస్తారు.',
  'launch.splash.chip.label': 'Student Kare అందించేవి',
  'launch.splash.chip.doctors': 'డాక్టర్లు',
  'launch.splash.chip.labs': 'ల్యాబ్ పరీక్షలు',
  'launch.splash.chip.records': 'రికార్డులు',
  'launch.splash.art.morning': 'చేయి ఊపుతూ పలకరిస్తున్న డాక్టర్',
  'launch.splash.art.afternoon': 'మెల్లగా కొట్టుకుంటున్న 3D గుండె',
  'launch.splash.art.evening': 'చిన్న క్లినిక్ భవనం — మీ క్యాంపస్‌కు దగ్గరగా సంరక్షణ',
  'launch.splash.private': 'డిఫాల్ట్‌గా ప్రైవేట్',

  'launch.welcome.campusArt': 'చిన్న క్లినిక్ భవనం — మీ క్యాంపస్‌కు దగ్గరగా సంరక్షణ',
  'launch.create.countryCode': '+91',
  'launch.create.phonePlaceholder': '00000 00000',
};

export const launchHi: Record<keyof typeof launchEn, string> = {
  'launch.brand.student': 'Student',
  'launch.brand.kare': 'Kare',
  'launch.brand.strap': 'आपकी सेहत, आपका रिकॉर्ड',

  'launch.splash.pulse.title1': 'आपकी लय के साथ',
  'launch.splash.pulse.title2': 'चलने वाली देखभाल।',
  'launch.splash.pulse.body': 'थोड़ी सी देखभाल। हर दिन थोड़ा और स्वस्थ।',
  'launch.splash.vault.title1': 'आपकी सेहत के लिए सब कुछ,',
  'launch.splash.vault.title2': 'एक ही जगह।',
  'launch.splash.vault.body': 'आपके रिकॉर्ड आपके ही रहते हैं — कौन देखे, यह आप तय करते हैं।',
  'launch.splash.chip.label': 'Student Kare में क्या मिलता है',
  'launch.splash.chip.doctors': 'डॉक्टर',
  'launch.splash.chip.labs': 'लैब टेस्ट',
  'launch.splash.chip.records': 'रिकॉर्ड',
  'launch.splash.art.morning': 'हाथ हिलाकर नमस्ते करता एक डॉक्टर',
  'launch.splash.art.afternoon': 'धीरे-धीरे धड़कता एक 3D दिल',
  'launch.splash.art.evening': 'एक छोटी क्लिनिक इमारत — आपके कैंपस के पास देखभाल',
  'launch.splash.private': 'डिफ़ॉल्ट रूप से निजी',

  'launch.welcome.campusArt': 'एक छोटी क्लिनिक इमारत — आपके कैंपस के पास देखभाल',
  'launch.create.countryCode': '+91',
  'launch.create.phonePlaceholder': '00000 00000',
};
