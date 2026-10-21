/**
 * Sign in and create account when a delivery channel fails (WhatsApp session
 * down, or no channel at all), the Mobile 2.0 auth hero, and the super-admin
 * WhatsApp connection line. English is the source; te/hi are unreviewed first
 * drafts. "WhatsApp", "OpenWA", "112" and "Tele-MANAS" stay as they are.
 */
export const authChannelsEn = {
  // A send that failed because the channel could not deliver (503)
  'authch.failed.title.WHATSAPP': 'We couldn’t send your code on WhatsApp',
  'authch.failed.title.EMAIL': 'We couldn’t send your code by email',
  'authch.failed.body': 'This is on our side, not yours. Nothing was sent and nothing you typed is lost.',
  'authch.failed.bodyNoOther': 'This is on our side, not yours. Please try again in a few minutes.',
  'authch.failed.useEmail': 'Send the code by email instead',
  'authch.failed.useWhatsapp': 'Send the code on WhatsApp instead',
  'authch.failed.retry': 'Try again',

  // No channel can deliver at all
  'authch.none.title': 'Sign-in codes can’t be sent right now',
  'authch.none.body': 'This is on our side, not yours. Please check again in a little while. If you need help now, you don’t need an account to call.',
  'authch.none.retry': 'Check again',
  'authch.none.checking': 'Checking…',

  // Options could not be read: the form still works, the send answers
  'authch.optionsError': 'We couldn’t check how codes are sent right now. You can still try.',

  // Sign in: no account uses this address or number
  'authch.noAccount.title': 'No account uses this yet',
  'authch.noAccount.body': 'Check what you typed, or create an account — it takes a minute.',

  // Inline field errors
  'authch.errorTitle': 'Something went wrong',

  // Hero (one design for sign in and create account)
  'authch.hero.eyebrow': 'Your health, your account',

  // Super admin: Integrations
  'authch.admin.wa.connected': 'WhatsApp session connected — students are offered WhatsApp codes.',
  'authch.admin.wa.notConnected': 'Configured but not connected — re-link the WhatsApp session in OpenWA (scan its QR code). Students are offered email codes until then.',
  'authch.admin.wa.notConfigured': 'Not configured — students are offered email codes only.',
  'authch.admin.wa.label': 'WhatsApp',
};

export const authChannelsTe: Record<keyof typeof authChannelsEn, string> = {
  'authch.failed.title.WHATSAPP': 'WhatsAppలో మీ కోడ్ పంపలేకపోయాము',
  'authch.failed.title.EMAIL': 'ఈమెయిల్‌లో మీ కోడ్ పంపలేకపోయాము',
  'authch.failed.body': 'ఇది మా వైపు సమస్య, మీది కాదు. ఏదీ పంపలేదు, మీరు టైప్ చేసినది పోలేదు.',
  'authch.failed.bodyNoOther': 'ఇది మా వైపు సమస్య, మీది కాదు. కొన్ని నిమిషాల్లో మళ్లీ ప్రయత్నించండి.',
  'authch.failed.useEmail': 'బదులుగా ఈమెయిల్‌లో కోడ్ పంపండి',
  'authch.failed.useWhatsapp': 'బదులుగా WhatsAppలో కోడ్ పంపండి',
  'authch.failed.retry': 'మళ్లీ ప్రయత్నించండి',
  'authch.none.title': 'ప్రస్తుతం సైన్-ఇన్ కోడ్‌లు పంపలేము',
  'authch.none.body': 'ఇది మా వైపు సమస్య, మీది కాదు. కాసేపటి తర్వాత మళ్లీ చూడండి. ఇప్పుడే సహాయం కావాలంటే, కాల్ చేయడానికి ఖాతా అవసరం లేదు.',
  'authch.none.retry': 'మళ్లీ చూడండి',
  'authch.none.checking': 'చూస్తున్నాం…',
  'authch.optionsError': 'కోడ్‌లు ఎలా పంపాలో ఇప్పుడు చూడలేకపోయాము. అయినా మీరు ప్రయత్నించవచ్చు.',
  'authch.noAccount.title': 'దీనితో ఇంకా ఏ ఖాతా లేదు',
  'authch.noAccount.body': 'మీరు టైప్ చేసినది చూడండి, లేదా ఖాతా సృష్టించండి — ఒక నిమిషం పడుతుంది.',
  'authch.errorTitle': 'ఏదో తప్పు జరిగింది',
  'authch.hero.eyebrow': 'మీ ఆరోగ్యం, మీ ఖాతా',
  'authch.admin.wa.connected': 'WhatsApp సెషన్ కనెక్ట్ అయింది — విద్యార్థులకు WhatsApp కోడ్‌లు అందుతాయి.',
  'authch.admin.wa.notConnected': 'కాన్ఫిగర్ అయింది కానీ కనెక్ట్ కాలేదు — OpenWAలో WhatsApp సెషన్‌ను మళ్లీ లింక్ చేయండి (దాని QR కోడ్ స్కాన్ చేయండి). అప్పటివరకు విద్యార్థులకు ఈమెయిల్ కోడ్‌లు మాత్రమే.',
  'authch.admin.wa.notConfigured': 'కాన్ఫిగర్ కాలేదు — విద్యార్థులకు ఈమెయిల్ కోడ్‌లు మాత్రమే.',
  'authch.admin.wa.label': 'WhatsApp',
};

export const authChannelsHi: Record<keyof typeof authChannelsEn, string> = {
  'authch.failed.title.WHATSAPP': 'हम WhatsApp पर आपका कोड नहीं भेज सके',
  'authch.failed.title.EMAIL': 'हम ईमेल पर आपका कोड नहीं भेज सके',
  'authch.failed.body': 'यह हमारी तरफ़ की दिक्कत है, आपकी नहीं। कुछ नहीं भेजा गया और आपने जो लिखा वह सुरक्षित है।',
  'authch.failed.bodyNoOther': 'यह हमारी तरफ़ की दिक्कत है, आपकी नहीं। कुछ मिनट बाद फिर कोशिश करें।',
  'authch.failed.useEmail': 'इसके बजाय ईमेल पर कोड भेजें',
  'authch.failed.useWhatsapp': 'इसके बजाय WhatsApp पर कोड भेजें',
  'authch.failed.retry': 'फिर कोशिश करें',
  'authch.none.title': 'अभी साइन-इन कोड नहीं भेजे जा सकते',
  'authch.none.body': 'यह हमारी तरफ़ की दिक्कत है, आपकी नहीं। थोड़ी देर बाद फिर देखें। अभी मदद चाहिए तो कॉल करने के लिए खाते की ज़रूरत नहीं है।',
  'authch.none.retry': 'फिर देखें',
  'authch.none.checking': 'देख रहे हैं…',
  'authch.optionsError': 'अभी यह नहीं देख सके कि कोड कैसे भेजे जाते हैं। आप फिर भी कोशिश कर सकते हैं।',
  'authch.noAccount.title': 'इससे अभी कोई खाता नहीं है',
  'authch.noAccount.body': 'जो लिखा है उसे जाँचें, या खाता बनाएँ — एक मिनट लगता है।',
  'authch.errorTitle': 'कुछ गड़बड़ हो गई',
  'authch.hero.eyebrow': 'आपकी सेहत, आपका खाता',
  'authch.admin.wa.connected': 'WhatsApp सेशन जुड़ा है — छात्रों को WhatsApp कोड मिलते हैं।',
  'authch.admin.wa.notConnected': 'कॉन्फ़िगर है पर जुड़ा नहीं — OpenWA में WhatsApp सेशन फिर से लिंक करें (उसका QR कोड स्कैन करें)। तब तक छात्रों को ईमेल कोड ही मिलेंगे।',
  'authch.admin.wa.notConfigured': 'कॉन्फ़िगर नहीं — छात्रों को सिर्फ़ ईमेल कोड मिलेंगे।',
  'authch.admin.wa.label': 'WhatsApp',
};
