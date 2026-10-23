/**
 * Wellness logs: water, activity, weight & BMI, today's doses, and the step
 * counter card.
 *
 * `wellness.msg.<CODE>` is the copy for each message code the wellness and dose
 * endpoints send (`backend/services/wellness_messages.py`). The server sends
 * `{ code, message, values }`; show `t('wellness.msg.' + code, values)` and use
 * `message` (English) only for a code missing here. Placeholders such as
 * `{days}` or `{max}` are filled from `values`, which come from the settings
 * registry, so no number is written into this copy. A backend test keeps the
 * codes and placeholders here equal to the server's.
 *
 * English is the source; Telugu and Hindi must define every key (the type
 * enforces it). te/hi are unreviewed first drafts — see REVIEW_STATUS.
 */
export const wellnessEn = {
  // Step counter card (profile)
  'wellness.stepCounter.title': 'Step counter',
  'wellness.stepCounter.note': 'Steps are not used to set targets, burn estimates or reward points.',
  'wellness.stepCounter.notConnectedTitle': 'Step counter not connected',
  'wellness.stepCounter.notConnectedBody': 'No step source is connected to this device, so no steps are shown. Nothing here is estimated.',

  // Server messages, by code
  'wellness.msg.TIMEZONE_REQUIRED': 'Include the timezone with the time.',
  'wellness.msg.ENTRY_IN_FUTURE': 'An entry cannot be dated in the future.',
  'wellness.msg.ENTRY_TOO_OLD': 'An entry can be at most {days} days old.',
  'wellness.msg.WATER_AMOUNT_OUT_OF_RANGE': 'Enter an amount between {min} and {max} ml.',
  'wellness.msg.WATER_GOAL_OUT_OF_RANGE': 'Choose a daily goal between {min} and {max} ml.',
  'wellness.msg.NO_WATER_TODAY': 'No water logged today.',
  'wellness.msg.ACTIVITY_EMPTY': 'Enter at least one activity value.',
  'wellness.msg.ACTIVITY_DAY_IN_FUTURE': 'Activity cannot be entered for a future day.',
  'wellness.msg.ACTIVITY_DAY_TOO_OLD': 'Activity can be entered for the last {days} days.',
  'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE': 'Enter a value between {min} and {max}.',
  'wellness.msg.NO_ACTIVITY_FOR_DAY': 'No activity entered for that day.',
  'wellness.msg.BODY_EMPTY': 'Enter a weight, a height, or both.',
  'wellness.msg.WEIGHT_OUT_OF_RANGE': 'Enter a weight between {min} and {max} kg.',
  'wellness.msg.HEIGHT_OUT_OF_RANGE': 'Enter a height between {min} and {max} cm.',
  'wellness.msg.BMI_REFERENCE': 'WHO cut-offs for Asian populations (2004). Shown for information only.',
  'wellness.msg.BMI_BAND_BELOW': 'Below {below}',
  'wellness.msg.BMI_BAND_BETWEEN': '{from}–{to}',
  'wellness.msg.BMI_BAND_FROM': '{from} and above',
  'wellness.msg.TIMES_PER_DAY_OUT_OF_RANGE': 'Choose between {min} and {max} doses a day.',
  'wellness.msg.MEDICATION_NOT_FOUND': 'Medication not found.',
  'wellness.msg.DOSE_NOT_FOUND': 'Dose not found.',
  'wellness.msg.DOSE_UNDO_TOO_LATE': 'A dose can be undone only within {minutes} minutes of logging it.',
  'wellness.msg.DOSE_RECORDED': 'Dose recorded for today.',
  'wellness.msg.DOSE_SKIPPED': 'Dose marked as skipped for today.',
  'wellness.msg.DOSE_ALREADY_LOGGED_TODAY': 'Dose already logged today for this medication.',
  'wellness.msg.DOSES_ALL_LOGGED_TODAY': 'Every planned dose is already logged today for this medication.',
  'wellness.msg.DOSE_ALREADY_LOGGED': 'Dose already logged.',
} as const;

export const wellnessTe: Record<keyof typeof wellnessEn, string> = {
  'wellness.stepCounter.title': 'అడుగుల లెక్కింపు',
  'wellness.stepCounter.note': 'అడుగులను లక్ష్యాలు పెట్టడానికి, కేలరీల అంచనాలకు లేదా రివార్డ్ పాయింట్లకు ఉపయోగించము.',
  'wellness.stepCounter.notConnectedTitle': 'అడుగుల లెక్కింపు కనెక్ట్ కాలేదు',
  'wellness.stepCounter.notConnectedBody': 'ఈ పరికరానికి అడుగుల సమాచార మూలం ఏదీ కనెక్ట్ కాలేదు, కాబట్టి అడుగులు చూపబడవు. ఇక్కడ ఏదీ అంచనా వేయబడలేదు.',

  'wellness.msg.TIMEZONE_REQUIRED': 'సమయంతో పాటు టైమ్‌జోన్‌ను కూడా ఇవ్వండి.',
  'wellness.msg.ENTRY_IN_FUTURE': 'ఎంట్రీకి భవిష్యత్ తేదీ ఇవ్వలేరు.',
  'wellness.msg.ENTRY_TOO_OLD': 'ఎంట్రీ గరిష్ఠంగా {days} రోజుల పాతది కావచ్చు.',
  'wellness.msg.WATER_AMOUNT_OUT_OF_RANGE': '{min} నుండి {max} ml మధ్య మొత్తం నమోదు చేయండి.',
  'wellness.msg.WATER_GOAL_OUT_OF_RANGE': '{min} నుండి {max} ml మధ్య రోజువారీ లక్ష్యం ఎంచుకోండి.',
  'wellness.msg.NO_WATER_TODAY': 'ఈ రోజు నీరు నమోదు కాలేదు.',
  'wellness.msg.ACTIVITY_EMPTY': 'కనీసం ఒక యాక్టివిటీ విలువ నమోదు చేయండి.',
  'wellness.msg.ACTIVITY_DAY_IN_FUTURE': 'భవిష్యత్ రోజుకు యాక్టివిటీ నమోదు చేయలేరు.',
  'wellness.msg.ACTIVITY_DAY_TOO_OLD': 'గత {days} రోజులకు మాత్రమే యాక్టివిటీ నమోదు చేయవచ్చు.',
  'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE': '{min} నుండి {max} మధ్య విలువ నమోదు చేయండి.',
  'wellness.msg.NO_ACTIVITY_FOR_DAY': 'ఆ రోజుకు యాక్టివిటీ ఏదీ నమోదు కాలేదు.',
  'wellness.msg.BODY_EMPTY': 'బరువు, ఎత్తు లేదా రెండూ నమోదు చేయండి.',
  'wellness.msg.WEIGHT_OUT_OF_RANGE': '{min} నుండి {max} kg మధ్య బరువు నమోదు చేయండి.',
  'wellness.msg.HEIGHT_OUT_OF_RANGE': '{min} నుండి {max} cm మధ్య ఎత్తు నమోదు చేయండి.',
  'wellness.msg.BMI_REFERENCE': 'ఆసియా జనాభాకు WHO కట్-ఆఫ్‌లు (2004). సమాచారం కోసం మాత్రమే చూపబడింది.',
  'wellness.msg.BMI_BAND_BELOW': '{below} కంటే తక్కువ',
  'wellness.msg.BMI_BAND_BETWEEN': '{from}–{to}',
  'wellness.msg.BMI_BAND_FROM': '{from} మరియు అంతకంటే ఎక్కువ',
  'wellness.msg.TIMES_PER_DAY_OUT_OF_RANGE': 'రోజుకు {min} నుండి {max} డోసుల మధ్య ఎంచుకోండి.',
  'wellness.msg.MEDICATION_NOT_FOUND': 'మందు కనబడలేదు.',
  'wellness.msg.DOSE_NOT_FOUND': 'డోసు కనబడలేదు.',
  'wellness.msg.DOSE_UNDO_TOO_LATE': 'డోసు నమోదు చేసిన {minutes} నిమిషాలలోపు మాత్రమే దాన్ని రద్దు చేయవచ్చు.',
  'wellness.msg.DOSE_RECORDED': 'ఈ రోజు డోసు నమోదు అయింది.',
  'wellness.msg.DOSE_SKIPPED': 'ఈ రోజు డోసు దాటవేసినట్లు గుర్తించబడింది.',
  'wellness.msg.DOSE_ALREADY_LOGGED_TODAY': 'ఈ మందుకు ఈ రోజు డోసు ఇప్పటికే నమోదు అయింది.',
  'wellness.msg.DOSES_ALL_LOGGED_TODAY': 'ఈ మందుకు ఈ రోజు ప్లాన్ చేసిన ప్రతి డోసు ఇప్పటికే నమోదు అయింది.',
  'wellness.msg.DOSE_ALREADY_LOGGED': 'డోసు ఇప్పటికే నమోదు అయింది.',
};

export const wellnessHi: Record<keyof typeof wellnessEn, string> = {
  'wellness.stepCounter.title': 'कदम गिनती',
  'wellness.stepCounter.note': 'कदमों का उपयोग लक्ष्य तय करने, कैलोरी अनुमान या रिवॉर्ड पॉइंट के लिए नहीं किया जाता।',
  'wellness.stepCounter.notConnectedTitle': 'कदम गिनती कनेक्ट नहीं है',
  'wellness.stepCounter.notConnectedBody': 'इस डिवाइस से कदमों का कोई स्रोत कनेक्ट नहीं है, इसलिए कोई कदम नहीं दिखाए जाते। यहाँ कुछ भी अनुमानित नहीं है।',

  'wellness.msg.TIMEZONE_REQUIRED': 'समय के साथ टाइमज़ोन भी दें।',
  'wellness.msg.ENTRY_IN_FUTURE': 'किसी एंट्री की तारीख भविष्य की नहीं हो सकती।',
  'wellness.msg.ENTRY_TOO_OLD': 'एंट्री अधिकतम {days} दिन पुरानी हो सकती है।',
  'wellness.msg.WATER_AMOUNT_OUT_OF_RANGE': '{min} से {max} ml के बीच मात्रा दर्ज करें।',
  'wellness.msg.WATER_GOAL_OUT_OF_RANGE': '{min} से {max} ml के बीच दैनिक लक्ष्य चुनें।',
  'wellness.msg.NO_WATER_TODAY': 'आज कोई पानी दर्ज नहीं हुआ।',
  'wellness.msg.ACTIVITY_EMPTY': 'कम से कम एक गतिविधि मान दर्ज करें।',
  'wellness.msg.ACTIVITY_DAY_IN_FUTURE': 'भविष्य के दिन के लिए गतिविधि दर्ज नहीं की जा सकती।',
  'wellness.msg.ACTIVITY_DAY_TOO_OLD': 'गतिविधि केवल पिछले {days} दिनों के लिए दर्ज की जा सकती है।',
  'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE': '{min} से {max} के बीच मान दर्ज करें।',
  'wellness.msg.NO_ACTIVITY_FOR_DAY': 'उस दिन के लिए कोई गतिविधि दर्ज नहीं है।',
  'wellness.msg.BODY_EMPTY': 'वज़न, लंबाई या दोनों दर्ज करें।',
  'wellness.msg.WEIGHT_OUT_OF_RANGE': '{min} से {max} kg के बीच वज़न दर्ज करें।',
  'wellness.msg.HEIGHT_OUT_OF_RANGE': '{min} से {max} cm के बीच लंबाई दर्ज करें।',
  'wellness.msg.BMI_REFERENCE': 'एशियाई आबादी के लिए WHO कट-ऑफ़ (2004)। केवल जानकारी के लिए दिखाया गया।',
  'wellness.msg.BMI_BAND_BELOW': '{below} से कम',
  'wellness.msg.BMI_BAND_BETWEEN': '{from}–{to}',
  'wellness.msg.BMI_BAND_FROM': '{from} और उससे अधिक',
  'wellness.msg.TIMES_PER_DAY_OUT_OF_RANGE': 'दिन में {min} से {max} खुराक के बीच चुनें।',
  'wellness.msg.MEDICATION_NOT_FOUND': 'दवा नहीं मिली।',
  'wellness.msg.DOSE_NOT_FOUND': 'खुराक नहीं मिली।',
  'wellness.msg.DOSE_UNDO_TOO_LATE': 'खुराक दर्ज करने के {minutes} मिनट के भीतर ही उसे वापस लिया जा सकता है।',
  'wellness.msg.DOSE_RECORDED': 'आज की खुराक दर्ज हो गई।',
  'wellness.msg.DOSE_SKIPPED': 'आज की खुराक छोड़ी गई के रूप में दर्ज की गई।',
  'wellness.msg.DOSE_ALREADY_LOGGED_TODAY': 'इस दवा की आज की खुराक पहले ही दर्ज है।',
  'wellness.msg.DOSES_ALL_LOGGED_TODAY': 'इस दवा की आज की हर नियोजित खुराक पहले ही दर्ज है।',
  'wellness.msg.DOSE_ALREADY_LOGGED': 'खुराक पहले ही दर्ज है।',
};
