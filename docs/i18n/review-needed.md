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

## camps — health camp booking (feat/health-camps, `src/i18n/areas/camps.ts`)

Notes for the reviewer: "slot" is the booked time window (te స్లాట్, hi स्लॉट); "waitlist" stays a loanword
(te వెయిట్‌లిస్ట్, hi वेटलिस्ट). "Booking reference" is the 8-character code a student quotes at the camp desk, not a
pass. `camps.host.*` is console copy for campus administrators and partners. "CSV" stays in English.

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `camps.title` | Health camps | ఆరోగ్య శిబిరాలు | हेल्थ कैंप |
| `camps.eyebrow` | Campus health | క్యాంపస్ ఆరోగ్యం | कैंपस हेल्थ |
| `camps.body` | Checkups your campus runs. Book a slot, then change or cancel it up to {hours} hours before. | మీ క్యాంపస్ నిర్వహించే చెకప్‌లు. ఒక స్లాట్ బుక్ చేయండి; {hours} గంటల ముందు వరకు మార్చవచ్చు లేదా రద్దు చేయవచ్చు. | आपके कैंपस के चेकअप। स्लॉट बुक करें, फिर {hours} घंटे पहले तक बदलें या रद्द करें। |
| `camps.offline` | You’re offline. Booking, changing and cancelling need a connection. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. బుక్ చేయడానికి, మార్చడానికి, రద్దు చేయడానికి కనెక్షన్ అవసరం. | आप ऑफ़लाइन हैं। बुक करने, बदलने और रद्द करने के लिए कनेक्शन चाहिए। |
| `camps.yours` | Your bookings | మీ బుకింగ్‌లు | आपकी बुकिंग |
| `camps.upcoming` | Upcoming camps | రాబోయే శిబిరాలు | आने वाले कैंप |
| `camps.ended` | Cancelled | రద్దయినవి | रद्द |
| `camps.loading` | Loading health camps | ఆరోగ్య శిబిరాలు లోడ్ అవుతున్నాయి | हेल्थ कैंप लोड हो रहे हैं |
| `camps.bookingsLoading` | Loading your bookings | మీ బుకింగ్‌లు లోడ్ అవుతున్నాయి | आपकी बुकिंग लोड हो रही है |
| `camps.failed` | Camps couldn’t load | శిబిరాలు లోడ్ కాలేదు | कैंप लोड नहीं हो सके |
| `camps.bookingsFailed` | Your bookings couldn’t load | మీ బుకింగ్‌లు లోడ్ కాలేదు | आपकी बुकिंग लोड नहीं हो सकी |
| `camps.failedBody` | This is on our side, not yours. Try again. | ఇది మా వైపు సమస్య, మీది కాదు. మళ్లీ ప్రయత్నించండి. | गड़बड़ी हमारी तरफ़ है, आपकी नहीं। फिर से कोशिश करें। |
| `camps.noBookings` | You haven’t booked a camp yet. | మీరు ఇంకా ఏ శిబిరమూ బుక్ చేయలేదు. | आपने अभी तक कोई कैंप बुक नहीं किया है। |
| `camps.emptyTitle` | No camps on your campus yet | మీ క్యాంపస్‌లో ఇంకా శిబిరాలు లేవు | आपके कैंपस पर अभी कोई कैंप नहीं |
| `camps.emptyBody` | When your campus or one of its partner clinics sets up a camp, it shows here. | మీ క్యాంపస్ లేదా దాని భాగస్వామి క్లినిక్ శిబిరం ఏర్పాటు చేసినప్పుడు, అది ఇక్కడ కనిపిస్తుంది. | जब आपका कैंपस या उसका कोई पार्टनर क्लिनिक कैंप लगाएगा, वह यहाँ दिखेगा। |
| `camps.findCare` | Find care near you | మీ దగ్గర వైద్య సేవలు కనుగొనండి | अपने पास इलाज खोजें |
| `camps.findCamp` | Find a camp to book | బుక్ చేయడానికి శిబిరం కనుగొనండి | बुक करने के लिए कैंप खोजें |
| `camps.services` | Services at this camp | ఈ శిబిరంలో సేవలు | इस कैंप की सेवाएँ |
| `camps.free` | Free | ఉచితం | मुफ़्त |
| `camps.placesLeft` | {n} places left | {n} స్థానాలు మిగిలి ఉన్నాయి | {n} जगह बाकी |
| `camps.full` | Every slot is full | అన్ని స్లాట్‌లు నిండిపోయాయి | सभी स्लॉट भर गए |
| `camps.seeSlots` | See slots | స్లాట్‌లు చూడండి | स्लॉट देखें |
| `camps.alreadyHave` | You have a place at this camp. See Your bookings. | ఈ శిబిరంలో మీకు స్థానం ఉంది. మీ బుకింగ్‌లు చూడండి. | इस कैंप में आपकी जगह है। आपकी बुकिंग देखें। |
| `camps.bring` | Bring: {items} | తీసుకురండి: {items} | साथ लाएँ: {items} |
| `camps.pickSlot` | Pick a slot | ఒక స్లాట్ ఎంచుకోండి | स्लॉट चुनें |
| `camps.slotRange` | {start} – {end} | {start} – {end} | {start} – {end} |
| `camps.slotsLoading` | Loading slots | స్లాట్‌లు లోడ్ అవుతున్నాయి | स्लॉट लोड हो रहे हैं |
| `camps.slotsFailed` | Slots couldn’t load | స్లాట్‌లు లోడ్ కాలేదు | स्लॉट लोड नहीं हो सके |
| `camps.noSlots` | This camp has no bookable slots. | ఈ శిబిరంలో బుక్ చేయగల స్లాట్‌లు లేవు. | इस कैंप में बुक करने लायक कोई स्लॉट नहीं है। |
| `camps.slot.left` | {n} left | {n} మిగిలాయి | {n} बाकी |
| `camps.slot.full` | Full | నిండింది | भरा हुआ |
| `camps.slot.fullWait` | Full · join the waitlist | నిండింది · వెయిట్‌లిస్ట్‌లో చేరండి | भरा हुआ · वेटलिस्ट में जुड़ें |
| `camps.slot.started` | Already started | ఇప్పటికే మొదలైంది | शुरू हो चुका |
| `camps.slot.yours` | Your slot | మీ స్లాట్ | आपका स्लॉट |
| `camps.book` | Book this slot | ఈ స్లాట్ బుక్ చేయండి | यह स्लॉट बुक करें |
| `camps.joinWaitlist` | Join the waitlist | వెయిట్‌లిస్ట్‌లో చేరండి | वेटलिस्ट में जुड़ें |
| `camps.moveHere` | Move to this slot | ఈ స్లాట్‌కు మార్చండి | इस स्लॉट में बदलें |
| `camps.notNow` | Not now | ఇప్పుడు కాదు | अभी नहीं |
| `camps.waitExplain` | If a place opens in this slot, you’re booked into it in the order you joined, and we tell you in the app. | ఈ స్లాట్‌లో స్థానం ఖాళీ అయితే, మీరు చేరిన క్రమంలో మీకు బుక్ అవుతుంది, యాప్‌లో మీకు తెలియజేస్తాం. | इस स्लॉट में जगह खाली हुई तो जुड़ने के क्रम में आपकी बुकिंग हो जाएगी, और हम ऐप में बताएँगे। |
| `camps.changeTitle` | Change your slot | మీ స్లాట్ మార్చండి | अपना स्लॉट बदलें |
| `camps.status.booked` | Booked | బుక్ అయింది | बुक है |
| `camps.status.waitlisted` | Waitlist · {n} | వెయిట్‌లిస్ట్ · {n} | वेटलिस्ट · {n} |
| `camps.bookingRef` | Booking reference | బుకింగ్ రిఫరెన్స్ | बुकिंग रेफ़रेंस |
| `camps.waitRef` | Waitlist reference | వెయిట్‌లిస్ట్ రిఫరెన్స్ | वेटलिस्ट रेफ़रेंस |
| `camps.waitBody` | You’re booked in automatically if a place opens. Nothing to do until then. | స్థానం ఖాళీ అయితే మీకు ఆటోమేటిక్‌గా బుక్ అవుతుంది. అప్పటి వరకు ఏమీ చేయనక్కర్లేదు. | जगह खाली होते ही आपकी बुकिंग अपने आप हो जाएगी। तब तक कुछ करने की ज़रूरत नहीं। |
| `camps.change` | Change slot | స్లాట్ మార్చండి | स्लॉट बदलें |
| `camps.cancel` | Cancel booking | బుకింగ్ రద్దు చేయండి | बुकिंग रद्द करें |
| `camps.leaveWaitlist` | Leave the waitlist | వెయిట్‌లిస్ట్ నుండి తప్పుకోండి | वेटलिस्ट छोड़ें |
| `camps.changeUntil` | You can change or cancel until {when}. | {when} వరకు మార్చవచ్చు లేదా రద్దు చేయవచ్చు. | {when} तक बदल या रद्द कर सकते हैं। |
| `camps.tooLate` | It’s less than {hours} hours to your slot, so it can’t be changed in the app. Tell the camp desk instead. | మీ స్లాట్‌కు {hours} గంటల కంటే తక్కువ సమయం ఉంది, కాబట్టి యాప్‌లో మార్చలేరు. శిబిరం డెస్క్‌కు చెప్పండి. | आपके स्लॉट में {hours} घंटे से कम बचे हैं, इसलिए ऐप में बदलाव नहीं हो सकता। कैंप डेस्क को बताएँ। |
| `camps.checkedIn` | You’ve checked in at this camp. | మీరు ఈ శిబిరంలో చెక్ ఇన్ అయ్యారు. | आप इस कैंप में चेक इन कर चुके हैं। |
| `camps.openDay` | Open camp day | శిబిరం రోజు తెరవండి | कैंप का दिन खोलें |
| `camps.calledOff` | Called off by the camp: {reason} | శిబిరం రద్దు చేయబడింది: {reason} | कैंप ने रद्द किया: {reason} |
| `camps.youCancelled` | You cancelled this booking. | మీరు ఈ బుకింగ్ రద్దు చేశారు. | आपने यह बुकिंग रद्द की। |
| `camps.privacy` | Your campus and the camp’s partner see how many students booked each slot, never who. | ప్రతి స్లాట్‌కు ఎంతమంది బుక్ చేశారో మీ క్యాంపస్‌కు, శిబిరం భాగస్వామికి తెలుస్తుంది — ఎవరు అనేది ఎప్పుడూ కాదు. | आपका कैंपस और कैंप का पार्टनर देखते हैं कि हर स्लॉट में कितने छात्रों ने बुक किया, कौन — यह कभी नहीं। |
| `camps.ineligible.NOT_VERIFIED` | This camp is for students their campus has verified. | ఈ శిబిరం క్యాంపస్ ధృవీకరించిన విద్యార్థుల కోసం. | यह कैंप उन छात्रों के लिए है जिन्हें कैंपस ने वेरिफ़ाई किया है। |
| `camps.verifyNow` | Verify your campus | మీ క్యాంపస్‌ను ధృవీకరించండి | अपना कैंपस वेरिफ़ाई करें |
| `camps.confirm.title` | Cancel this camp booking? | ఈ శిబిరం బుకింగ్ రద్దు చేయాలా? | यह कैंप बुकिंग रद्द करें? |
| `camps.confirm.body` | Your place goes to the next student waiting, if there is one. You can book again while places are left. | మీ స్థానం వేచి ఉన్న తదుపరి విద్యార్థికి వెళ్తుంది. స్థానాలు మిగిలి ఉంటే మళ్లీ బుక్ చేయవచ్చు. | आपकी जगह इंतज़ार कर रहे अगले छात्र को मिलेगी। जगह बाकी रहने तक आप फिर से बुक कर सकते हैं। |
| `camps.confirm.leaveTitle` | Leave the waitlist? | వెయిట్‌లిస్ట్ నుండి తప్పుకోవాలా? | वेटलिस्ट छोड़ें? |
| `camps.confirm.leaveBody` | You lose your place in the queue for this slot. | ఈ స్లాట్ క్యూలో మీ స్థానం పోతుంది. | इस स्लॉट की कतार में आपकी जगह चली जाएगी। |
| `camps.confirm.keep` | Keep it | అలాగే ఉంచండి | रहने दें |
| `camps.confirm.busy` | Cancelling… | రద్దు చేస్తున్నాం… | रद्द कर रहे हैं… |
| `camps.done.cancelled` | Done. Your place is cancelled. | పూర్తైంది. మీ స్థానం రద్దయింది. | हो गया। आपकी जगह रद्द हो गई। |
| `camps.done.changed` | Your slot is changed. Your booking reference is new. | మీ స్లాట్ మారింది. మీ బుకింగ్ రిఫరెన్స్ కొత్తది. | आपका स्लॉट बदल गया। आपका बुकिंग रेफ़रेंस नया है। |
| `camps.done.waitlist` | You’re on the waitlist. | మీరు వెయిట్‌లిస్ట్‌లో ఉన్నారు. | आप वेटलिस्ट में हैं। |
| `camps.service.GENERAL_SCREENING` | General health check | సాధారణ ఆరోగ్య పరీక్ష | सामान्य हेल्थ चेक |
| `camps.service.EYE_CHECK` | Eye check | కంటి పరీక్ష | आँखों की जाँच |
| `camps.service.DENTAL_CHECK` | Dental check | దంత పరీక్ష | दाँतों की जाँच |
| `camps.service.BLOOD_DONATION` | Blood donation | రక్తదానం | रक्तदान |
| `camps.service.VACCINATION` | Vaccination | టీకా | टीकाकरण |
| `camps.err.SLOT_FULL` | That slot just filled up. Pick another, or join its waitlist. | ఆ స్లాట్ ఇప్పుడే నిండింది. మరొకటి ఎంచుకోండి లేదా దాని వెయిట్‌లిస్ట్‌లో చేరండి. | वह स्लॉट अभी भर गया। दूसरा चुनें या उसकी वेटलिस्ट में जुड़ें। |
| `camps.err.SLOT_OPEN` | That slot has room now. Book it instead. | ఆ స్లాట్‌లో ఇప్పుడు స్థానం ఉంది. దాన్ని బుక్ చేయండి. | उस स्लॉट में अब जगह है। उसे बुक करें। |
| `camps.err.SLOT_STARTED` | That slot has already started. Pick a later one. | ఆ స్లాట్ ఇప్పటికే మొదలైంది. తర్వాతి స్లాట్ ఎంచుకోండి. | वह स्लॉट शुरू हो चुका है। बाद का स्लॉट चुनें। |
| `camps.err.WAITLIST_FULL` | The waitlist for that slot is full. | ఆ స్లాట్ వెయిట్‌లిస్ట్ నిండింది. | उस स्लॉट की वेटलिस्ट भर गई है। |
| `camps.err.TOO_LATE` | It’s too close to your slot to change it in the app. Tell the camp desk instead. | మీ స్లాట్‌కు చాలా దగ్గరగా ఉంది, యాప్‌లో మార్చలేరు. శిబిరం డెస్క్‌కు చెప్పండి. | आपके स्लॉट में बहुत कम समय बचा है, ऐप में बदलाव नहीं हो सकता। कैंप डेस्क को बताएँ। |
| `camps.err.CHECKED_IN` | You’ve checked in, so this booking can’t be changed. | మీరు చెక్ ఇన్ అయ్యారు, కాబట్టి ఈ బుకింగ్ మార్చలేరు. | आप चेक इन कर चुके हैं, इसलिए यह बुकिंग नहीं बदल सकती। |
| `camps.err.SAME_SLOT` | That’s already your slot. | అది ఇప్పటికే మీ స్లాట్. | यह पहले से आपका स्लॉट है। |
| `camps.err.NOT_VERIFIED` | This camp is for verified students. Verify your campus first. | ఈ శిబిరం ధృవీకరించిన విద్యార్థుల కోసం. ముందు మీ క్యాంపస్‌ను ధృవీకరించండి. | यह कैंप वेरिफ़ाइड छात्रों के लिए है। पहले अपना कैंपस वेरिफ़ाई करें। |
| `camps.err.OTHER_CAMPUS` | This camp is for students of another campus. | ఈ శిబిరం మరొక క్యాంపస్ విద్యార్థుల కోసం. | यह कैंप किसी दूसरे कैंपस के छात्रों के लिए है। |
| `camps.err.NOT_STUDENT` | Only students can book a health camp. | విద్యార్థులు మాత్రమే ఆరోగ్య శిబిరం బుక్ చేయగలరు. | सिर्फ़ छात्र ही हेल्थ कैंप बुक कर सकते हैं। |
| `camps.err.PAYMENT_NOT_AVAILABLE` | Paying for a camp in the app isn’t available yet. | యాప్‌లో శిబిరానికి చెల్లించడం ఇంకా అందుబాటులో లేదు. | ऐप में कैंप का भुगतान अभी उपलब्ध नहीं है। |
| `camps.err.SERVICE_HELD` | Vaccination and blood donation camps need a clinical review before they can be offered. | టీకా, రక్తదాన శిబిరాలు అందించే ముందు క్లినికల్ సమీక్ష అవసరం. | टीकाकरण और रक्तदान कैंप पेश करने से पहले क्लिनिकल समीक्षा ज़रूरी है। |
| `camps.err.PAID_CAMPS_OFF` | Paid camps aren’t available yet. Make the camp free. | చెల్లింపు శిబిరాలు ఇంకా అందుబాటులో లేవు. శిబిరాన్ని ఉచితం చేయండి. | पेड कैंप अभी उपलब्ध नहीं हैं। कैंप को मुफ़्त रखें। |
| `camps.err.offline` | You’re offline. Try again when you’re connected. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. కనెక్ట్ అయ్యాక మళ్లీ ప్రయత్నించండి. | आप ऑफ़लाइन हैं। कनेक्ट होने पर फिर कोशिश करें। |
| `camps.err.generic` | That didn’t work. This is on our side, not yours. Try again. | అది జరగలేదు. ఇది మా వైపు సమస్య, మీది కాదు. మళ్లీ ప్రయత్నించండి. | यह नहीं हो पाया। गड़बड़ी हमारी तरफ़ है, आपकी नहीं। फिर से कोशिश करें। |
| `camps.host.partnerEyebrow` | Partner · campus health | భాగస్వామి · క్యాంపస్ ఆరోగ్యం | पार्टनर · कैंपस हेल्थ |
| `camps.host.emptyBody` | Set up a camp: a date, a place on campus, the services and bookable slots. | ఒక శిబిరం ఏర్పాటు చేయండి: తేదీ, క్యాంపస్‌లో స్థలం, సేవలు, బుక్ చేయగల స్లాట్‌లు. | एक कैंप तय करें: तारीख, कैंपस पर जगह, सेवाएँ और बुक करने लायक स्लॉट। |
| `camps.host.scopeCampus` | Counts per slot only, never who booked. A count under the campus minimum group is withheld. | ప్రతి స్లాట్‌కు సంఖ్యలు మాత్రమే, ఎవరు బుక్ చేశారో ఎప్పుడూ కాదు. క్యాంపస్ కనీస గ్రూప్ కంటే తక్కువ సంఖ్య దాచబడుతుంది. | सिर्फ़ हर स्लॉट की गिनती, किसने बुक किया यह कभी नहीं। कैंपस के न्यूनतम समूह से कम गिनती छिपाई जाती है। |
| `camps.host.scopePartner` | Counts per slot for the camps you run, never who booked. | మీరు నిర్వహించే శిబిరాలకు ప్రతి స్లాట్ సంఖ్యలు, ఎవరు బుక్ చేశారో ఎప్పుడూ కాదు. | आपके कैंपों के हर स्लॉट की गिनती, किसने बुक किया यह कभी नहीं। |
| `camps.host.footnote` | Check-in by scanning a pass, and results from a camp, are waiting for clinical review. Students check themselves in on the camp day. | పాస్ స్కాన్ చేసి చెక్ ఇన్, శిబిరం ఫలితాలు క్లినికల్ సమీక్ష కోసం వేచి ఉన్నాయి. శిబిరం రోజు విద్యార్థులు తామే చెక్ ఇన్ అవుతారు. | पास स्कैन करके चेक इन और कैंप के नतीजे क्लिनिकल समीक्षा की प्रतीक्षा में हैं। कैंप के दिन छात्र खुद चेक इन करते हैं। |
| `camps.host.noAccess` | Only campus administrators, clinic and lab partners and super admins can run health camps. | క్యాంపస్ నిర్వాహకులు, క్లినిక్ మరియు ల్యాబ్ భాగస్వాములు, సూపర్ అడ్మిన్‌లు మాత్రమే ఆరోగ్య శిబిరాలు నిర్వహించగలరు. | सिर्फ़ कैंपस एडमिन, क्लिनिक और लैब पार्टनर और सुपर एडमिन ही हेल्थ कैंप चला सकते हैं। |
| `camps.host.stat.upcoming` | Upcoming camps | రాబోయే శిబిరాలు | आने वाले कैंप |
| `camps.host.stat.pending` | Waiting for approval | ఆమోదం కోసం వేచి ఉన్నవి | मंज़ूरी की प्रतीक्षा में |
| `camps.host.stat.booked` | Booked, upcoming | బుక్ అయినవి, రాబోయేవి | बुक, आने वाले |
| `camps.host.stat.ofPlaces` | of {n} places | {n} స్థానాలలో | {n} जगहों में से |
| `camps.host.stat.checkedToday` | Checked in today | ఈరోజు చెక్ ఇన్ | आज चेक इन |
| `camps.host.status.pending` | Waiting for approval | ఆమోదం కోసం వేచి ఉంది | मंज़ूरी की प्रतीक्षा |
| `camps.host.status.declined` | Declined | తిరస్కరించబడింది | अस्वीकार |
| `camps.host.status.cancelled` | Called off | రద్దు చేయబడింది | रद्द |
| `camps.host.cancelledBecause` | Called off: {reason} | రద్దు చేయబడింది: {reason} | रद्द: {reason} |
| `camps.host.elig.CAMPUS_VERIFIED` | Verified students of this campus | ఈ క్యాంపస్ ధృవీకరించిన విద్యార్థులు | इस कैंपस के वेरिफ़ाइड छात्र |
| `camps.host.elig.CAMPUS_ANY` | Every student of this campus | ఈ క్యాంపస్ విద్యార్థులందరూ | इस कैंपस के सभी छात्र |
| `camps.host.elig.OPEN` | Every student | విద్యార్థులందరూ | सभी छात्र |
| `camps.host.metric.waitlist` | Waitlist | వెయిట్‌లిస్ట్ | वेटलिस्ट |
| `camps.host.metric.checkedIn` | Checked in | చెక్ ఇన్ | चेक इन |
| `camps.host.col.slot` | Slot | స్లాట్ | स्लॉट |
| `camps.host.col.cancelled` | Cancelled | రద్దయినవి | रद्द |
| `camps.host.showSlots` | Bookings by slot | స్లాట్ వారీగా బుకింగ్‌లు | स्लॉट के हिसाब से बुकिंग |
| `camps.host.hideSlots` | Hide bookings | బుకింగ్‌లు దాచండి | बुकिंग छिपाएँ |
| `camps.host.slotsCaption` | Bookings by slot for {camp} | {camp} కోసం స్లాట్ వారీగా బుకింగ్‌లు | {camp} की स्लॉट के हिसाब से बुकिंग |
| `camps.host.noNames` | Students’ names aren’t shown here. | విద్యార్థుల పేర్లు ఇక్కడ చూపబడవు. | छात्रों के नाम यहाँ नहीं दिखाए जाते। |
| `camps.host.export` | Export CSV | CSV ఎగుమతి చేయండి | CSV एक्सपोर्ट करें |
| `camps.host.approve` | Approve | ఆమోదించండి | मंज़ूर करें |
| `camps.host.decline` | Decline | తిరస్కరించండి | अस्वीकार करें |
| `camps.host.approved` | Approved. Students of the campus can see it and book. | ఆమోదించబడింది. క్యాంపస్ విద్యార్థులు దాన్ని చూసి బుక్ చేయగలరు. | मंज़ूर। कैंपस के छात्र इसे देखकर बुक कर सकते हैं। |
| `camps.host.declined` | Declined. The partner is told. | తిరస్కరించబడింది. భాగస్వామికి తెలియజేశాం. | अस्वीकार। पार्टनर को बता दिया गया है। |
| `camps.host.cancelCamp` | Call off camp | శిబిరం రద్దు చేయండి | कैंप रद्द करें |
| `camps.host.cancelTitle` | Call off {camp}? | {camp} రద్దు చేయాలా? | {camp} रद्द करें? |
| `camps.host.cancelBody` | Every booking and waitlist place is cancelled, and each student is told in the app. | ప్రతి బుకింగ్, వెయిట్‌లిస్ట్ స్థానం రద్దవుతుంది, ప్రతి విద్యార్థికి యాప్‌లో తెలియజేస్తాం. | हर बुकिंग और वेटलिस्ट की जगह रद्द होगी, और हर छात्र को ऐप में बताया जाएगा। |
| `camps.host.cancelReason` | Why (students see this) | ఎందుకు (విద్యార్థులు ఇది చూస్తారు) | क्यों (छात्र यह देखेंगे) |
| `camps.host.cancelHint` | Plain words, no names. For example: “The hall is closed for repairs.” | సరళమైన మాటలు, పేర్లు వద్దు. ఉదాహరణకు: “మరమ్మతుల కోసం హాల్ మూసి ఉంది.” | सीधे शब्द, कोई नाम नहीं। जैसे: “मरम्मत के कारण हॉल बंद है।” |
| `camps.host.cancelConfirm` | Call off camp | శిబిరం రద్దు చేయండి | कैंप रद्द करें |
| `camps.host.cancelled` | Camp called off. Every student who booked is told. | శిబిరం రద్దయింది. బుక్ చేసిన ప్రతి విద్యార్థికి తెలియజేశాం. | कैंप रद्द हुआ। बुक करने वाले हर छात्र को बताया गया है। |
| `camps.host.actionFailed` | That didn’t go through. {ref} | అది జరగలేదు. {ref} | यह नहीं हो पाया। {ref} |
| `camps.host.campus` | Campus | క్యాంపస్ | कैंपस |
| `camps.host.campusPick` | Choose a campus | క్యాంపస్ ఎంచుకోండి | कैंपस चुनें |
| `camps.host.noCampuses` | No partner campus has an administrator yet. | ఇంకా ఏ భాగస్వామి క్యాంపస్‌కూ నిర్వాహకుడు లేరు. | अभी किसी पार्टनर कैंपस का एडमिन नहीं है। |
| `camps.host.services` | Services | సేవలు | सेवाएँ |
| `camps.host.heldHint` | Vaccination and blood donation need a clinical review before a camp can offer them. | శిబిరం టీకా, రక్తదానం అందించే ముందు క్లినికల్ సమీక్ష అవసరం. | कैंप में टीकाकरण और रक्तदान से पहले क्लिनिकल समीक्षा ज़रूरी है। |
| `camps.host.who` | Who can book | ఎవరు బుక్ చేయవచ్చు | कौन बुक कर सकता है |
| `camps.host.slots` | Slots | స్లాట్‌లు | स्लॉट |
| `camps.host.addSlot` | Add a slot | స్లాట్ జోడించండి | स्लॉट जोड़ें |
| `camps.host.removeSlot` | Remove slot {n} | స్లాట్ {n} తీసివేయండి | स्लॉट {n} हटाएँ |
| `camps.host.slotsHint` | Up to {max} places in one slot. | ఒక స్లాట్‌లో గరిష్టంగా {max} స్థానాలు. | एक स्लॉट में ज़्यादा से ज़्यादा {max} जगह। |
| `camps.host.price` | Price | ధర | कीमत |
| `camps.host.priceHint` | In rupees. Students see it before they book. Leave empty for a free camp. | రూపాయలలో. బుక్ చేసే ముందు విద్యార్థులు చూస్తారు. ఉచిత శిబిరం కోసం ఖాళీగా వదలండి. | रुपयों में। बुक करने से पहले छात्र इसे देखते हैं। मुफ़्त कैंप के लिए खाली छोड़ें। |
| `camps.host.priceOff` | Paid camps aren’t available yet, so every camp is free. | చెల్లింపు శిబిరాలు ఇంకా అందుబాటులో లేవు, కాబట్టి ప్రతి శిబిరం ఉచితం. | पेड कैंप अभी उपलब्ध नहीं हैं, इसलिए हर कैंप मुफ़्त है। |
| `camps.host.needsApproval` | The campus approves your camp before students see it. | విద్యార్థులు చూసే ముందు క్యాంపస్ మీ శిబిరాన్ని ఆమోదిస్తుంది. | छात्रों के देखने से पहले कैंपस आपका कैंप मंज़ूर करता है। |
| `camps.host.publishNow` | Students who can book see it as soon as it is created. | సృష్టించిన వెంటనే బుక్ చేయగల విద్యార్థులకు కనిపిస్తుంది. | बनते ही बुक कर सकने वाले छात्र इसे देख लेते हैं। |
| `camps.host.created` | Camp created. Students who can book see it now. | శిబిరం సృష్టించబడింది. బుక్ చేయగల విద్యార్థులు ఇప్పుడు చూస్తారు. | कैंप बन गया। बुक कर सकने वाले छात्र अब इसे देख रहे हैं। |
| `camps.host.createdPending` | Camp sent to the campus. Students see it once they approve it. | శిబిరం క్యాంపస్‌కు పంపబడింది. వారు ఆమోదించిన తర్వాత విద్యార్థులు చూస్తారు. | कैंप कैंपस को भेजा गया। उनकी मंज़ूरी के बाद छात्र इसे देखेंगे। |
| `camps.host.optionsFailed` | The form couldn’t load its choices. Close it and try again. | ఫారమ్ ఎంపికలు లోడ్ కాలేదు. మూసి మళ్లీ ప్రయత్నించండి. | फ़ॉर्म के विकल्प लोड नहीं हुए। बंद करके फिर कोशिश करें। |
| `camps.csv.camp` | Camp | శిబిరం | कैंप |
| `camps.csv.date` | Date | తేదీ | तारीख |
| `camps.csv.start` | Slot start | స్లాట్ ప్రారంభం | स्लॉट शुरू |
| `camps.csv.end` | Slot end | స్లాట్ ముగింపు | स्लॉट खत्म |
| `partner.vcon.nav.camps` | Health camps | ఆరోగ్య శిబిరాలు | हेल्थ कैंप |
