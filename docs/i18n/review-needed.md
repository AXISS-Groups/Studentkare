# Translations waiting for a native reviewer

Telugu (te) and Hindi (hi) strings that were written as drafts and have not been checked by a native speaker.
Work through a table, fix the string in the area file named in its heading (the `...Te` / `...Hi` objects), and
delete the rows you have reviewed; delete a table when it is empty. English is the source and is not reviewed here.

Keep as they are, in every language: placeholders in braces (`{n}`, `{total}`, `{title}`, `{masked}`, `{length}`),
names and numbers ("Student Kare", "Tele-MANAS", "WhatsApp", "PIN", 112, 14416, "1234", "abcd") (DESIGN.md §3).

## authPasscode — sign-in redesign, remembered device, student passcode (PR #211, `src/i18n/areas/authPasscode.ts`)

Notes for the reviewer: a passcode's length is counted in **characters** (te క్యారెక్టర్లు, hi कैरेक्टर), kept apart from
**letters** (te అక్షరాలు, hi अक्षर) in "digits, letters and symbols". `authpc.slide.play` was added in feat/auth-gaps.
`authpc.hero.carousel` and `authpc.hero.slide` are screen-reader role descriptions, not visible text.

### Hero slides

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.hero.label` | What Student Kare does | Student Kare ఏమి చేస్తుంది | Student Kare क्या करता है |
| `authpc.hero.carousel` | carousel | కరోసెల్ | कैरोसेल |
| `authpc.hero.slide` | slide | స్లైడ్ | स्लाइड |
| `authpc.slide.records.eyebrow` | Records | రికార్డులు | रिकॉर्ड |
| `authpc.slide.records.title` | Your health records, in one place | మీ ఆరోగ్య రికార్డులు, ఒకే చోట | आपके हेल्थ रिकॉर्ड, एक जगह |
| `authpc.slide.records.body` | Reports, prescriptions and visit notes stay in one account you own, and stay yours after you graduate. | రిపోర్టులు, ప్రిస్క్రిప్షన్లు, విజిట్ నోట్స్ మీ సొంత ఖాతాలో ఉంటాయి — చదువు పూర్తయ్యాక కూడా మీవే. | रिपोर्ट, प्रिस्क्रिप्शन और विज़िट नोट्स आपके अपने खाते में रहते हैं — और पढ़ाई के बाद भी आपके ही रहते हैं। |
| `authpc.slide.care.eyebrow` | Doctors | డాక్టర్లు | डॉक्टर |
| `authpc.slide.care.title` | A doctor when you need one | అవసరమైనప్పుడు డాక్టర్ | ज़रूरत हो तो डॉक्टर |
| `authpc.slide.care.body` | Find a doctor or clinic and book a consult. You see the price before you pay. | డాక్టర్ లేదా క్లినిక్‌ను కనుగొని కన్సల్ట్ బుక్ చేయండి. చెల్లించే ముందే ధర చూస్తారు. | डॉक्टर या क्लिनिक ढूँढें और कंसल्ट बुक करें। भुगतान से पहले कीमत दिखती है। |
| `authpc.slide.meds.eyebrow` | Medicines & labs | మందులు & ల్యాబ్‌లు | दवाएँ और लैब |
| `authpc.slide.meds.title` | Medicines and lab tests | మందులు మరియు ల్యాబ్ టెస్టులు | दवाएँ और लैब टेस्ट |
| `authpc.slide.meds.body` | Order medicines and book lab tests from partners, and keep the results with your records. | భాగస్వాముల నుండి మందులు ఆర్డర్ చేసి, ల్యాబ్ టెస్టులు బుక్ చేయండి; ఫలితాలు మీ రికార్డులతోనే ఉంటాయి. | पार्टनर्स से दवाएँ मँगाएँ और लैब टेस्ट बुक करें; नतीजे आपके रिकॉर्ड के साथ रहते हैं। |
| `authpc.slide.crisis.eyebrow` | Help | సహాయం | मदद |
| `authpc.slide.crisis.title` | Help, even when signed out | సైన్ అవుట్ అయినా సహాయం | साइन आउट होने पर भी मदद |
| `authpc.slide.crisis.body` | Emergency 112 and Tele-MANAS 14416 are one tap away on every screen. You never need an account to call. | అత్యవసరం 112, Tele-MANAS 14416 ప్రతి స్క్రీన్‌పై ఒక్క ట్యాప్ దూరంలో. కాల్ చేయడానికి ఖాతా అవసరం లేదు. | आपातकाल 112 और Tele-MANAS 14416 हर स्क्रीन पर एक टैप दूर हैं। कॉल करने के लिए खाते की ज़रूरत नहीं। |
| `authpc.slide.position` | Slide {n} of {total} | {total}లో స్లైడ్ {n} | {total} में से स्लाइड {n} |
| `authpc.slide.go` | Show slide {n}: {title} | స్లైడ్ {n} చూపించు: {title} | स्लाइड {n} दिखाएँ: {title} |
| `authpc.slide.pause` | Pause slides | స్లైడ్‌లను ఆపు | स्लाइड रोकें |
| `authpc.slide.play` | Play slides | స్లైడ్‌లను మళ్లీ ప్రారంభించు | स्लाइड फिर से चलाएँ |
| `authpc.slide.paused` | Slides paused | స్లైడ్‌లు ఆపబడ్డాయి | स्लाइड रुकी हैं |

### Page tabs

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.tabs.label` | Sign in or create an account | సైన్ ఇన్ లేదా ఖాతా సృష్టించండి | साइन इन करें या खाता बनाएँ |
| `authpc.tabs.signIn` | Sign in | సైన్ ఇన్ | साइन इन |
| `authpc.tabs.create` | Create account | ఖాతా సృష్టించండి | खाता बनाएँ |

### Remembered device

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.remembered.leadPasscode` | This device remembers your account. Get a code, or use your passcode. | ఈ డివైస్ మీ ఖాతాను గుర్తుంచుకుంటుంది. కోడ్ పొందండి, లేదా మీ పాస్‌కోడ్ వాడండి. | यह डिवाइस आपका खाता याद रखता है। कोड पाएँ, या अपना पासकोड इस्तेमाल करें। |
| `authpc.remembered.who` | Last signed in on this device | ఈ డివైస్‌లో చివరిగా సైన్ ఇన్ అయినది | इस डिवाइस पर पिछली बार साइन इन |
| `authpc.usePasscode` | Use my passcode | నా పాస్‌కోడ్ వాడు | मेरा पासकोड इस्तेमाल करें |

### Passcode sign-in

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.enter.title` | Enter your passcode | మీ పాస్‌కోడ్ నమోదు చేయండి | अपना पासकोड डालें |
| `authpc.enter.lead` | For {masked}. A code always works too. | {masked} కోసం. కోడ్ కూడా ఎప్పుడూ పనిచేస్తుంది. | {masked} के लिए। कोड भी हमेशा काम करता है। |
| `authpc.enter.leadTyped` | For the account you typed. A code always works too. | మీరు టైప్ చేసిన ఖాతా కోసం. కోడ్ కూడా ఎప్పుడూ పనిచేస్తుంది. | आपके टाइप किए खाते के लिए। कोड भी हमेशा काम करता है। |
| `authpc.enter.label` | Passcode | పాస్‌కోడ్ | पासकोड |
| `authpc.enter.hint` | 4, 6 or 8 characters | 4, 6 లేదా 8 క్యారెక్టర్లు | 4, 6 या 8 कैरेक्टर |
| `authpc.enter.show` | Show passcode | పాస్‌కోడ్ చూపించు | पासकोड दिखाएँ |
| `authpc.enter.submit` | Sign in | సైన్ ఇన్ | साइन इन |
| `authpc.enter.signingIn` | Signing in… | సైన్ ఇన్ అవుతోంది… | साइन इन हो रहा है… |
| `authpc.enter.forgot` | Forgot your passcode? Sign in with a code | పాస్‌కోడ్ మర్చిపోయారా? కోడ్‌తో సైన్ ఇన్ చేయండి | पासकोड भूल गए? कोड से साइन इन करें |
| `authpc.enter.useCode` | Send a code instead | బదులుగా కోడ్ పంపండి | इसके बजाय कोड भेजें |
| `authpc.enter.back` | Back | వెనుకకు | वापस |
| `authpc.enter.failedTitle` | That didn’t work | అది పనిచేయలేదు | यह नहीं चला |
| `authpc.enter.otherTitle` | We couldn’t check your passcode | మీ పాస్‌కోడ్‌ను తనిఖీ చేయలేకపోయాం | हम आपका पासकोड जाँच नहीं पाए |
| `authpc.newDevice.title` | Use a code on this device first | ముందు ఈ డివైస్‌లో కోడ్ వాడండి | पहले इस डिवाइस पर कोड इस्तेमाल करें |
| `authpc.newDevice.body` | A passcode only works on a device you’ve signed in on before. Sign in with a code once; after that, your passcode works here. | ముందు సైన్ ఇన్ అయిన డివైస్‌లో మాత్రమే పాస్‌కోడ్ పనిచేస్తుంది. ఒకసారి కోడ్‌తో సైన్ ఇన్ చేయండి; ఆ తర్వాత మీ పాస్‌కోడ్ ఇక్కడ పనిచేస్తుంది. | पासकोड सिर्फ़ उसी डिवाइस पर काम करता है जिस पर आप पहले साइन इन कर चुके हैं। एक बार कोड से साइन इन करें; उसके बाद आपका पासकोड यहाँ काम करेगा। |
| `authpc.newDevice.action` | Send me a code | నాకు కోడ్ పంపండి | मुझे कोड भेजें |
| `authpc.disabled` | Signing in with a passcode is turned off right now. Use a code. | పాస్‌కోడ్‌తో సైన్ ఇన్ ప్రస్తుతం ఆఫ్‌లో ఉంది. కోడ్ వాడండి. | पासकोड से साइन इन अभी बंद है। कोड इस्तेमाल करें। |
| `authpc.needId` | Type your email or number first, then choose “Use my passcode”. | ముందు మీ ఈమెయిల్ లేదా నంబర్ టైప్ చేసి, తర్వాత “నా పాస్‌కోడ్ వాడు” ఎంచుకోండి. | पहले अपना ईमेल या नंबर टाइप करें, फिर “मेरा पासकोड इस्तेमाल करें” चुनें। |

### Set, change, reset

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.set.eyebrow` | Optional | ఐచ్ఛికం | वैकल्पिक |
| `authpc.set.title.add` | Add a secret passcode | రహస్య పాస్‌కోడ్ జోడించండి | गुप्त पासकोड जोड़ें |
| `authpc.set.title.change` | Change your passcode | మీ పాస్‌కోడ్ మార్చండి | अपना पासकोड बदलें |
| `authpc.set.title.reset` | Set a new passcode | కొత్త పాస్‌కోడ్ సెట్ చేయండి | नया पासकोड सेट करें |
| `authpc.set.lead` | Next time on this device, sign in with your passcode instead of waiting for a code. A code always works too. | తర్వాతిసారి ఈ డివైస్‌లో, కోడ్ కోసం ఎదురుచూడకుండా పాస్‌కోడ్‌తో సైన్ ఇన్ చేయండి. కోడ్ కూడా ఎప్పుడూ పనిచేస్తుంది. | अगली बार इस डिवाइस पर कोड का इंतज़ार किए बिना पासकोड से साइन इन करें। कोड भी हमेशा काम करता है। |
| `authpc.set.lengthsTitle` | Pick a length | పొడవు ఎంచుకోండి | लंबाई चुनें |
| `authpc.set.len4` | 4 characters: the weakest. Someone nearby could guess it. | 4 క్యారెక్టర్లు: అత్యంత బలహీనం. దగ్గరలో ఉన్నవారు ఊహించగలరు. | 4 कैरेक्टर: सबसे कमज़ोर। पास बैठा कोई अंदाज़ा लगा सकता है। |
| `authpc.set.len6` | 6 characters: better. | 6 క్యారెక్టర్లు: మెరుగు. | 6 कैरेक्टर: बेहतर। |
| `authpc.set.len8` | 8 characters: recommended. | 8 క్యారెక్టర్లు: సిఫార్సు చేయబడింది. | 8 कैरेक्टर: सुझाया गया। |
| `authpc.set.mix` | Any mix of digits, letters and symbols. Not your phone number, email, name or birthday. | అంకెలు, అక్షరాలు, గుర్తులు ఏ కలయికైనా. మీ ఫోన్ నంబర్, ఈమెయిల్, పేరు లేదా పుట్టినరోజు వద్దు. | अंक, अक्षर और चिह्न, किसी भी मेल में। आपका फ़ोन नंबर, ईमेल, नाम या जन्मदिन नहीं। |
| `authpc.set.current` | Current passcode | ప్రస్తుత పాస్‌కోడ్ | मौजूदा पासकोड |
| `authpc.set.currentHint` | Forgot it? Sign out and sign in with a code, then set a new one without it. | మర్చిపోయారా? సైన్ అవుట్ చేసి కోడ్‌తో సైన్ ఇన్ చేయండి, తర్వాత అది లేకుండానే కొత్తది సెట్ చేయండి. | भूल गए? साइन आउट करके कोड से साइन इन करें, फिर उसके बिना नया सेट करें। |
| `authpc.set.new` | New passcode | కొత్త పాస్‌కోడ్ | नया पासकोड |
| `authpc.set.confirm` | Type it again | మళ్లీ టైప్ చేయండి | फिर से टाइप करें |
| `authpc.set.mismatch` | The two passcodes don’t match. | రెండు పాస్‌కోడ్‌లు సరిపోలలేదు. | दोनों पासकोड मेल नहीं खाते। |
| `authpc.set.badLength` | A passcode is exactly 4, 6 or 8 characters. | పాస్‌కోడ్ సరిగ్గా 4, 6 లేదా 8 క్యారెక్టర్లు ఉండాలి. | पासकोड ठीक 4, 6 या 8 कैरेक्टर का होता है। |
| `authpc.set.badChars` | Use digits, letters and symbols only (no spaces). | అంకెలు, అక్షరాలు, గుర్తులు మాత్రమే వాడండి (ఖాళీలు వద్దు). | सिर्फ़ अंक, अक्षर और चिह्न इस्तेमाल करें (स्पेस नहीं)। |
| `authpc.set.weak.COMMON` | That one is too common. Pick something only you would know. | అది చాలా సాధారణం. మీకు మాత్రమే తెలిసినది ఎంచుకోండి. | यह बहुत आम है। कुछ ऐसा चुनें जो सिर्फ़ आप जानते हों। |
| `authpc.set.weak.REPEATED` | Too many repeated characters, or a repeated pattern. | ఒకే క్యారెక్టర్ చాలాసార్లు ఉంది, లేదా ఒకే నమూనా మళ్లీ మళ్లీ వస్తోంది. | एक ही कैरेक्टर बहुत बार है, या एक ही पैटर्न दोहराया गया है। |
| `authpc.set.weak.SEQUENCE` | That’s a run (like 1234 or abcd) or a keyboard row. | అది వరుస (1234 లేదా abcd లాంటిది) లేదా కీబోర్డ్ వరుస. | यह एक क्रम है (जैसे 1234 या abcd) या कीबोर्ड की पंक्ति। |
| `authpc.set.weak.PERSONAL` | Don’t use your phone number, email, name or birthday. | మీ ఫోన్ నంబర్, ఈమెయిల్, పేరు లేదా పుట్టినరోజు వాడకండి. | अपना फ़ोन नंबर, ईमेल, नाम या जन्मदिन इस्तेमाल न करें। |
| `authpc.set.proof` | Enter your current passcode, or sign in again with a code to set a new one. | మీ ప్రస్తుత పాస్‌కోడ్ నమోదు చేయండి, లేదా కొత్తది సెట్ చేయడానికి కోడ్‌తో మళ్లీ సైన్ ఇన్ చేయండి. | अपना मौजूदा पासकोड डालें, या नया सेट करने के लिए कोड से फिर साइन इन करें। |
| `authpc.set.failed` | We couldn’t save your passcode. This is on our side; try again. | మీ పాస్‌కోడ్‌ను సేవ్ చేయలేకపోయాం. ఇది మా వైపు సమస్య; మళ్లీ ప్రయత్నించండి. | हम आपका पासकोड सेव नहीं कर पाए। गड़बड़ी हमारी तरफ़ है; फिर कोशिश करें। |
| `authpc.set.save` | Save passcode | పాస్‌కోడ్ సేవ్ చేయండి | पासकोड सेव करें |
| `authpc.set.saving` | Saving… | సేవ్ అవుతోంది… | सेव हो रहा है… |
| `authpc.set.skip` | Not now | ఇప్పుడు కాదు | अभी नहीं |
| `authpc.set.saved` | Your passcode is saved. Next time on this device, choose “Use my passcode”. | మీ పాస్‌కోడ్ సేవ్ అయింది. తర్వాతిసారి ఈ డివైస్‌లో “నా పాస్‌కోడ్ వాడు” ఎంచుకోండి. | आपका पासकोड सेव हो गया। अगली बार इस डिवाइस पर “मेरा पासकोड इस्तेमाल करें” चुनें। |
| `authpc.set.continue` | Continue | కొనసాగించండి | आगे बढ़ें |
| `authpc.set.remove` | Turn off passcode | పాస్‌కోడ్ ఆఫ్ చేయండి | पासकोड बंद करें |
| `authpc.set.removed` | Passcode turned off. You’ll sign in with a code. | పాస్‌కోడ్ ఆఫ్ అయింది. మీరు కోడ్‌తో సైన్ ఇన్ చేస్తారు. | पासकोड बंद हो गया। आप कोड से साइन इन करेंगे। |
| `authpc.set.never` | We never ask for your passcode by phone, email or WhatsApp. | మేము ఫోన్, ఈమెయిల్ లేదా WhatsAppలో మీ పాస్‌కోడ్ ఎప్పుడూ అడగము. | हम फ़ोन, ईमेल या WhatsApp पर कभी आपका पासकोड नहीं माँगते। |
| `authpc.set.loading` | Loading your passcode settings | మీ పాస్‌కోడ్ సెట్టింగ్‌లు లోడ్ అవుతున్నాయి | आपकी पासकोड सेटिंग लोड हो रही है |
| `authpc.set.loadFailed` | We couldn’t load your passcode settings. | మీ పాస్‌కోడ్ సెట్టింగ్‌లు లోడ్ చేయలేకపోయాం. | हम आपकी पासकोड सेटिंग लोड नहीं कर पाए। |
| `authpc.set.off` | Passcodes are turned off right now. You can keep signing in with a code. | పాస్‌కోడ్‌లు ప్రస్తుతం ఆఫ్‌లో ఉన్నాయి. మీరు కోడ్‌తో సైన్ ఇన్ చేస్తూనే ఉండవచ్చు. | पासकोड अभी बंद हैं। आप कोड से साइन इन करते रह सकते हैं। |
| `authpc.set.studentsOnly` | Passcodes are for student accounts. Team accounts use their PIN on the staff page. | పాస్‌కోడ్‌లు విద్యార్థి ఖాతాల కోసం. టీమ్ ఖాతాలు స్టాఫ్ పేజీలో తమ PIN వాడతాయి. | पासकोड छात्र खातों के लिए हैं। टीम खाते स्टाफ़ पेज पर अपना PIN इस्तेमाल करते हैं। |
| `authpc.set.region` | Your passcode | మీ పాస్‌కోడ్ | आपका पासकोड |

### Strength hint

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.strength.label` | Strength | బలం | मज़बूती |
| `authpc.strength.empty` | Type a passcode to see how strong it is. | ఎంత బలంగా ఉందో చూడటానికి పాస్‌కోడ్ టైప్ చేయండి. | कितना मज़बूत है, देखने के लिए पासकोड टाइप करें। |
| `authpc.strength.weak` | Weak: 4 characters is the weakest | బలహీనం: 4 క్యారెక్టర్లు అత్యంత బలహీనం | कमज़ोर: 4 कैरेक्टर सबसे कमज़ोर है |
| `authpc.strength.fair` | Fair: 8 characters is recommended | పర్వాలేదు: 8 క్యారెక్టర్లు సిఫార్సు చేయబడింది | ठीक-ठाक: 8 कैरेक्टर सुझाए जाते हैं |
| `authpc.strength.strong` | Strong | బలంగా ఉంది | मज़बूत |

### Sign-in & security card, Account ready

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `authpc.card.title` | Secret passcode | రహస్య పాస్‌కోడ్ | गुप्त पासकोड |
| `authpc.card.lead` | Optional. Sign in on your own devices without waiting for a code. | ఐచ్ఛికం. కోడ్ కోసం ఎదురుచూడకుండా మీ సొంత డివైస్‌లలో సైన్ ఇన్ చేయండి. | वैकल्पिक। अपने डिवाइस पर कोड का इंतज़ार किए बिना साइन इन करें। |
| `authpc.card.on` | On · {length} characters | ఆన్ · {length} క్యారెక్టర్లు | चालू · {length} कैरेक्टर |
| `authpc.card.off` | Off | ఆఫ్ | बंद |
| `authpc.card.add` | Add a passcode | పాస్‌కోడ్ జోడించండి | पासकोड जोड़ें |
| `authpc.card.change` | Change or turn off | మార్చండి లేదా ఆఫ్ చేయండి | बदलें या बंद करें |
| `authpc.ready.title` | Want a faster sign-in? | వేగంగా సైన్ ఇన్ కావాలా? | तेज़ साइन इन चाहिए? |
| `authpc.ready.body` | Add an optional passcode for your own devices. | మీ సొంత డివైస్‌ల కోసం ఐచ్ఛిక పాస్‌కోడ్ జోడించండి. | अपने डिवाइस के लिए एक वैकल्पिक पासकोड जोड़ें। |
| `authpc.ready.cta` | Add a passcode | పాస్‌కోడ్ జోడించండి | पासकोड जोड़ें |

### Ayush: nothing found, and the admin health card (feat/ayush-fix, 2026-10-22)

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `assist.ayush.noSource.title` | I couldn’t find this in StudentKare’s help yet. | దీని గురించి StudentKare సహాయంలో ఇంకా సమాచారం దొరకలేదు. | यह मुझे अभी StudentKare की मदद में नहीं मिला। |
| `assist.ayush.noSource.next` | Help answers questions about the app. A doctor can answer anything about your health. | యాప్ గురించిన ప్రశ్నలకు సహాయ కేంద్రం జవాబిస్తుంది. మీ ఆరోగ్యం గురించి ఏదైనా డాక్టర్ చెప్పగలరు. | ऐप से जुड़े सवालों का जवाब मदद केंद्र देता है। आपकी सेहत से जुड़ी कोई भी बात डॉक्टर बता सकते हैं। |
| `assist.ayush.noSource.help` | Open Help | సహాయం తెరవండి | मदद खोलें |
| `assist.ayush.noSource.book` | Book a consult | కన్సల్ట్ బుక్ చేయండి | कंसल्ट बुक करें |
| `admin.kb.health.title` | Ayush health | Ayush ఆరోగ్యం | Ayush की स्थिति |
| `admin.kb.health.pill.ok` | Answering | సమాధానాలు ఇస్తోంది | जवाब दे रहा है |
| `admin.kb.health.pill.attention` | Needs a look | చూడాలి | देखना ज़रूरी |
| `admin.kb.health.pill.down` | Not answering | సమాధానాలు ఇవ్వడం లేదు | जवाब नहीं दे रहा |
| `admin.kb.health.ok` | Ayush is answering from published sources. | ప్రచురించిన సోర్స్‌ల నుంచి Ayush సమాధానాలు ఇస్తోంది. | Ayush प्रकाशित स्रोतों से जवाब दे रहा है। |
| `admin.kb.health.attention` | Ayush is answering, but something needs a look. | Ayush సమాధానాలు ఇస్తోంది, కానీ ఒకటి చూడాలి. | Ayush जवाब दे रहा है, पर कुछ देखना ज़रूरी है। |
| `admin.kb.health.down` | Ayush can’t answer anything yet. No published source is indexed, so every question gets “I couldn’t find this”. Load the help pack or publish a source. | Ayush ఇంకా దేనికీ సమాధానం ఇవ్వలేదు. ప్రచురించిన ఏ సోర్స్ ఇండెక్స్‌లో లేదు, కాబట్టి ప్రతి ప్రశ్నకు “దొరకలేదు” అని వస్తుంది. హెల్ప్ ప్యాక్ లోడ్ చేయండి లేదా సోర్స్ ప్రచురించండి. | Ayush अभी किसी सवाल का जवाब नहीं दे सकता। कोई प्रकाशित स्रोत इंडेक्स में नहीं है, इसलिए हर सवाल पर “नहीं मिला” आता है। हेल्प पैक लोड करें या स्रोत प्रकाशित करें। |
| `admin.kb.health.loading` | Checking Ayush… | Ayushను చెక్ చేస్తున్నాం… | Ayush की जाँच हो रही है… |
| `admin.kb.health.error` | Couldn’t check Ayush | Ayushను చెక్ చేయలేకపోయాం | Ayush की जाँच नहीं हो सकी |
| `admin.kb.health.published` | Sources published | ప్రచురించిన సోర్స్‌లు | प्रकाशित स्रोत |
| `admin.kb.health.indexed` | Sources indexed | ఇండెక్స్ అయిన సోర్స్‌లు | इंडेक्स हुए स्रोत |
| `admin.kb.health.helpPack` | StudentKare help articles live | లైవ్‌లో ఉన్న StudentKare హెల్ప్ ఆర్టికల్స్ | लाइव StudentKare मदद लेख |
| `admin.kb.health.retrieval` | How Ayush finds sources | Ayush సోర్స్‌లను ఎలా వెతుకుతుంది | Ayush स्रोत कैसे ढूँढता है |
| `admin.kb.health.retrievalKeyword` | Keyword matching (no semantic model on) | కీవర్డ్ మ్యాచింగ్ (సెమాంటిక్ మోడల్ ఆన్‌లో లేదు) | कीवर्ड मिलान (सिमैंटिक मॉडल चालू नहीं) |
| `admin.kb.health.retrievalSemantic` | Semantic search · {model} | సెమాంటిక్ సెర్చ్ · {model} | सिमैंटिक खोज · {model} |
| `admin.kb.health.retrievalDegraded` | Semantic model not answering · {count} passages on keyword matching | సెమాంటిక్ మోడల్ స్పందించడం లేదు · {count} భాగాలు కీవర్డ్ మ్యాచింగ్‌పై | सिमैंटिक मॉडल जवाब नहीं दे रहा · {count} अंश कीवर्ड मिलान पर |
| `admin.kb.health.misconfigured` | EMBEDDING_PROVIDER is set to “{provider}”, which can’t be used here, so Ayush uses keyword matching. See the Ayush operations guide. | EMBEDDING_PROVIDER “{provider}”గా సెట్ అయింది, ఇది ఇక్కడ పనిచేయదు, కాబట్టి Ayush కీవర్డ్ మ్యాచింగ్ వాడుతుంది. Ayush ఆపరేషన్స్ గైడ్ చూడండి. | EMBEDDING_PROVIDER “{provider}” पर सेट है, जो यहाँ काम नहीं करता, इसलिए Ayush कीवर्ड मिलान करता है। Ayush ऑपरेशन्स गाइड देखें। |
| `admin.kb.health.answers` | How Ayush answers | Ayush ఎలా సమాధానం ఇస్తుంది | Ayush कैसे जवाब देता है |
| `admin.kb.health.answersQuotes` | Quotes the source word for word (no model on) | సోర్స్‌ను యథాతథంగా ఉటంకిస్తుంది (మోడల్ ఆన్‌లో లేదు) | स्रोत को शब्दशः उद्धृत करता है (मॉडल चालू नहीं) |
| `admin.kb.health.answersRephrased` | Rephrased by the on-prem model · {model} | ఆన్-ప్రెమ్ మోడల్ తిరిగి రాస్తుంది · {model} | ऑन-प्रेम मॉडल दोबारा लिखता है · {model} |
| `admin.kb.health.modelServer` | Model server | మోడల్ సర్వర్ | मॉडल सर्वर |
| `admin.kb.health.modelOk` | Reachable | అందుబాటులో ఉంది | पहुँच में है |
| `admin.kb.health.modelDown` | Not reachable · answers fall back to quotes | అందుబాటులో లేదు · సమాధానాలు ఉటంకింపులకు మారతాయి | पहुँच में नहीं · जवाब उद्धरण पर लौटते हैं |
| `admin.kb.health.modelNotPulled` | Reachable, but {model} is not pulled | అందుబాటులో ఉంది, కానీ {model} పుల్ చేయలేదు | पहुँच में है, पर {model} पुल नहीं हुआ |
| `admin.kb.health.recent` | Last answers | చివరి సమాధానాలు | पिछले जवाब |
| `admin.kb.health.recentValue` | {rephrased} rephrased · {quoted} quoted · {fellBack} fell back to quotes | {rephrased} తిరిగి రాసినవి · {quoted} ఉటంకించినవి · {fellBack} ఉటంకింపుకు మారినవి | {rephrased} दोबारा लिखे · {quoted} उद्धृत · {fellBack} उद्धरण पर लौटे |
| `admin.kb.health.lastError` | Last error | చివరి లోపం | पिछली गड़बड़ी |
| `admin.kb.health.noError` | None since the server started | సర్వర్ మొదలైనప్పటి నుంచి ఏదీ లేదు | सर्वर शुरू होने के बाद कोई नहीं |
| `admin.kb.health.errorValue` | {error} while {where} · {when} | {where} సమయంలో {error} · {when} | {where} के दौरान {error} · {when} |
| `admin.kb.health.where.embedding` | embedding a question | ప్రశ్నను ఎంబెడ్ చేస్తున్నప్పుడు | सवाल एम्बेड करते |
| `admin.kb.health.where.generation` | rephrasing an answer | సమాధానాన్ని తిరిగి రాస్తున్నప్పుడు | जवाब दोबारा लिखते |
| `admin.kb.health.where.indexing` | indexing a source | సోర్స్‌ను ఇండెక్స్ చేస్తున్నప్పుడు | स्रोत इंडेक्स करते |
| `admin.kb.health.where.retrieval` | searching sources | సోర్స్‌లు వెతుకుతున్నప్పుడు | स्रोत खोजते |
| `admin.kb.health.where.startup` | starting up | ప్రారంభమవుతున్నప్పుడు | शुरू होते |
