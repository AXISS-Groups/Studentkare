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

## refills — refill reminders and one-tap reorder (feat/refill-reorder, `src/i18n/areas/refills.ts`)

Notes for the reviewer: "pack" is the strip, bottle or box a medicine comes in; "each time" and "times a day"
are the student's own counts, never advice, so keep them neutral (no "should", "must", "take"). "Snooze"
holds a reminder back for a day or so. "MRP" and "UPI" stay in English. `care.inbox.event.STOCK_BACK` is the
inbox label for a back-in-stock notice.

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `refill.eyebrow` | My health | నా ఆరోగ్యం | मेरी सेहत |
| `refill.title` | Refills | రీఫిల్స్ | रीफ़िल |
| `refill.back` | Back to Medicines today | ఈరోజు మందులకు వెనక్కి | आज की दवाओं पर वापस |
| `refill.heroEyebrow` | Refill reminders | రీఫిల్ రిమైండర్లు | रीफ़िल रिमाइंडर |
| `refill.heroLine.none` | Know before a medicine runs out | మందు అయిపోయే ముందే తెలుసుకోండి | दवा ख़त्म होने से पहले जानें |
| `refill.heroLine.one` | 1 medicine runs out soon | 1 మందు త్వరలో అయిపోతుంది | 1 दवा जल्द ख़त्म होगी |
| `refill.heroLine.many` | {count} medicines run out soon | {count} మందులు త్వరలో అయిపోతాయి | {count} दवाएँ जल्द ख़त्म होंगी |
| `refill.heroLine.fine` | Nothing runs out soon | త్వరలో ఏదీ అయిపోదు | जल्द कुछ ख़त्म नहीं हो रहा |
| `refill.heroNote` | Counted from the pack size and schedule you enter. It is a count, never dosing advice. | మీరు ఇచ్చిన ప్యాక్ సైజ్, షెడ్యూల్ నుండి లెక్కిస్తాం. ఇది లెక్క మాత్రమే, డోస్ సలహా కాదు. | आपके डाले पैक साइज़ और शेड्यूल से गिना जाता है। यह सिर्फ़ गिनती है, डोज़ की सलाह नहीं। |
| `refill.loading` | Loading your refills | మీ రీఫిల్స్ లోడ్ అవుతున్నాయి | आपके रीफ़िल लोड हो रहे हैं |
| `refill.failedTitle` | Your refills didn’t load | మీ రీఫిల్స్ లోడ్ కాలేదు | आपके रीफ़िल लोड नहीं हुए |
| `refill.failedBody` | This is on our side, not yours. Try again. | ఇది మా వైపు సమస్య, మీది కాదు. మళ్లీ ప్రయత్నించండి. | यह हमारी तरफ़ की दिक़्क़त है, आपकी नहीं। फिर से कोशिश करें। |
| `refill.offline` | Changing refills needs a connection. Nothing is kept on this device, so try again when you’re back online. | రీఫిల్స్ మార్చడానికి కనెక్షన్ కావాలి. ఈ డివైస్‌లో ఏదీ ఉంచము, కనెక్షన్ వచ్చాక మళ్లీ ప్రయత్నించండి. | रीफ़िल बदलने के लिए कनेक्शन चाहिए। इस डिवाइस पर कुछ नहीं रखा जाता, इसलिए ऑनलाइन होने पर फिर कोशिश करें। |
| `refill.emptyTitle` | No refills tracked yet | ఇంకా ఏ రీఫిల్ ట్రాక్ చేయలేదు | अभी कोई रीफ़िल ट्रैक नहीं |
| `refill.emptyBody` | Pick a medicine from a past order or from Medicines today, enter its pack and how often you take it, and we’ll remind you before it runs out. | పాత ఆర్డర్ నుండి లేదా ఈరోజు మందుల నుండి ఒక మందు ఎంచుకోండి, దాని ప్యాక్, ఎంత తరచుగా వేసుకుంటారో ఇవ్వండి. అది అయిపోయే ముందు గుర్తు చేస్తాం. | किसी पुराने ऑर्डर से या आज की दवाओं से एक दवा चुनें, उसका पैक और आप कितनी बार लेते हैं डालें, और ख़त्म होने से पहले हम याद दिलाएँगे। |
| `refill.add` | Track a refill | రీఫిల్ ట్రాక్ చేయండి | रीफ़िल ट्रैक करें |
| `refill.lockNote` | Outside the app a reminder only says “You have a medicine reminder”, never the medicine, and it waits for your quiet hours. | యాప్ బయట రిమైండర్ “మీకు మందు రిమైండర్ ఉంది” అని మాత్రమే చెబుతుంది, మందు పేరు చెప్పదు, మీ నిశ్శబ్ద గంటలు అయ్యే వరకు ఆగుతుంది. | ऐप के बाहर रिमाइंडर सिर्फ़ “आपका एक दवा रिमाइंडर है” कहता है, दवा का नाम नहीं, और आपके शांत घंटों का इंतज़ार करता है। |
| `refill.row.left` | About {units} left | సుమారు {units} మిగిలాయి | लगभग {units} बचे हैं |
| `refill.row.runsOut` | Runs out {date} | {date}న అయిపోతుంది | {date} को ख़त्म होगी |
| `refill.row.runOut` | May have run out ({date}) | అయిపోయి ఉండవచ్చు ({date}) | शायद ख़त्म हो गई है ({date}) |
| `refill.row.daysLeft` | {count} days left | {count} రోజులు మిగిలాయి | {count} दिन बचे हैं |
| `refill.row.dayLeft` | 1 day left | 1 రోజు మిగిలింది | 1 दिन बचा है |
| `refill.row.schedule` | {perDose} each time · {perDay} a day · pack of {pack} | ప్రతిసారి {perDose} · రోజుకు {perDay} సార్లు · {pack} ప్యాక్ | हर बार {perDose} · दिन में {perDay} बार · {pack} का पैक |
| `refill.row.remind` | Reminder on {date} ({count} days before) | {date}న రిమైండర్ ({count} రోజుల ముందు) | {date} को रिमाइंडर ({count} दिन पहले) |
| `refill.row.snoozed` | Snoozed until {date} | {date} వరకు స్నూజ్ | {date} तक स्नूज़ |
| `refill.row.off` | Reminder off | రిమైండర్ ఆఫ్ | रिमाइंडर बंद |
| `refill.row.sourceOrder` | From your order | మీ ఆర్డర్ నుండి | आपके ऑर्डर से |
| `refill.row.sourcePlan` | From Medicines today | ఈరోజు మందుల నుండి | आज की दवाओं से |
| `refill.row.toggle` | Remind me | నాకు గుర్తు చేయండి | मुझे याद दिलाएँ |
| `refill.row.toggleSpoken` | Remind me before {name} runs out | {name} అయిపోయే ముందు నాకు గుర్తు చేయండి | {name} ख़त्म होने से पहले मुझे याद दिलाएँ |
| `refill.row.reorder` | Reorder | మళ్లీ ఆర్డర్ | फिर से ऑर्डर |
| `refill.row.reorderSpoken` | Reorder {name} | {name} మళ్లీ ఆర్డర్ చేయండి | {name} फिर से ऑर्डर करें |
| `refill.row.request` | Ask a pharmacy | ఫార్మసీని అడగండి | फ़ार्मेसी से पूछें |
| `refill.row.requestSpoken` | Ask a pharmacy to refill {name} | {name} రీఫిల్ కోసం ఫార్మసీని అడగండి | {name} रीफ़िल के लिए फ़ार्मेसी से पूछें |
| `refill.row.snooze` | Snooze | స్నూజ్ | स्नूज़ |
| `refill.row.snoozeSpoken` | Snooze the reminder for {name} | {name} రిమైండర్‌ను స్నూజ్ చేయండి | {name} का रिमाइंडर स्नूज़ करें |
| `refill.row.stillHave` | I still have some | ఇంకా కొన్ని ఉన్నాయి | अभी कुछ बची हैं |
| `refill.row.stillHaveSpoken` | Tell us how many {name} you still have | మీ దగ్గర ఇంకా ఎన్ని {name} ఉన్నాయో చెప్పండి | बताएँ आपके पास अभी कितनी {name} बची हैं |
| `refill.row.newPack` | I got a new pack | కొత్త ప్యాక్ వచ్చింది | नया पैक मिल गया |
| `refill.row.newPackSpoken` | Count a new pack of {name} | {name} కొత్త ప్యాక్‌ను లెక్కించండి | {name} का नया पैक गिनें |
| `refill.row.remove` | Stop tracking | ట్రాకింగ్ ఆపండి | ट्रैक करना बंद करें |
| `refill.row.removeSpoken` | Stop tracking {name} | {name} ట్రాకింగ్ ఆపండి | {name} ट्रैक करना बंद करें |
| `refill.setup.title` | Track a refill | రీఫిల్ ట్రాక్ చేయండి | रीफ़िल ट्रैक करें |
| `refill.setup.pick` | Which medicine? | ఏ మందు? | कौन-सी दवा? |
| `refill.setup.fromOrders` | From past orders | పాత ఆర్డర్ల నుండి | पुराने ऑर्डर से |
| `refill.setup.fromPlans` | From Medicines today | ఈరోజు మందుల నుండి | आज की दवाओं से |
| `refill.setup.ordered` | Ordered {date} | {date}న ఆర్డర్ చేశారు | {date} को ऑर्डर किया |
| `refill.setup.planned` | In Medicines today | ఈరోజు మందుల్లో ఉంది | आज की दवाओं में है |
| `refill.setup.loading` | Loading your medicines and orders | మీ మందులు, ఆర్డర్లు లోడ్ అవుతున్నాయి | आपकी दवाएँ और ऑर्डर लोड हो रहे हैं |
| `refill.setup.loadFailed` | Your medicines and orders didn’t load. Try again. | మీ మందులు, ఆర్డర్లు లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి. | आपकी दवाएँ और ऑर्डर लोड नहीं हुए। फिर से कोशिश करें। |
| `refill.setup.nothing` | Nothing to pick yet. Medicines you order, or add to Medicines today, show here. | ఎంచుకోడానికి ఇంకా ఏమీ లేదు. మీరు ఆర్డర్ చేసిన లేదా ఈరోజు మందుల్లో చేర్చిన మందులు ఇక్కడ కనిపిస్తాయి. | अभी चुनने को कुछ नहीं। जो दवाएँ आप ऑर्डर करते हैं या आज की दवाओं में जोड़ते हैं, वे यहाँ दिखेंगी। |
| `refill.setup.countNote` | Enter what your pack and prescription say. We only count; we never suggest a dose. | మీ ప్యాక్, ప్రిస్క్రిప్షన్‌లో ఉన్నది ఇవ్వండి. మేము లెక్కిస్తాం మాత్రమే; డోస్ ఎప్పుడూ సూచించము. | जो आपके पैक और प्रिस्क्रिप्शन पर लिखा है वही डालें। हम सिर्फ़ गिनते हैं; डोज़ कभी नहीं सुझाते। |
| `refill.setup.packSize` | Tablets or doses in one pack | ఒక ప్యాక్‌లో టాబ్లెట్లు లేదా డోసులు | एक पैक में टैबलेट या डोज़ |
| `refill.setup.packs` | Packs you have | మీ దగ్గర ఉన్న ప్యాక్‌లు | आपके पास पैक |
| `refill.setup.perDose` | How many you take each time | ప్రతిసారి ఎన్ని వేసుకుంటారు | हर बार कितनी लेते हैं |
| `refill.setup.perDay` | Times a day | రోజుకు ఎన్ని సార్లు | दिन में कितनी बार |
| `refill.setup.started` | Count from | ఎప్పటి నుండి లెక్కించాలి | कब से गिनें |
| `refill.setup.today` | Today | ఈరోజు | आज |
| `refill.setup.orderDay` | The order date | ఆర్డర్ తేదీ | ऑर्डर की तारीख़ |
| `refill.setup.daysBefore` | Remind me this many days before | ఇన్ని రోజుల ముందు గుర్తు చేయండి | इतने दिन पहले याद दिलाएँ |
| `refill.setup.range` | A whole number from {min} to {max}. | {min} నుండి {max} వరకు పూర్ణ సంఖ్య. | {min} से {max} तक पूरी संख्या। |
| `refill.setup.save` | Start tracking | ట్రాకింగ్ మొదలుపెట్టండి | ट्रैक करना शुरू करें |
| `refill.setup.another` | Pick another medicine | వేరే మందు ఎంచుకోండి | दूसरी दवा चुनें |
| `refill.adjust.title` | How many do you have now? | ఇప్పుడు మీ దగ్గర ఎన్ని ఉన్నాయి? | अभी आपके पास कितनी हैं? |
| `refill.adjust.label` | Tablets or doses in hand | చేతిలో ఉన్న టాబ్లెట్లు లేదా డోసులు | हाथ में टैबलेट या डोज़ |
| `refill.adjust.save` | Update the count | లెక్క మార్చండి | गिनती बदलें |
| `refill.restock.title` | Count a new pack | కొత్త ప్యాక్ లెక్కించండి | नया पैक गिनें |
| `refill.restock.label` | Packs you got | వచ్చిన ప్యాక్‌లు | मिले हुए पैक |
| `refill.restock.save` | Add to the count | లెక్కకు కలపండి | गिनती में जोड़ें |
| `refill.remove.title` | Stop tracking {name}? | {name} ట్రాకింగ్ ఆపాలా? | {name} ट्रैक करना बंद करें? |
| `refill.remove.body` | Its reminder stops. Your medicines and orders are not changed. | దాని రిమైండర్ ఆగిపోతుంది. మీ మందులు, ఆర్డర్లు మారవు. | इसका रिमाइंडर रुक जाएगा। आपकी दवाएँ और ऑर्डर नहीं बदलेंगे। |
| `refill.status.saved` | Saved. | సేవ్ అయింది. | सेव हो गया। |
| `refill.status.snoozed` | Snoozed. | స్నూజ్ చేశాం. | स्नूज़ किया। |
| `refill.status.removed` | Stopped tracking. | ట్రాకింగ్ ఆపాం. | ट्रैक करना बंद किया। |
| `refill.status.failed` | That didn’t save. Try again. | అది సేవ్ కాలేదు. మళ్లీ ప్రయత్నించండి. | यह सेव नहीं हुआ। फिर से कोशिश करें। |
| `refill.msg.PACK_SIZE_OUT_OF_RANGE` | Enter a pack size from {min} to {max}. | {min} నుండి {max} వరకు ప్యాక్ సైజ్ ఇవ్వండి. | {min} से {max} तक का पैक साइज़ डालें। |
| `refill.msg.PACKS_OUT_OF_RANGE` | Enter from {min} to {max} packs. | {min} నుండి {max} ప్యాక్‌లు ఇవ్వండి. | {min} से {max} पैक डालें। |
| `refill.msg.UNITS_PER_DOSE_OUT_OF_RANGE` | Enter from {min} to {max} each time. | ప్రతిసారి {min} నుండి {max} వరకు ఇవ్వండి. | हर बार {min} से {max} तक डालें। |
| `refill.msg.DOSES_PER_DAY_OUT_OF_RANGE` | Enter from {min} to {max} times a day. | రోజుకు {min} నుండి {max} సార్లు ఇవ్వండి. | दिन में {min} से {max} बार डालें। |
| `refill.msg.REMIND_DAYS_OUT_OF_RANGE` | Pick from {min} to {max} days before. | {min} నుండి {max} రోజుల ముందు ఎంచుకోండి. | {min} से {max} दिन पहले चुनें। |
| `refill.msg.SNOOZE_OUT_OF_RANGE` | Snooze for {min} to {max} days. | {min} నుండి {max} రోజులు స్నూజ్ చేయండి. | {min} से {max} दिन के लिए स्नूज़ करें। |
| `refill.msg.START_DATE_OUT_OF_RANGE` | Pick a date in the last {days} days, not in the future. | గత {days} రోజుల్లోని తేదీ ఎంచుకోండి, భవిష్యత్తు తేదీ కాదు. | पिछले {days} दिनों की तारीख़ चुनें, आगे की नहीं। |
| `refill.msg.UNITS_LEFT_OUT_OF_RANGE` | Enter from {min} to {max}. | {min} నుండి {max} వరకు ఇవ్వండి. | {min} से {max} तक डालें। |
| `refill.msg.ALREADY_TRACKED` | You already track a refill for this medicine. | ఈ మందు రీఫిల్‌ను మీరు ఇప్పటికే ట్రాక్ చేస్తున్నారు. | इस दवा का रीफ़िल आप पहले से ट्रैक कर रहे हैं। |
| `refill.msg.TOO_MANY_REFILLS` | You can track up to {max} medicines. | మీరు గరిష్టంగా {max} మందులు ట్రాక్ చేయవచ్చు. | आप ज़्यादा से ज़्यादा {max} दवाएँ ट्रैक कर सकते हैं। |
| `refill.msg.ORDER_NOT_FOUND` | That order isn’t on your account. | ఆ ఆర్డర్ మీ ఖాతాలో లేదు. | वह ऑर्डर आपके खाते में नहीं है। |
| `refill.msg.ORDER_LINE_NOT_REFILLABLE` | Only a product you were sold can be refilled. | మీకు అమ్మిన ప్రొడక్ట్‌ను మాత్రమే రీఫిల్ చేయవచ్చు. | सिर्फ़ वही प्रोडक्ट रीफ़िल हो सकता है जो आपको बेचा गया था। |
| `refill.msg.PLAN_NOT_FOUND` | That medicine isn’t in Medicines today any more. | ఆ మందు ఇప్పుడు ఈరోజు మందుల్లో లేదు. | वह दवा अब आज की दवाओं में नहीं है। |
| `refill.msg.REFILL_NOT_FOUND` | That refill isn’t on your list any more. | ఆ రీఫిల్ ఇప్పుడు మీ జాబితాలో లేదు. | वह रीफ़िल अब आपकी सूची में नहीं है। |
| `refill.link.fromMeds` | Refill reminders | రీఫిల్ రిమైండర్లు | रीफ़िल रिमाइंडर |
| `refill.link.fromMedsNote` | Know before a medicine runs out | మందు అయిపోయే ముందే తెలుసుకోండి | दवा ख़त्म होने से पहले जानें |
| `refill.link.fromOrder` | Remind me to refill | రీఫిల్ కోసం గుర్తు చేయండి | रीफ़िल की याद दिलाएँ |
| `refill.link.fromOrderSpoken` | Remind me to refill from order {ref} | ఆర్డర్ {ref} నుండి రీఫిల్ కోసం గుర్తు చేయండి | ऑर्डर {ref} से रीफ़िल की याद दिलाएँ |
| `refill.inbox.open` | Open refills | రీఫిల్స్ తెరవండి | रीफ़िल खोलें |
| `refill.inbox.stockBack` | An item you asked about is back in stock. | మీరు అడిగిన వస్తువు మళ్లీ స్టాక్‌లో ఉంది. | जिस चीज़ के बारे में आपने पूछा था वह फिर से स्टॉक में है। |
| `care.inbox.event.STOCK_BACK` | Back in stock | మళ్లీ స్టాక్‌లో | फिर से स्टॉक में |
| `reorder.eyebrow` | Refills | రీఫిల్స్ | रीफ़िल |
| `reorder.title` | Reorder | మళ్లీ ఆర్డర్ | फिर से ऑर्डर |
| `reorder.back` | Back to refills | రీఫిల్స్‌కు వెనక్కి | रीफ़िल पर वापस |
| `reorder.loading` | Checking today’s price and stock | ఈరోజు ధర, స్టాక్ చూస్తున్నాం | आज की कीमत और स्टॉक देख रहे हैं |
| `reorder.failedTitle` | We couldn’t check today’s price | ఈరోజు ధర చూడలేకపోయాం | आज की कीमत नहीं देख पाए |
| `reorder.priceNote` | Today’s price and stock, checked at {time}. You pay this, not what you paid last time. | ఈరోజు ధర, స్టాక్ — {time}కి చూశాం. మీరు చెల్లించేది ఇదే, గతసారి చెల్లించింది కాదు. | आज की कीमत और स्टॉक, {time} पर देखे गए। आप यही चुकाएँगे, पिछली बार वाली कीमत नहीं। |
| `reorder.qty` | Qty {count} | పరిమాణం {count} | मात्रा {count} |
| `reorder.each` | {price} each | ఒక్కొక్కటి {price} | {price} प्रति |
| `reorder.mrp` | MRP {price} | MRP {price} | MRP {price} |
| `reorder.state.OK` | In stock | స్టాక్‌లో ఉంది | स्टॉक में है |
| `reorder.state.LOW_STOCK` | Only {count} in stock | స్టాక్‌లో {count} మాత్రమే | स्टॉक में सिर्फ़ {count} |
| `reorder.state.OUT_OF_STOCK` | Out of stock | స్టాక్‌లో లేదు | स्टॉक में नहीं |
| `reorder.state.PRESCRIPTION` | Needs a prescription | ప్రిస్క్రిప్షన్ కావాలి | प्रिस्क्रिप्शन चाहिए |
| `reorder.state.UNAVAILABLE` | No longer sold here | ఇక్కడ ఇక అమ్మడం లేదు | अब यहाँ नहीं बिकती |
| `reorder.oos.body` | We never swap a medicine for another one. Ask to be told when it’s back, or ask a pharmacist. | ఒక మందుకు బదులు మరో మందు మేము ఎప్పుడూ మార్చము. అది వచ్చినప్పుడు చెప్పమని అడగండి, లేదా ఫార్మసిస్ట్‌ను అడగండి. | हम कभी एक दवा की जगह दूसरी नहीं देते। वापस आने पर बताने को कहें, या फ़ार्मासिस्ट से पूछें। |
| `reorder.oos.notify` | Tell me when it’s back | వచ్చినప్పుడు చెప్పండి | वापस आने पर बताएँ |
| `reorder.oos.watching` | We’ll tell you when it’s back. | వచ్చినప్పుడు మీకు చెబుతాం. | वापस आने पर हम आपको बताएँगे। |
| `reorder.oos.stop` | Stop telling me | చెప్పడం ఆపండి | बताना बंद करें |
| `reorder.oos.pharmacist` | Ask a pharmacist | ఫార్మసిస్ట్‌ను అడగండి | फ़ार्मासिस्ट से पूछें |
| `reorder.low.body` | Fewer are in stock than you ordered last time. Ask a pharmacist, or ask to be told when more are in. | గతసారి మీరు ఆర్డర్ చేసినన్ని స్టాక్‌లో లేవు. ఫార్మసిస్ట్‌ను అడగండి, లేదా మరిన్ని వచ్చినప్పుడు చెప్పమని అడగండి. | पिछली बार जितना ऑर्डर किया था उससे कम स्टॉक में है। फ़ार्मासिस्ट से पूछें, या और आने पर बताने को कहें। |
| `reorder.rx.checking` | Checking your prescriptions… | మీ ప్రిస్క్రిప్షన్లు చూస్తున్నాం… | आपके प्रिस्क्रिप्शन देख रहे हैं… |
| `reorder.rx.valid` | You have a prescription in date until {date}. Send it to a pharmacist, who checks it before this medicine is sold. | {date} వరకు చెల్లుబాటు అయ్యే ప్రిస్క్రిప్షన్ మీ దగ్గర ఉంది. దాన్ని ఫార్మసిస్ట్‌కు పంపండి; ఈ మందు అమ్మే ముందు వారు దాన్ని చెక్ చేస్తారు. | {date} तक मान्य प्रिस्क्रिप्शन आपके पास है। इसे फ़ार्मासिस्ट को भेजें, जो यह दवा बेचने से पहले इसे जाँचेंगे। |
| `reorder.rx.send` | Send my prescription | నా ప్రిస్క్రిప్షన్ పంపండి | मेरा प्रिस्क्रिप्शन भेजें |
| `reorder.rx.none` | This medicine needs a prescription that is still in date, and there isn’t one in your records. | ఈ మందుకు చెల్లుబాటు అయ్యే ప్రిస్క్రిప్షన్ కావాలి, మీ రికార్డుల్లో అలాంటిది లేదు. | इस दवा के लिए मान्य प्रिस्क्रिप्शन चाहिए, और आपके रिकॉर्ड में ऐसा कोई नहीं है। |
| `reorder.rx.upload` | Upload a prescription | ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి | प्रिस्क्रिप्शन अपलोड करें |
| `reorder.rx.consult` | Book a consult | కన్సల్ట్ బుక్ చేయండి | कंसल्ट बुक करें |
| `reorder.rx.failed` | We couldn’t check your prescriptions, so nothing that needs one can be ordered now. Try again. | మీ ప్రిస్క్రిప్షన్లు చూడలేకపోయాం, కాబట్టి ప్రిస్క్రిప్షన్ కావలసినవి ఇప్పుడు ఆర్డర్ చేయలేరు. మళ్లీ ప్రయత్నించండి. | हम आपके प्रिस्क्रिप्शन नहीं देख पाए, इसलिए जिसे प्रिस्क्रिप्शन चाहिए वह अभी ऑर्डर नहीं हो सकता। फिर से कोशिश करें। |
| `reorder.deliverTo` | Deliver to | డెలివరీ చిరునామా | डिलीवरी पता |
| `reorder.pickupAt` | Pick up | పికప్ | पिकअप |
| `reorder.address` | {address}, {city} {pincode} | {address}, {city} {pincode} | {address}, {city} {pincode} |
| `reorder.pickupPlace` | {city} {pincode} | {city} {pincode} | {city} {pincode} |
| `reorder.payWith` | Pay with | చెల్లింపు విధానం | भुगतान का तरीका |
| `reorder.method.upi` | UPI | UPI | UPI |
| `reorder.method.card` | Card | కార్డ్ | कार्ड |
| `reorder.method.netbanking` | Net banking | నెట్ బ్యాంకింగ్ | नेट बैंकिंग |
| `reorder.methodLast` | Your last choice on this device. You can change it on the next step. | ఈ డివైస్‌లో మీ చివరి ఎంపిక. తర్వాతి దశలో మార్చవచ్చు. | इस डिवाइस पर आपकी पिछली पसंद। अगले कदम पर बदल सकते हैं। |
| `reorder.methodNone` | You choose on the next step. | తర్వాతి దశలో ఎంచుకుంటారు. | अगले कदम पर चुनें। |
| `reorder.total` | Total | మొత్తం | कुल |
| `reorder.pay` | Pay {total} | {total} చెల్లించండి | {total} चुकाएँ |
| `reorder.paySpoken` | Place the order and pay {total} | ఆర్డర్ చేసి {total} చెల్లించండి | ऑर्डर करें और {total} चुकाएँ |
| `reorder.notReady` | Nothing here can be paid for right now. | ప్రస్తుతం ఇక్కడ దేనికీ చెల్లించలేరు. | अभी यहाँ किसी चीज़ का भुगतान नहीं हो सकता। |
| `reorder.partReady` | Only the items in stock are in this total. | స్టాక్‌లో ఉన్నవి మాత్రమే ఈ మొత్తంలో ఉన్నాయి. | इस कुल में सिर्फ़ स्टॉक वाली चीज़ें हैं। |
| `reorder.priceChanged` | The price changed while you were here. Check the new total, then pay. | మీరు ఇక్కడ ఉండగా ధర మారింది. కొత్త మొత్తం చూసి, తర్వాత చెల్లించండి. | आपके यहाँ रहते कीमत बदल गई। नया कुल देखें, फिर भुगतान करें। |
| `reorder.placeFailed` | The order wasn’t placed. Nothing was charged. Try again. | ఆర్డర్ కాలేదు. ఏమీ ఛార్జ్ కాలేదు. మళ్లీ ప్రయత్నించండి. | ऑर्डर नहीं हुआ। कोई पैसा नहीं कटा। फिर से कोशिश करें। |
| `reorder.newPackNote` | When it arrives, tap “I got a new pack” on Refills to count it. | అది వచ్చాక, రీఫిల్స్‌లో “కొత్త ప్యాక్ వచ్చింది” నొక్కి లెక్కించండి. | आने पर, रीफ़िल में “नया पैक मिल गया” दबाकर गिनें। |
| `reorder.planNote` | This medicine came from Medicines today, not a shop order, so a pharmacy refills it. | ఈ మందు షాప్ ఆర్డర్ నుండి కాదు, ఈరోజు మందుల నుండి వచ్చింది, కాబట్టి ఫార్మసీ రీఫిల్ చేస్తుంది. | यह दवा शॉप ऑर्डर से नहीं, आज की दवाओं से आई है, इसलिए फ़ार्मेसी इसे रीफ़िल करती है। |

## push — push notifications, channels per category, announcements (feat/push-notifications, `src/i18n/areas/push.ts`)

Notes for the reviewer: `push.lock.*` are also the lines the server sends to a lock screen (`backend/core/push_copy.py` LOCK_SCREEN, te/hi there too): change both together. They must stay generic: never a medicine, test, condition, result or camp service. The Hindi and Telugu health words in `HEALTH_TERMS` (same file) are drafts too.

| Key | English | తెలుగు | हिंदी |
|---|---|---|---|
| `push.cat.SAFETY` | Safety & account | భద్రత & ఖాతా | सुरक्षा और खाता |
| `push.cat.SAFETY.desc` | SOS updates, new sign-ins, “This wasn’t me” and account deletion. | SOS అప్‌డేట్‌లు, కొత్త సైన్-ఇన్‌లు, “ఇది నేను కాదు”, ఖాతా తొలగింపు. | SOS अपडेट, नए साइन-इन, “यह मैं नहीं था” और खाता हटाना। |
| `push.cat.CARE` | Results & doctors | ఫలితాలు & డాక్టర్లు | नतीजे और डॉक्टर |
| `push.cat.CARE.desc` | Report ready, doctor messages and consult reminders. | రిపోర్ట్ సిద్ధం, డాక్టర్ సందేశాలు, కన్సల్ట్ రిమైండర్‌లు. | रिपोर्ट तैयार, डॉक्टर के संदेश और कंसल्ट रिमाइंडर। |
| `push.cat.REMINDERS` | Medicine reminders | మందుల రిమైండర్‌లు | दवा के रिमाइंडर |
| `push.cat.REMINDERS.desc` | Doses and refills you set up. | మీరు సెట్ చేసిన డోస్‌లు, రీఫిల్స్. | आपकी सेट की गई खुराकें और रीफ़िल। |
| `push.cat.ORDERS` | Orders | ఆర్డర్లు | ऑर्डर |
| `push.cat.ORDERS.desc` | Order status, handovers, refunds and items back in stock. | ఆర్డర్ స్థితి, హ్యాండోవర్‌లు, రీఫండ్‌లు, మళ్లీ స్టాక్‌లోకి వచ్చినవి. | ऑर्डर की स्थिति, हैंडओवर, रिफ़ंड और वापस स्टॉक में आई चीज़ें। |
| `push.cat.CAMPS` | Health camps | హెల్త్ క్యాంప్‌లు | हेल्थ कैंप |
| `push.cat.CAMPS.desc` | Bookings, waitlist places and camp reminders. | బుకింగ్‌లు, వెయిట్‌లిస్ట్ స్థానాలు, క్యాంప్ రిమైండర్‌లు. | बुकिंग, वेटलिस्ट जगहें और कैंप रिमाइंडर। |
| `push.cat.ACCOUNT` | Verification | ధృవీకరణ | सत्यापन |
| `push.cat.ACCOUNT.desc` | College ID checks and leaving your campus. | కాలేజ్ ID తనిఖీలు, మీ క్యాంపస్ వదిలి వెళ్లడం. | कॉलेज ID जाँच और अपना कैंपस छोड़ना। |
| `push.cat.ANNOUNCEMENTS` | Campus announcements | క్యాంపస్ ప్రకటనలు | कैंपस घोषणाएँ |
| `push.cat.ANNOUNCEMENTS.desc` | Notices from Student Kare for your campus. Never about anyone’s health. | మీ క్యాంపస్ కోసం Student Kare నుండి నోటీసులు. ఎవరి ఆరోగ్యం గురించీ కాదు. | आपके कैंपस के लिए Student Kare की सूचनाएँ। कभी किसी की सेहत के बारे में नहीं। |
| `push.ch.PUSH` | App | యాప్ | ऐप |
| `push.ch.EMAIL` | Email | ఈమెయిల్ | ईमेल |
| `push.chipSpoken` | {channel} for {category} | {category} కోసం {channel} | {category} के लिए {channel} |
| `push.alwaysOn` | Always on | ఎల్లప్పుడూ ఆన్ | हमेशा चालू |
| `push.off` | Off | ఆఫ్ | बंद |
| `push.safetyLocked` | Safety messages can’t be turned off. | భద్రతా సందేశాలను ఆఫ్ చేయలేరు. | सुरक्षा संदेश बंद नहीं किए जा सकते। |
| `push.inAppNote` | Everything also stays in your in-app notifications, where the details are. | అన్నీ మీ యాప్ నోటిఫికేషన్‌లలో కూడా ఉంటాయి, వివరాలు అక్కడే ఉంటాయి. | सब कुछ आपकी ऐप सूचनाओं में भी रहता है, विवरण वहीं हैं। |
| `push.externalNote` | WhatsApp and email carry reminders only; other updates are in the app. | WhatsApp, ఈమెయిల్ రిమైండర్‌లు మాత్రమే పంపుతాయి; మిగతా అప్‌డేట్‌లు యాప్‌లో ఉంటాయి. | WhatsApp और ईमेल पर सिर्फ़ रिमाइंडर जाते हैं; बाकी अपडेट ऐप में हैं। |
| `push.preview.cap` | Lock screen preview · tap a category | లాక్ స్క్రీన్ ప్రివ్యూ · ఒక వర్గాన్ని నొక్కండి | लॉक स्क्रीन प्रीव्यू · कोई श्रेणी दबाएँ |
| `push.preview.spoken` | Lock screen preview for {category}: {title}, {text} | {category} కోసం లాక్ స్క్రీన్ ప్రివ్యూ: {title}, {text} | {category} के लिए लॉक स्क्रीन प्रीव्यू: {title}, {text} |
| `push.preview.held` | Held until {time} (quiet hours) | {time} వరకు ఆపి ఉంచబడింది (నిశ్శబ్ద సమయం) | {time} तक रोका गया (शांत समय) |
| `push.preview.now` | now | ఇప్పుడు | अभी |
| `push.hide.title` | Hide health details on the lock screen | లాక్ స్క్రీన్‌పై ఆరోగ్య వివరాలు దాచండి | लॉक स्क्रीन पर सेहत की जानकारी छिपाएँ |
| `push.hide.body` | Messages say “new update” — never a result, medicine or diagnosis — until you open the app. | మీరు యాప్ తెరిచే వరకు సందేశాలు “కొత్త అప్‌డేట్” అని మాత్రమే చెబుతాయి — ఫలితం, మందు, నిర్ధారణ ఎప్పుడూ కాదు. | जब तक आप ऐप न खोलें, संदेश सिर्फ़ “नया अपडेट” कहते हैं — कभी नतीजा, दवा या निदान नहीं। |
| `push.lock.SAFETY` | You have an important update in Student Kare. Open the app now. | Student Kare లో మీకు ముఖ్యమైన అప్‌డేట్ ఉంది. ఇప్పుడే యాప్ తెరవండి. | Student Kare में आपके लिए एक ज़रूरी अपडेट है। अभी ऐप खोलें। |
| `push.lock.CARE` | You have a new update in Student Kare. Open the app to see it. | Student Kare లో మీకు కొత్త అప్‌డేట్ ఉంది. చూడటానికి యాప్ తెరవండి. | Student Kare में आपके लिए एक नया अपडेट है। देखने के लिए ऐप खोलें। |
| `push.lock.REMINDERS` | You have a reminder in Student Kare. | Student Kare లో మీకు ఒక రిమైండర్ ఉంది. | Student Kare में आपके लिए एक रिमाइंडर है। |
| `push.lock.ORDERS` | You have an order update in Student Kare. | Student Kare లో మీ ఆర్డర్ అప్‌డేట్ ఉంది. | Student Kare में आपके ऑर्डर का अपडेट है। |
| `push.lock.CAMPS` | You have an update about a booking in Student Kare. | Student Kare లో మీ బుకింగ్ గురించి అప్‌డేట్ ఉంది. | Student Kare में आपकी बुकिंग का अपडेट है। |
| `push.lock.ACCOUNT` | You have an account update in Student Kare. | Student Kare లో మీ ఖాతా అప్‌డేట్ ఉంది. | Student Kare में आपके खाते का अपडेट है। |
| `push.lock.ANNOUNCEMENTS` | The announcement’s own title and text, checked to say nothing about health. | ప్రకటన యొక్క స్వంత శీర్షిక, వచనం — ఆరోగ్యం గురించి ఏమీ లేదని తనిఖీ చేసినవి. | घोषणा का अपना शीर्षक और पाठ, जाँचा हुआ कि उसमें सेहत की कोई बात नहीं। |
| `push.device.phone` | Notifications on this phone | ఈ ఫోన్‌లో నోటిఫికేషన్‌లు | इस फ़ोन पर सूचनाएँ |
| `push.device.browser` | Notifications in this browser | ఈ బ్రౌజర్‌లో నోటిఫికేషన్‌లు | इस ब्राउज़र में सूचनाएँ |
| `push.device.on` | On. Pushes for the categories above reach this device. | ఆన్. పై వర్గాల పుష్‌లు ఈ డివైస్‌కు వస్తాయి. | चालू। ऊपर की श्रेणियों के पुश इस डिवाइस पर आते हैं। |
| `push.device.off` | Off. Turn them on to get pushes here. | ఆఫ్. ఇక్కడ పుష్‌లు పొందడానికి ఆన్ చేయండి. | बंद। यहाँ पुश पाने के लिए चालू करें। |
| `push.device.denied` | Blocked in your device settings. Allow notifications for Student Kare there, then come back. | మీ డివైస్ సెట్టింగ్‌లలో బ్లాక్ చేయబడింది. అక్కడ Student Kare కు నోటిఫికేషన్‌లు అనుమతించి, తిరిగి రండి. | आपकी डिवाइस सेटिंग में रोका गया है। वहाँ Student Kare के लिए सूचनाएँ चालू करें, फिर लौटें। |
| `push.device.unsupported` | This browser can’t receive notifications. Your in-app notifications still work. | ఈ బ్రౌజర్ నోటిఫికేషన్‌లు అందుకోలేదు. మీ యాప్ నోటిఫికేషన్‌లు పని చేస్తాయి. | यह ब्राउज़र सूचनाएँ नहीं ले सकता। आपकी ऐप सूचनाएँ फिर भी काम करती हैं। |
| `push.device.unavailable` | Push isn’t set up on our side yet. Your in-app notifications, WhatsApp and email still work. | మా వైపు పుష్ ఇంకా సెట్ కాలేదు. యాప్ నోటిఫికేషన్‌లు, WhatsApp, ఈమెయిల్ పని చేస్తాయి. | हमारी तरफ़ पुश अभी सेट नहीं है। ऐप सूचनाएँ, WhatsApp और ईमेल काम करते हैं। |
| `push.device.turnOn` | Turn on | ఆన్ చేయండి | चालू करें |
| `push.device.turnOff` | Turn off | ఆఫ్ చేయండి | बंद करें |
| `push.device.working` | One moment… | ఒక్క క్షణం… | एक पल… |
| `push.device.failed` | That didn’t work. Nothing changed — try again. | అది పని చేయలేదు. ఏమీ మారలేదు — మళ్లీ ప్రయత్నించండి. | यह नहीं हुआ। कुछ नहीं बदला — फिर कोशिश करें। |
| `push.offers.title` | Partner offers | భాగస్వామి ఆఫర్‌లు | पार्टनर ऑफ़र |
| `push.offers.body` | Discounts from listed partners, by push. Never based on your health. Off until you turn it on. | జాబితాలోని భాగస్వాముల తగ్గింపులు, పుష్ ద్వారా. మీ ఆరోగ్యం ఆధారంగా ఎప్పుడూ కాదు. మీరు ఆన్ చేసే వరకు ఆఫ్. | सूचीबद्ध पार्टनर की छूट, पुश से। कभी आपकी सेहत के आधार पर नहीं। जब तक आप चालू न करें, बंद। |
| `push.android.safety` | Safety and account | భద్రత మరియు ఖాతా | सुरक्षा और खाता |
| `push.android.reminders` | Reminders and updates | రిమైండర్‌లు, అప్‌డేట్‌లు | रिमाइंडर और अपडेट |
| `push.android.orders` | Orders | ఆర్డర్లు | ऑर्डर |
| `push.android.camps` | Health camps | హెల్త్ క్యాంప్‌లు | हेल्थ कैंप |
| `push.android.announcements` | Announcements | ప్రకటనలు | घोषणाएँ |
| `push.ios.open` | Open | తెరవండి | खोलें |
| `push.ios.hidden` | Student Kare notification | Student Kare నోటిఫికేషన్ | Student Kare सूचना |
| `push.adm.title` | Announcements | ప్రకటనలు | घोषणाएँ |
| `push.adm.description` | Push a notice to students of one campus or every campus, now or later. Never about anyone’s health; counts only. | ఒక క్యాంపస్ లేదా అన్ని క్యాంపస్‌ల విద్యార్థులకు ఇప్పుడు లేదా తర్వాత నోటీసు పుష్ చేయండి. ఎవరి ఆరోగ్యం గురించీ కాదు; లెక్కలు మాత్రమే. | एक कैंपस या हर कैंपस के छात्रों को अभी या बाद में सूचना पुश करें। कभी किसी की सेहत के बारे में नहीं; सिर्फ़ गिनती। |
| `push.adm.compose` | New announcement | కొత్త ప్రకటన | नई घोषणा |
| `push.adm.kind` | Kind | రకం | प्रकार |
| `push.adm.kind.ANNOUNCEMENT` | Campus announcement | క్యాంపస్ ప్రకటన | कैंपस घोषणा |
| `push.adm.kind.OFFER` | Partner offer (only students who opted in) | భాగస్వామి ఆఫర్ (ఆప్ట్-ఇన్ చేసిన విద్యార్థులకే) | पार्टनर ऑफ़र (सिर्फ़ ऑप्ट-इन करने वाले छात्र) |
| `push.adm.campus` | Who | ఎవరికి | किसे |
| `push.adm.campusAll` | Every campus | అన్ని క్యాంపస్‌లు | हर कैंपस |
| `push.adm.campusOption` | {campus} · {count} verified students | {campus} · {count} ధృవీకరించిన విద్యార్థులు | {campus} · {count} सत्यापित छात्र |
| `push.adm.titleLabel` | Title | శీర్షిక | शीर्षक |
| `push.adm.bodyLabel` | Message | సందేశం | संदेश |
| `push.adm.chars` | {count} of {max} characters | {max} లో {count} అక్షరాలు | {max} में से {count} अक्षर |
| `push.adm.when` | When | ఎప్పుడు | कब |
| `push.adm.now` | Send now | ఇప్పుడే పంపండి | अभी भेजें |
| `push.adm.later` | Schedule | షెడ్యూల్ | शेड्यूल |
| `push.adm.at` | Date and time | తేదీ, సమయం | तारीख और समय |
| `push.adm.preview` | Preview | ప్రివ్యూ | प्रीव्यू |
| `push.adm.previewing` | Checking… | తనిఖీ చేస్తున్నాం… | जाँच रहे हैं… |
| `push.adm.reach` | Would reach {students} students on {devices} devices now. | ఇప్పుడు {devices} డివైస్‌లలో {students} విద్యార్థులకు చేరుతుంది. | अभी {devices} डिवाइस पर {students} छात्रों तक पहुँचेगा। |
| `push.adm.reachNote` | Counts only. Students who turned announcements off, or have no device, are not counted. | లెక్కలు మాత్రమే. ప్రకటనలు ఆఫ్ చేసినవారు, డివైస్ లేనివారు లెక్కించబడరు. | सिर्फ़ गिनती। जिन्होंने घोषणाएँ बंद कीं या जिनके पास डिवाइस नहीं, वे नहीं गिने गए। |
| `push.adm.lockCap` | How it shows on a lock screen | లాక్ స్క్రీన్‌పై ఎలా కనిపిస్తుంది | लॉक स्क्रीन पर कैसा दिखेगा |
| `push.adm.send` | Send | పంపండి | भेजें |
| `push.adm.schedule` | Schedule | షెడ్యూల్ చేయండి | शेड्यूल करें |
| `push.adm.confirmTitle` | Send this announcement? | ఈ ప్రకటన పంపాలా? | यह घोषणा भेजें? |
| `push.adm.confirmBody` | It goes to {students} students on {devices} devices. Pushes can’t be taken back once sent. | ఇది {devices} డివైస్‌లలో {students} విద్యార్థులకు వెళ్తుంది. పంపిన తర్వాత వెనక్కి తీసుకోలేరు. | यह {devices} डिवाइस पर {students} छात्रों को जाएगी। भेजने के बाद पुश वापस नहीं लिए जा सकते। |
| `push.adm.confirmScheduled` | It goes out at {time}, to whoever matches then. You can cancel it until then. | ఇది {time} కు, అప్పుడు సరిపోయే వారికి వెళ్తుంది. అప్పటి వరకు రద్దు చేయవచ్చు. | यह {time} पर, तब मेल खाने वालों को जाएगी। तब तक रद्द कर सकते हैं। |
| `push.adm.created` | Saved. It goes out within a minute of its time. | సేవ్ అయింది. సమయం వచ్చిన నిమిషంలో వెళ్తుంది. | सेव हो गई। अपने समय के एक मिनट में जाती है। |
| `push.adm.createFailed` | It wasn’t saved. Check the problems above, then try again. | సేవ్ కాలేదు. పై సమస్యలు చూసి, మళ్లీ ప్రయత్నించండి. | सेव नहीं हुई। ऊपर की समस्याएँ देखें, फिर कोशिश करें। |
| `push.adm.needsPreview` | Preview it first: the check and the count run on the server. | ముందు ప్రివ్యూ చూడండి: తనిఖీ, లెక్క సర్వర్‌లో జరుగుతాయి. | पहले प्रीव्यू देखें: जाँच और गिनती सर्वर पर होती है। |
| `push.adm.problem.TITLE_EMPTY` | Add a title. | శీర్షిక జోడించండి. | शीर्षक जोड़ें। |
| `push.adm.problem.BODY_EMPTY` | Add a message. | సందేశం జోడించండి. | संदेश जोड़ें। |
| `push.adm.problem.TITLE_TOO_LONG` | The title is too long. | శీర్షిక చాలా పొడవుగా ఉంది. | शीर्षक बहुत लंबा है। |
| `push.adm.problem.BODY_TOO_LONG` | The message is too long. | సందేశం చాలా పొడవుగా ఉంది. | संदेश बहुत लंबा है। |
| `push.adm.problem.HEALTH_TERM` | It mentions health (a condition, medicine, test, doctor or camp). Announcements can’t: health notices need a clinical review first. | ఇందులో ఆరోగ్యం ప్రస్తావన ఉంది (వ్యాధి, మందు, పరీక్ష, డాక్టర్ లేదా క్యాంప్). ప్రకటనల్లో ఉండకూడదు: ఆరోగ్య నోటీసులకు ముందు క్లినికల్ సమీక్ష కావాలి. | इसमें सेहत की बात है (बीमारी, दवा, जाँच, डॉक्टर या कैंप)। घोषणाओं में नहीं हो सकती: सेहत की सूचनाओं को पहले क्लिनिकल समीक्षा चाहिए। |
| `push.adm.problem.ASKS_FOR_CODE` | It mentions a code, password or ID number. We never ask for those in a message. | ఇందులో కోడ్, పాస్‌వర్డ్ లేదా ID నంబర్ ప్రస్తావన ఉంది. సందేశంలో మేము వాటిని ఎప్పుడూ అడగము. | इसमें कोड, पासवर्ड या ID नंबर का ज़िक्र है। हम संदेश में ये कभी नहीं माँगते। |
| `push.adm.problem.HAS_LINK` | It has a link. Pushes carry no links; students open the app instead. | ఇందులో లింక్ ఉంది. పుష్‌లలో లింక్‌లు ఉండవు; విద్యార్థులు యాప్ తెరుస్తారు. | इसमें लिंक है। पुश में लिंक नहीं होते; छात्र ऐप खोलते हैं। |
| `push.adm.problem.SCHEDULE_TOO_FAR` | That is too far ahead. | అది చాలా దూరంలో ఉంది. | यह बहुत आगे है। |
| `push.adm.problem.UNKNOWN_CAMPUS` | No verified student is at that campus. | ఆ క్యాంపస్‌లో ధృవీకరించిన విద్యార్థి ఎవరూ లేరు. | उस कैंपस में कोई सत्यापित छात्र नहीं है। |
| `push.adm.providers` | Phones: {phone}. Browsers: {web}. | ఫోన్‌లు: {phone}. బ్రౌజర్‌లు: {web}. | फ़ोन: {phone}। ब्राउज़र: {web}। |
| `push.adm.providerOn` | set up | సెట్ అయింది | सेट है |
| `push.adm.providerOff` | not set up (no push is sent) | సెట్ కాలేదు (పుష్ పంపబడదు) | सेट नहीं (कोई पुश नहीं जाता) |
| `push.adm.history` | Sent and scheduled | పంపినవి, షెడ్యూల్ చేసినవి | भेजी गई और शेड्यूल की गई |
| `push.adm.loading` | Loading announcements | ప్రకటనలు లోడ్ అవుతున్నాయి | घोषणाएँ लोड हो रही हैं |
| `push.adm.error` | Announcements didn’t load | ప్రకటనలు లోడ్ కాలేదు | घोषणाएँ लोड नहीं हुईं |
| `push.adm.empty` | No announcements yet | ఇంకా ప్రకటనలు లేవు | अभी कोई घोषणा नहीं |
| `push.adm.emptyBody` | Write one above. Nothing is sent until you confirm. | పైన ఒకటి రాయండి. మీరు నిర్ధారించే వరకు ఏదీ పంపబడదు. | ऊपर एक लिखें। जब तक आप पुष्टि न करें, कुछ नहीं भेजा जाता। |
| `push.adm.caption` | Announcements, newest first, with delivery counts | ప్రకటనలు, కొత్తవి ముందు, డెలివరీ లెక్కలతో | घोषणाएँ, नई पहले, डिलीवरी गिनती के साथ |
| `push.adm.col.status` | Status | స్థితి | स्थिति |
| `push.adm.col.what` | Announcement | ప్రకటన | घोषणा |
| `push.adm.col.who` | Who | ఎవరికి | किसे |
| `push.adm.col.when` | When | ఎప్పుడు | कब |
| `push.adm.col.counts` | Devices: sent · delivered · failed · waiting | డివైస్‌లు: పంపినవి · చేరినవి · విఫలం · వేచి ఉన్నవి | डिवाइस: भेजे · पहुँचे · विफल · बाकी |
| `push.adm.col.action` | Action | చర్య | कार्रवाई |
| `push.adm.status.SCHEDULED` | Scheduled | షెడ్యూల్ అయింది | शेड्यूल |
| `push.adm.status.SENDING` | Sending | పంపుతోంది | भेज रहे हैं |
| `push.adm.status.SENT` | Sent | పంపబడింది | भेजी गई |
| `push.adm.status.CANCELLED` | Cancelled | రద్దు అయింది | रद्द |
| `push.adm.cancel` | Cancel | రద్దు చేయండి | रद्द करें |
| `push.adm.cancelSpoken` | Cancel “{title}” | “{title}” రద్దు చేయండి | “{title}” रद्द करें |
| `push.adm.cancelTitle` | Cancel this announcement? | ఈ ప్రకటన రద్దు చేయాలా? | यह घोषणा रद्द करें? |
| `push.adm.cancelBody` | It won’t be sent. This is recorded in the audit log. | ఇది పంపబడదు. ఇది ఆడిట్ లాగ్‌లో నమోదవుతుంది. | यह नहीं भेजी जाएगी। यह ऑडिट लॉग में दर्ज होता है। |
| `push.adm.cancelFailed` | It couldn’t be cancelled. It may already be sending. | రద్దు చేయలేకపోయాం. ఇది ఇప్పటికే పంపుతూ ఉండవచ్చు. | रद्द नहीं हो सकी। हो सकता है यह भेजी जा रही हो। |
| `push.adm.keep` | Keep it | ఉంచండి | रहने दें |

## newsroomContent — Content module, series, share kit, crisis lines (feat/newsroom-2, `src/i18n/areas/newsroomContent.ts`, and the new template keys in `src/i18n/areas/newsroom.ts`)

Notes for the reviewer: "Monday Motivation" is a series name and stays in English. "Auto" (an autopilot post) stays as is.
"precision" here means "traceable to the source", not accuracy in general. Keep Tele-MANAS, 14416 and 112 exactly.

### New templates and blocks (`newsroom.ts`)

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `news.tpl.MOTIVATION` | Motivation | మోటివేషన్ | मोटिवेशन |
| `news.tpl.SERIES_EPISODE` | Series episode | సిరీస్ ఎపిసోడ్ | सीरीज़ एपिसोड |
| `news.tpl.EVENT` | Event | ఈవెంట్ | इवेंट |
| `news.tpl.CAMPUS_SPOTLIGHT` | Campus spotlight | క్యాంపస్ స్పాట్‌లైట్ | कैंपस स्पॉटलाइट |
| `news.tpl.EXPLAINER` | Explainer | వివరణ | व्याख्या |
| `news.tpl.MYTH_FACT` | Myth vs fact | అపోహ vs వాస్తవం | मिथक बनाम तथ्य |
| `news.tpl.QUICK_CARD` | Quick card | క్విక్ కార్డ్ | क्विक कार्ड |
| `news.tplPlural.MOTIVATION` | Motivation | మోటివేషన్ | मोटिवेशन |
| `news.tplPlural.SERIES_EPISODE` | Series | సిరీస్ | सीरीज़ |
| `news.tplPlural.EVENT` | Events | ఈవెంట్‌లు | इवेंट |
| `news.tplPlural.CAMPUS_SPOTLIGHT` | Campus spotlights | క్యాంపస్ స్పాట్‌లైట్‌లు | कैंपस स्पॉटलाइट |
| `news.tplPlural.EXPLAINER` | Explainers | వివరణలు | व्याख्याएँ |
| `news.tplPlural.MYTH_FACT` | Myths vs facts | అపోహలు vs వాస్తవాలు | मिथक बनाम तथ्य |
| `news.tplPlural.QUICK_CARD` | Quick cards | క్విక్ కార్డ్‌లు | क्विक कार्ड |
| `news.tplAbout.MOTIVATION` | Orange cover. A short line or a clearly attributed public-domain quote. No advice. | నారింజ కవర్. ఒక చిన్న మాట లేదా స్పష్టంగా ఆపాదించిన పబ్లిక్-డొమైన్ కోట్. సలహా లేదు. | नारंगी कवर। एक छोटी बात या साफ़ तौर पर किसी के नाम का पब्लिक-डोमेन उद्धरण। कोई सलाह नहीं। |
| `news.tplAbout.SERIES_EPISODE` | Teal cover (or its series' colour), numbered in its series. | టీల్ కవర్ (లేదా దాని సిరీస్ రంగు), సిరీస్‌లో నంబర్‌తో. | टील कवर (या उसकी सीरीज़ का रंग), सीरीज़ में नंबर के साथ। |
| `news.tplAbout.EVENT` | Rose cover, with a key-facts box for when and where. | గులాబీ కవర్, ఎప్పుడు, ఎక్కడ కోసం ముఖ్య వివరాల బాక్స్‌తో. | गुलाबी कवर, कब और कहाँ के लिए मुख्य तथ्यों के बॉक्स के साथ। |
| `news.tplAbout.CAMPUS_SPOTLIGHT` | Sky cover. A campus team, club or service, never a student's health. | ఆకాశ నీలం కవర్. క్యాంపస్ టీమ్, క్లబ్ లేదా సేవ, ఎప్పుడూ విద్యార్థి ఆరోగ్యం కాదు. | आसमानी कवर। कैंपस की टीम, क्लब या सेवा, कभी किसी छात्र का स्वास्थ्य नहीं। |
| `news.tplAbout.EXPLAINER` | Blue cover, for how something works. | నీలం కవర్, ఏదైనా ఎలా పని చేస్తుందో చెప్పడానికి. | नीला कवर, कोई चीज़ कैसे काम करती है। |
| `news.tplAbout.MYTH_FACT` | Violet cover, myth and fact side by side. | ఊదా కవర్, అపోహ, వాస్తవం పక్కపక్కనే. | बैंगनी कवर, मिथक और तथ्य साथ-साथ। |
| `news.tplAbout.QUICK_CARD` | Navy cover, one big figure and a few facts. Only figures from a source. | నేవీ కవర్, ఒక పెద్ద సంఖ్య, కొన్ని వాస్తవాలు. మూలంలోని సంఖ్యలు మాత్రమే. | नेवी कवर, एक बड़ा आँकड़ा और कुछ तथ्य। सिर्फ़ स्रोत के आँकड़े। |
| `news.block.mythfact` | Myth and fact | అపోహ, వాస్తవం | मिथक और तथ्य |
| `news.block.stat` | Big figure | పెద్ద సంఖ్య | बड़ा आँकड़ा |
| `news.adm.eyebrow` | Newsroom | న్యూస్‌రూమ్ | न्यूज़रूम |
| `news.adm.title` | Content | కంటెంట్ | कंटेंट |
| `news.adm.subtitle` | Every post on the site, typed or Auto: News, Blog and series in the SK templates. Health posts typed by the team go out after a clinician approves them; auto posts go out only when precise. | సైట్‌లోని ప్రతి పోస్ట్, టీమ్ రాసినది లేదా Auto: SK టెంప్లేట్‌లలో వార్తలు, బ్లాగ్, సిరీస్. టీమ్ రాసిన ఆరోగ్య పోస్ట్‌లు డాక్టర్ ఆమోదం తర్వాత; Auto పోస్ట్‌లు ఖచ్చితంగా ఉంటేనే ప్రచురితమవుతాయి. | साइट की हर पोस्ट, टीम की लिखी या Auto: SK टेम्पलेट में ख़बरें, ब्लॉग और सीरीज़। टीम की लिखी स्वास्थ्य पोस्ट डॉक्टर की मंज़ूरी के बाद; Auto पोस्ट सिर्फ़ सटीक होने पर प्रकाशित होती हैं। |

### Content module (`newsroomContent.ts`)

| Key | English | te (current) | hi (current) |
|---|---|---|---|
| `cms.tab.posts` | All posts | అన్ని పోస్ట్‌లు | सभी पोस्ट |
| `cms.tab.review` | Review | సమీక్ష | समीक्षा |
| `cms.tab.series` | Series | సిరీస్ | सीरीज़ |
| `cms.tab.categories` | Categories | విభాగాలు | श्रेणियाँ |
| `cms.tab.sources` | Sources | మూలాలు | स्रोत |
| `cms.tab.share` | Share kit | షేర్ కిట్ | शेयर किट |
| `cms.tab.analytics` | Analytics | గణాంకాలు | आँकड़े |
| `cms.loading` | Loading… | లోడ్ అవుతోంది… | लोड हो रहा है… |
| `cms.failed` | That didn't work. Try again. | అది పని చేయలేదు. మళ్లీ ప్రయత్నించండి. | यह नहीं हुआ। फिर से कोशिश करें। |
| `cms.save` | Save | సేవ్ చేయండి | सेव करें |
| `cms.cancel` | Cancel | రద్దు చేయండి | रद्द करें |
| `cms.edit` | Edit | మార్చండి | बदलें |
| `cms.editSpoken` | Edit {name} | {name} మార్చండి | {name} बदलें |
| `cms.archive` | Archive | ఆర్కైవ్ చేయండి | आर्काइव करें |
| `cms.archiveSpoken` | Archive {name} | {name} ఆర్కైవ్ చేయండి | {name} आर्काइव करें |
| `cms.restore` | Bring back | తిరిగి తీసుకురండి | वापस लाएँ |
| `cms.restoreSpoken` | Bring back {name} | {name} తిరిగి తీసుకురండి | {name} वापस लाएँ |
| `cms.archived` | Archived | ఆర్కైవ్ అయింది | आर्काइव किया गया |
| `cms.active` | Active | వాడుకలో ఉంది | चालू |
| `cms.none` | None | ఏదీ లేదు | कोई नहीं |
| `cms.unpublishSpoken` | Unpublish {title} | {title} ప్రచురణ ఆపండి | {title} का प्रकाशन हटाएँ |
| `cms.shareSpoken` | Share kit for {title} | {title} కోసం షేర్ కిట్ | {title} के लिए शेयर किट |
| `cms.scheduleAt` | Publish later ({zone}) | తర్వాత ప్రచురించండి ({zone}) | बाद में प्रकाशित करें ({zone}) |
| `cms.origin.all` | Typed and Auto | టీమ్ రాసినవి, Auto | टीम के लिखे और Auto |
| `cms.origin.AUTO` | Auto only | Auto మాత్రమే | सिर्फ़ Auto |
| `cms.origin.MANUAL` | Typed by the team | టీమ్ రాసినవి | टीम के लिखे |
| `cms.f.category` | Category | విభాగం | श्रेणी |
| `cms.f.categoryHint` | Readers can filter by it; its hashtags go into the LinkedIn caption. | పాఠకులు దీనితో ఫిల్టర్ చేయగలరు; దీని హ్యాష్‌ట్యాగ్‌లు LinkedIn క్యాప్షన్‌లో వస్తాయి. | पाठक इससे फ़िल्टर कर सकते हैं; इसके हैशटैग LinkedIn कैप्शन में जाते हैं। |
| `cms.f.series` | Series | సిరీస్ | सीरीज़ |
| `cms.f.seriesHint` | Adding a post to a series gives it the next episode number. | పోస్ట్‌ను సిరీస్‌లో చేర్చితే దానికి తర్వాతి ఎపిసోడ్ నంబర్ వస్తుంది. | पोस्ट को सीरीज़ में जोड़ने पर उसे अगला एपिसोड नंबर मिलता है। |
| `cms.f.source` | Source | మూలం | स्रोत |
| `cms.f.origin` | Typed or Auto | టీమ్ రాసినది లేదా Auto | टीम का लिखा या Auto |
| `cms.f.crisisNote` | Posts in this category always show Tele-MANAS 14416 and 112. | ఈ విభాగంలోని పోస్ట్‌లపై ఎప్పుడూ Tele-MANAS 14416, 112 కనిపిస్తాయి. | इस श्रेणी की पोस्ट पर हमेशा Tele-MANAS 14416 और 112 दिखते हैं। |
| `cms.f.clinicalNote` | This is health content: a clinician must approve exactly this version before it goes out. | ఇది ఆరోగ్య కంటెంట్: ప్రచురించే ముందు డాక్టర్ ఈ వెర్షన్‌నే ఆమోదించాలి. | यह स्वास्थ्य सामग्री है: प्रकाशन से पहले डॉक्टर को यही संस्करण मंज़ूर करना होगा। |
| `cms.help.title` | Writing help | రాయడంలో సహాయం | लिखने में मदद |
| `cms.help.words` | {n} words (this template: {min}–{max}) | {n} పదాలు (ఈ టెంప్లేట్: {min}–{max}) | {n} शब्द (इस टेम्पलेट के लिए: {min}–{max}) |
| `cms.help.short` | a little short | కొంచెం చిన్నది | थोड़ा छोटा |
| `cms.help.long` | long for this template | ఈ టెంప్లేట్‌కు పెద్దది | इस टेम्पलेट के लिए लंबा |
| `cms.help.checksAria` | Accessibility checks | యాక్సెసిబిలిటీ తనిఖీలు | एक्सेसिबिलिटी जाँच |
| `cms.help.similar` | A recent post looks like the same topic: | ఇటీవలి పోస్ట్ ఇదే విషయంలా ఉంది: | हाल की एक पोस्ट इसी विषय की लगती है: |
| `cms.check.coverAlt` | The cover is described for screen readers | స్క్రీన్ రీడర్‌ల కోసం కవర్ వివరణ ఉంది | स्क्रीन रीडर के लिए कवर का विवरण है |
| `cms.check.imageAlt` | Every image has alt text | ప్రతి చిత్రానికి alt టెక్స్ట్ ఉంది | हर तस्वीर में alt टेक्स्ट है |
| `cms.check.headings` | Headings have words and each one leads into text | హెడింగ్‌లలో పదాలు ఉన్నాయి, ప్రతి దాని తర్వాత టెక్స్ట్ ఉంది | हेडिंग में शब्द हैं और हर हेडिंग के बाद टेक्स्ट है |
| `cms.check.links` | Buttons say where they go (not "click here") | బటన్‌లు ఎక్కడికి వెళ్తాయో చెబుతాయి ("ఇక్కడ క్లిక్ చేయండి" కాదు) | बटन बताते हैं कि वे कहाँ ले जाते हैं ("यहाँ क्लिक करें" नहीं) |
| `cms.check.summary` | There is a summary (it is also the link preview) | సారాంశం ఉంది (ఇది లింక్ ప్రివ్యూ కూడా) | सारांश है (यही लिंक प्रीव्यू भी है) |
| `cms.preview.aria` | Preview as | ఇలా ప్రివ్యూ చూడండి | ऐसे प्रीव्यू करें |
| `cms.preview.desktop` | Desktop | డెస్క్‌టాప్ | डेस्कटॉप |
| `cms.preview.phone` | Phone | ఫోన్ | फ़ोन |
| `cms.preview.linkedin` | LinkedIn card | LinkedIn కార్డ్ | LinkedIn कार्ड |
| `cms.preview.domain` | {domain} | {domain} | {domain} |
| `cms.block.myth` | Myth | అపోహ | मिथक |
| `cms.block.fact` | Fact | వాస్తవం | तथ्य |
| `cms.block.mythfactAria` | Myth and fact | అపోహ, వాస్తవం | मिथक और तथ्य |
| `cms.block.statValue` | Figure | సంఖ్య | आँकड़ा |
| `cms.block.statValueHint` | Up to 12 characters, e.g. 7–9 h. Only figures from your source. | 12 అక్షరాల వరకు, ఉదా. 7–9 గం. మీ మూలంలోని సంఖ్యలు మాత్రమే. | 12 अक्षर तक, जैसे 7–9 घंटे। सिर्फ़ आपके स्रोत के आँकड़े। |
| `cms.block.statLabel` | What it means | దాని అర్థం | इसका मतलब |
| `cms.precision.title` | Precision check | ఖచ్చితత్వ తనిఖీ | सटीकता जाँच |
| `cms.precision.score` | {n}% (needs {min}%) | {n}% (కావాల్సింది {min}%) | {n}% (चाहिए {min}%) |
| `cms.precision.rule` | Every sentence must be traceable to its source: its numbers, dates and names too. No advice, no claim the source does not make. | ప్రతి వాక్యం దాని మూలంలో కనిపించాలి: సంఖ్యలు, తేదీలు, పేర్లు కూడా. సలహా లేదు, మూలం చెప్పని దావా లేదు. | हर वाक्य अपने स्रोत में मिलना चाहिए: उसके अंक, तारीख़ें और नाम भी। कोई सलाह नहीं, कोई ऐसा दावा नहीं जो स्रोत न करे। |
| `cms.precision.gate` | Precision gate | ఖచ్చితత్వ గేట్ | सटीकता गेट |
| `cms.precision.gateBody` | Auto posts at or above the threshold go out on their own. Below it they wait in Review with each failed sentence shown. | పరిమితి లేదా అంతకంటే ఎక్కువ ఉన్న Auto పోస్ట్‌లు తమంతట తాము ప్రచురితమవుతాయి. తక్కువైతే, విఫలమైన ప్రతి వాక్యంతో సమీక్షలో వేచి ఉంటాయి. | सीमा या उससे ऊपर की Auto पोस्ट अपने आप प्रकाशित होती हैं। नीचे की पोस्ट हर असफल वाक्य के साथ समीक्षा में रुकती हैं। |
| `cms.precision.crisis` | Mental health posts always carry Tele-MANAS 14416 and 112, and never give dosing or a diagnosis. | మానసిక ఆరోగ్య పోస్ట్‌లపై ఎప్పుడూ Tele-MANAS 14416, 112 ఉంటాయి; మోతాదు లేదా నిర్ధారణ ఎప్పుడూ ఇవ్వవు. | मानसिक स्वास्थ्य की पोस्ट पर हमेशा Tele-MANAS 14416 और 112 होते हैं, और कभी खुराक या निदान नहीं। |
| `cms.reason.NOT_IN_SOURCE` | Not in the source | మూలంలో లేదు | स्रोत में नहीं है |
| `cms.reason.NEW_NUMBER` | A number or date the source does not have | మూలంలో లేని సంఖ్య లేదా తేదీ | ऐसा अंक या तारीख़ जो स्रोत में नहीं |
| `cms.reason.NEW_NAME` | A name the source does not have | మూలంలో లేని పేరు | ऐसा नाम जो स्रोत में नहीं |
| `cms.reason.ADVICE` | Medical advice (dose, diagnosis or treatment) | వైద్య సలహా (మోతాదు, నిర్ధారణ లేదా చికిత్స) | चिकित्सा सलाह (खुराक, निदान या इलाज) |
| `cms.reason.UNVERIFIABLE` | A claim the source does not make | మూలం చెప్పని దావా | ऐसा दावा जो स्रोत नहीं करता |
| `cms.reason.SOURCE_NOT_ALLOWED` | The source is not on the allow-list | మూలం అనుమతి జాబితాలో లేదు | स्रोत अनुमति-सूची में नहीं है |
| `cms.reason.CRISIS` | Crisis words: a person reads it first | సంక్షోభ పదాలు: ముందుగా ఒక వ్యక్తి చదవాలి | संकट वाले शब्द: पहले कोई व्यक्ति पढ़े |
| `cms.reason.SOURCE_OLD` | The source item is too old | మూల అంశం చాలా పాతది | स्रोत की ख़बर बहुत पुरानी है |
| `cms.reason.SOURCE_UNDATED` | The source gives no date | మూలం తేదీ ఇవ్వలేదు | स्रोत में तारीख़ नहीं है |
| `cms.reason.NOTHING_TO_CHECK` | Nothing to check | తనిఖీ చేయడానికి ఏమీ లేదు | जाँचने को कुछ नहीं |
| `cms.review.intro` | Auto drafts waiting for you (not precise enough, or auto-publish is off) and posts waiting for a clinician. | మీ కోసం వేచి ఉన్న Auto డ్రాఫ్ట్‌లు (తగినంత ఖచ్చితం కాదు, లేదా ఆటో-ప్రచురణ ఆఫ్) మరియు డాక్టర్ కోసం వేచి ఉన్న పోస్ట్‌లు. | आपके लिए रुके Auto ड्राफ़्ट (पर्याप्त सटीक नहीं, या ऑटो-प्रकाशन बंद) और डॉक्टर के लिए रुकी पोस्ट। |
| `cms.review.empty` | Nothing is waiting for review. | సమీక్ష కోసం ఏదీ వేచి లేదు. | समीक्षा के लिए कुछ नहीं रुका है। |
| `cms.review.imprecise` | Not precise enough | తగినంత ఖచ్చితం కాదు | पर्याप्त सटीक नहीं |
| `cms.review.clinician` | Waiting for a clinician | డాక్టర్ కోసం వేచి ఉంది | डॉक्टर का इंतज़ार |
| `cms.review.editor` | Waiting for you | మీ కోసం వేచి ఉంది | आपका इंतज़ार |
| `cms.review.clinicianNote` | Only a clinician can approve this one. It is in their review queue. | దీన్ని డాక్టర్ మాత్రమే ఆమోదించగలరు. ఇది వారి సమీక్ష క్యూలో ఉంది. | इसे सिर्फ़ डॉक्टर मंज़ूर कर सकते हैं। यह उनकी समीक्षा कतार में है। |
| `cms.review.open` | Open and edit | తెరిచి మార్చండి | खोलें और बदलें |
| `cms.review.publish` | Publish as it is | ఉన్నట్లే ప్రచురించండి | जैसा है वैसा प्रकाशित करें |
| `cms.state.IMPRECISE` | Not precise enough | తగినంత ఖచ్చితం కాదు | पर्याप्त सटीक नहीं |
| `cms.cat.intro` | Categories group posts for readers, colour their chips, give LinkedIn captions their hashtags and teach the aggregator where news belongs. | విభాగాలు పాఠకుల కోసం పోస్ట్‌లను సమూహపరుస్తాయి, చిప్‌లకు రంగు ఇస్తాయి, LinkedIn క్యాప్షన్‌లకు హ్యాష్‌ట్యాగ్‌లు ఇస్తాయి, వార్త ఎక్కడ చేరాలో అగ్రిగేటర్‌కు చెబుతాయి. | श्रेणियाँ पाठकों के लिए पोस्ट समूहित करती हैं, चिप को रंग देती हैं, LinkedIn कैप्शन को हैशटैग देती हैं और एग्रीगेटर को बताती हैं कि ख़बर कहाँ जाए। |
| `cms.cat.new` | New category | కొత్త విభాగం | नई श्रेणी |
| `cms.cat.edit` | Edit category | విభాగాన్ని మార్చండి | श्रेणी बदलें |
| `cms.cat.name` | Name | పేరు | नाम |
| `cms.cat.hue` | Colour | రంగు | रंग |
| `cms.cat.icon` | Icon | ఐకాన్ | आइकन |
| `cms.cat.hashtags` | Hashtags | హ్యాష్‌ట్యాగ్‌లు | हैशटैग |
| `cms.cat.hashtagsHint` | Comma-separated, without #. The first ones go into LinkedIn captions. | కామాతో వేరు చేసి, # లేకుండా. మొదటివి LinkedIn క్యాప్షన్‌లో వస్తాయి. | कॉमा से अलग, # के बिना। पहले वाले LinkedIn कैप्शन में जाते हैं। |
| `cms.cat.keywords` | Aggregator keywords | అగ్రిగేటర్ కీవర్డ్‌లు | एग्रीगेटर कीवर्ड |
| `cms.cat.keywordsHint` | Comma-separated words or phrases. News that mentions them most lands in this category. | కామాతో వేరు చేసిన పదాలు. వీటిని ఎక్కువగా ప్రస్తావించే వార్త ఈ విభాగంలో చేరుతుంది. | कॉमा से अलग शब्द। जिस ख़बर में ये सबसे ज़्यादा हों, वह इस श्रेणी में जाती है। |
| `cms.cat.topics` | Series topics | సిరీస్ అంశాలు | सीरीज़ विषय |
| `cms.cat.topicsHint` | Comma-separated. The health series writes about these, in order, from approved sources only. | కామాతో వేరు చేసి. ఆరోగ్య సిరీస్ ఆమోదించిన మూలాల నుంచే, క్రమంలో, వీటి గురించి రాస్తుంది. | कॉमा से अलग। स्वास्थ्य सीरीज़ इन पर, क्रम से, सिर्फ़ मंज़ूर स्रोतों से लिखती है। |
| `cms.cat.clinical` | Health advice: advice posts here need a clinician's approval | ఆరోగ్య సలహా: ఇక్కడి సలహా పోస్ట్‌లకు డాక్టర్ ఆమోదం కావాలి | स्वास्थ्य सलाह: यहाँ की सलाह वाली पोस्ट को डॉक्टर की मंज़ूरी चाहिए |
| `cms.cat.crisis` | Show Tele-MANAS 14416 and 112 on every post | ప్రతి పోస్ట్‌పై Tele-MANAS 14416, 112 చూపించండి | हर पोस्ट पर Tele-MANAS 14416 और 112 दिखाएँ |
| `cms.cat.protected` | Mental health always carries the crisis lines, needs a clinician and can't be archived. | మానసిక ఆరోగ్యంపై ఎప్పుడూ సంక్షోభ లైన్‌లు ఉంటాయి, డాక్టర్ ఆమోదం కావాలి, ఆర్కైవ్ చేయలేరు. | मानसिक स्वास्थ्य पर हमेशा संकट लाइनें होती हैं, डॉक्टर की मंज़ूरी चाहिए, और इसे आर्काइव नहीं किया जा सकता। |
| `cms.cat.rules` | Rules | నియమాలు | नियम |
| `cms.cat.clinicalShort` | Clinician | డాక్టర్ | डॉक्टर |
| `cms.cat.crisisShort` | Crisis lines | సంక్షోభ లైన్‌లు | संकट लाइनें |
| `cms.cat.posts` | Posts | పోస్ట్‌లు | पोस्ट |
| `cms.cat.empty` | No categories yet | ఇంకా విభాగాలు లేవు | अभी कोई श्रेणी नहीं |
| `cms.cat.what` | the categories | విభాగాలు | श्रेणियाँ |
| `cms.hue.indigo` | Indigo | ఇండిగో | इंडिगो |
| `cms.hue.violet` | Violet | ఊదా | बैंगनी |
| `cms.hue.blue` | Blue | నీలం | नीला |
| `cms.hue.sky` | Sky | ఆకాశ నీలం | आसमानी |
| `cms.hue.teal` | Teal | టీల్ | टील |
| `cms.hue.green` | Green | ఆకుపచ్చ | हरा |
| `cms.hue.amber` | Amber | కాషాయం | एम्बर |
| `cms.hue.orange` | Orange | నారింజ | नारंगी |
| `cms.hue.rose` | Rose | గులాబీ | गुलाबी |
| `cms.series.intro` | A series has its own page on the site and numbers its episodes. Monday Motivation and the health series are scheduled by the autopilot. | ప్రతి సిరీస్‌కు సైట్‌లో సొంత పేజీ ఉంటుంది, ఎపిసోడ్‌లకు నంబర్లు ఉంటాయి. Monday Motivation, ఆరోగ్య సిరీస్‌లను ఆటోపైలట్ షెడ్యూల్ చేస్తుంది. | हर सीरीज़ का साइट पर अपना पेज होता है और एपिसोड पर नंबर होते हैं। Monday Motivation और स्वास्थ्य सीरीज़ को ऑटोपायलट शेड्यूल करता है। |
| `cms.series.healthRule` | Health series episodes wait for a clinician while "Health posts need a clinician" is on. | "ఆరోగ్య పోస్ట్‌లకు డాక్టర్ కావాలి" ఆన్‌లో ఉన్నంతవరకు ఆరోగ్య సిరీస్ ఎపిసోడ్‌లు డాక్టర్ కోసం వేచి ఉంటాయి. | "स्वास्थ्य पोस्ट को डॉक्टर चाहिए" चालू रहने तक स्वास्थ्य सीरीज़ के एपिसोड डॉक्टर का इंतज़ार करते हैं। |
| `cms.series.new` | New series | కొత్త సిరీస్ | नई सीरीज़ |
| `cms.series.edit` | Edit series | సిరీస్ మార్చండి | सीरीज़ बदलें |
| `cms.series.name` | Name | పేరు | नाम |
| `cms.series.category` | Category | విభాగం | श्रेणी |
| `cms.series.template` | Template | టెంప్లేట్ | टेम्पलेट |
| `cms.series.hue` | Cover colour | కవర్ రంగు | कवर का रंग |
| `cms.series.summary` | What the series is | సిరీస్ ఏమిటి | सीरीज़ किस बारे में है |
| `cms.series.schedule` | Schedule | షెడ్యూల్ | शेड्यूल |
| `cms.series.scheduleInSettings` | Its days, hour and rota are in the Autopilot tab. | దీని రోజులు, సమయం, రోటా ఆటోపైలట్ ట్యాబ్‌లో ఉన్నాయి. | इसके दिन, समय और रोटा ऑटोपायलट टैब में हैं। |
| `cms.series.manual` | Episodes added by hand | ఎపిసోడ్‌లు చేతితో చేర్చబడతాయి | एपिसोड हाथ से जोड़े जाते हैं |
| `cms.series.autoMotivation` | Monday Motivation | Monday Motivation | Monday Motivation |
| `cms.series.autoHealth` | Health series | ఆరోగ్య సిరీస్ | स्वास्थ्य सीरीज़ |
| `cms.series.episodesShort` | Episodes | ఎపిసోడ్‌లు | एपिसोड |
| `cms.series.what` | the series | సిరీస్ | सीरीज़ |
| `cms.series.library` | Motivation library | మోటివేషన్ లైబ్రరీ | मोटिवेशन लाइब्रेरी |
| `cms.series.libraryRule` | Only the team's own words, or a quote with who said it and a link to its public-domain source. The autopilot never writes or attributes a quote itself. | టీమ్ సొంత మాటలు, లేదా చెప్పినవారి పేరు మరియు పబ్లిక్-డొమైన్ మూలం లింక్‌తో ఉన్న కోట్ మాత్రమే. ఆటోపైలట్ ఎప్పుడూ తానే కోట్ రాయదు లేదా ఎవరికీ ఆపాదించదు. | सिर्फ़ टीम के अपने शब्द, या कहने वाले के नाम और पब्लिक-डोमेन स्रोत के लिंक के साथ उद्धरण। ऑटोपायलट कभी ख़ुद उद्धरण नहीं लिखता, न किसी के नाम करता है। |
| `cms.series.lineKind` | Kind | రకం | प्रकार |
| `cms.series.own` | The team's own words | టీమ్ సొంత మాటలు | टीम के अपने शब्द |
| `cms.series.quote` | Quote | కోట్ | उद्धरण |
| `cms.series.lineText` | Text | టెక్స్ట్ | टेक्स्ट |
| `cms.series.cite` | Who said it | ఎవరు చెప్పారు | किसने कहा |
| `cms.series.sourceUrl` | Source (https) | మూలం (https) | स्रोत (https) |
| `cms.series.sourceUrlHint` | Where the quote is, in a public-domain text. | పబ్లిక్-డొమైన్ టెక్స్ట్‌లో కోట్ ఉన్న చోటు. | पब्लिक-डोमेन टेक्स्ट में उद्धरण कहाँ है। |
| `cms.series.publicDomain` | The source is in the public domain and the quote is exact | మూలం పబ్లిక్ డొమైన్‌లో ఉంది, కోట్ యథాతథంగా ఉంది | स्रोत पब्लिक डोमेन में है और उद्धरण हूबहू है |
| `cms.series.addLine` | Add a line | లైన్ చేర్చండి | लाइन जोड़ें |
| `cms.series.removeLine` | Remove this line | ఈ లైన్ తీసివేయండి | यह लाइन हटाएँ |
| `cms.series.label` | Series | సిరీస్ | सीरीज़ |
| `cms.series.episode` | Episode {n} | ఎపిసోడ్ {n} | एपिसोड {n} |
| `cms.series.episodeOf` | Episode {n} of {name} | {name} ఎపిసోడ్ {n} | {name} का एपिसोड {n} |
| `cms.series.episodes` | {n} episodes | {n} ఎపిసోడ్‌లు | {n} एपिसोड |
| `cms.series.episodesAria` | Episodes | ఎపిసోడ్‌లు | एपिसोड |
| `cms.series.latest` | Latest episodes | తాజా ఎపిసోడ్‌లు | नए एपिसोड |
| `cms.series.all` | Series | సిరీస్ | सीरीज़ |
| `cms.series.allBody` | Posts that come back on their day: Monday Motivation, and mental, women's and common health on Monday, Wednesday and Friday. | తమ రోజున తిరిగి వచ్చే పోస్ట్‌లు: Monday Motivation, సోమ, బుధ, శుక్రవారాల్లో మానసిక, మహిళల, సాధారణ ఆరోగ్యం. | अपने दिन लौटने वाली पोस्ट: Monday Motivation, और सोम, बुध, शुक्र को मानसिक, महिला और सामान्य स्वास्थ्य। |
| `cms.series.eyebrow` | StudentKare series | StudentKare సిరీస్ | StudentKare सीरीज़ |
| `cms.series.loading` | Loading the series… | సిరీస్ లోడ్ అవుతోంది… | सीरीज़ लोड हो रही है… |
| `cms.series.none` | No series yet | ఇంకా సిరీస్ లేవు | अभी कोई सीरीज़ नहीं |
| `cms.series.noneBody` | When a series publishes its first episode, it appears here. | ఒక సిరీస్ తన మొదటి ఎపిసోడ్ ప్రచురించినప్పుడు ఇక్కడ కనిపిస్తుంది. | जब कोई सीरीज़ अपना पहला एपिसोड प्रकाशित करेगी, वह यहाँ दिखेगी। |
| `cms.series.missing` | This series isn't published | ఈ సిరీస్ ప్రచురించబడలేదు | यह सीरीज़ प्रकाशित नहीं है |
| `cms.series.missingBody` | It may have no episodes yet, or the address is wrong. | దీనికి ఇంకా ఎపిసోడ్‌లు లేకపోవచ్చు, లేదా అడ్రస్ తప్పు కావచ్చు. | शायद इसके अभी एपिसोड नहीं हैं, या पता ग़लत है। |
| `cms.series.coverAlt` | Cover of the series {name} with the StudentKare shield | StudentKare షీల్డ్‌తో {name} సిరీస్ కవర్ | StudentKare शील्ड के साथ {name} सीरीज़ का कवर |
| `cms.lane.when` | On {days} at {hour}:00 ({zone}), drafted a day ahead. | {days} రోజుల్లో {hour}:00కు ({zone}), ఒక రోజు ముందే డ్రాఫ్ట్ అవుతుంది. | {days} को {hour}:00 बजे ({zone}), एक दिन पहले ड्राफ़्ट। |
| `cms.lane.library` | {n} lines in its library. An empty library drafts nothing. | లైబ్రరీలో {n} లైన్‌లు. లైబ్రరీ ఖాళీగా ఉంటే ఏదీ డ్రాఫ్ట్ కాదు. | लाइब्रेरी में {n} लाइनें। खाली लाइब्रेरी से कुछ ड्राफ़्ट नहीं होता। |
| `cms.lane.healthClinician` | Each episode waits for a clinician's approval, however precise. | ఎంత ఖచ్చితంగా ఉన్నా, ప్రతి ఎపిసోడ్ డాక్టర్ ఆమోదం కోసం వేచి ఉంటుంది. | चाहे जितना सटीक हो, हर एपिसोड डॉक्टर की मंज़ूरी का इंतज़ार करता है। |
| `cms.lane.healthPrecise` | Precise episodes go out on their own; imprecise ones wait for you in Review. | ఖచ్చితమైన ఎపిసోడ్‌లు తమంతట తాము ప్రచురితమవుతాయి; కానివి సమీక్షలో మీ కోసం వేచి ఉంటాయి. | सटीक एपिसोड अपने आप प्रकाशित होते हैं; बाकी समीक्षा में आपका इंतज़ार करते हैं। |
| `cms.lane.episodes` | Episodes so far: {n} | ఇప్పటివరకు ఎపిసోడ్‌లు: {n} | अब तक एपिसोड: {n} |
| `cms.lane.tipPrecise` | Health tips that pass the precision gate go out on their day; the rest wait for you in Content, Review. Turn on "Health posts need a clinician" to send every one to a clinician. | ఖచ్చితత్వ గేట్ దాటిన ఆరోగ్య చిట్కాలు తమ రోజున ప్రచురితమవుతాయి; మిగిలినవి కంటెంట్, సమీక్షలో మీ కోసం వేచి ఉంటాయి. ప్రతిదాన్నీ డాక్టర్‌కు పంపాలంటే "ఆరోగ్య పోస్ట్‌లకు డాక్టర్ కావాలి" ఆన్ చేయండి. | सटीकता गेट पार करने वाले हेल्थ टिप अपने दिन प्रकाशित होते हैं; बाकी कंटेंट, समीक्षा में आपका इंतज़ार करते हैं। हर टिप डॉक्टर को भेजने के लिए "स्वास्थ्य पोस्ट को डॉक्टर चाहिए" चालू करें। |
| `cms.key.fetch_interval_minutes` | Read feeds every (minutes) | ఫీడ్‌లను చదవడం ప్రతి (నిమిషాలు) | फ़ीड पढ़ें हर (मिनट) |
| `cms.key.health_requires_clinician` | Health posts need a clinician | ఆరోగ్య పోస్ట్‌లకు డాక్టర్ కావాలి | स्वास्थ्य पोस्ट को डॉक्टर चाहिए |
| `cms.key.precision_threshold` | Precision threshold | ఖచ్చితత్వ పరిమితి | सटीकता सीमा |
| `cms.key.series_auto_publish` | Series episodes go out on their own | సిరీస్ ఎపిసోడ్‌లు తమంతట తాము ప్రచురితమవుతాయి | सीरीज़ के एपिसोड अपने आप प्रकाशित हों |
| `cms.key.motivation_enabled` | Monday Motivation | Monday Motivation | Monday Motivation |
| `cms.key.motivation_days` | Motivation days | మోటివేషన్ రోజులు | मोटिवेशन के दिन |
| `cms.key.motivation_hour` | Motivation hour | మోటివేషన్ సమయం | मोटिवेशन का समय |
| `cms.key.health_enabled` | Health series | ఆరోగ్య సిరీస్ | स्वास्थ्य सीरीज़ |
| `cms.key.health_days` | Health series days | ఆరోగ్య సిరీస్ రోజులు | स्वास्थ्य सीरीज़ के दिन |
| `cms.key.health_hour` | Health series hour | ఆరోగ్య సిరీస్ సమయం | स्वास्थ्य सीरीज़ का समय |
| `cms.key.health_rota` | Health series rota | ఆరోగ్య సిరీస్ రోటా | स्वास्थ्य सीरीज़ का रोटा |
| `cms.sources.intro` | Only these official publishers. The aggregator reads them round the clock, every {n} minutes, and posts inside the news window. | ఈ అధికారిక ప్రచురణకర్తలు మాత్రమే. అగ్రిగేటర్ వీటిని రోజంతా, ప్రతి {n} నిమిషాలకు చదువుతుంది, వార్తల సమయంలోనే పోస్ట్ చేస్తుంది. | सिर्फ़ ये आधिकारिक प्रकाशक। एग्रीगेटर इन्हें चौबीसों घंटे, हर {n} मिनट पढ़ता है और ख़बरों के समय में पोस्ट करता है। |
| `cms.kit.intro` | Everything to post it yourself on LinkedIn and elsewhere. Nothing is posted for you. | LinkedIn మరియు ఇతర చోట్ల మీరే పోస్ట్ చేయడానికి అన్నీ. మీ తరఫున ఏదీ పోస్ట్ కాదు. | LinkedIn और दूसरी जगहों पर ख़ुद पोस्ट करने के लिए सब कुछ। आपकी ओर से कुछ पोस्ट नहीं होता। |
| `cms.kit.post` | Post | పోస్ట్ | पोस्ट |
| `cms.kit.none` | There is no post to share yet. | షేర్ చేయడానికి ఇంకా పోస్ట్ లేదు. | शेयर करने को अभी कोई पोस्ट नहीं है। |
| `cms.kit.notLive` | This post isn't on the site yet: its links open a page that isn't published. | ఈ పోస్ట్ ఇంకా సైట్‌లో లేదు: దీని లింక్‌లు ప్రచురించని పేజీని తెరుస్తాయి. | यह पोस्ट अभी साइट पर नहीं है: इसके लिंक अप्रकाशित पेज खोलेंगे। |
| `cms.kit.caption` | LinkedIn caption | LinkedIn క్యాప్షన్ | LinkedIn कैप्शन |
| `cms.kit.copyCaption` | Copy LinkedIn caption | LinkedIn క్యాప్షన్ కాపీ చేయండి | LinkedIn कैप्शन कॉपी करें |
| `cms.kit.links` | Share links | షేర్ లింక్‌లు | शेयर लिंक |
| `cms.kit.plainLinks` | Plain links with UTM tags. No tracking script. | UTM ట్యాగ్‌లతో సాధారణ లింక్‌లు. ట్రాకింగ్ స్క్రిప్ట్ లేదు. | UTM टैग वाले सादे लिंक। कोई ट्रैकिंग स्क्रिप्ट नहीं। |
| `cms.kit.cards` | Share cards | షేర్ కార్డ్‌లు | शेयर कार्ड |
| `cms.kit.landscapeAlt` | Share card, 1200 by 630 | షేర్ కార్డ్, 1200 x 630 | शेयर कार्ड, 1200 x 630 |
| `cms.kit.portraitAlt` | Share card, 1080 by 1350 | షేర్ కార్డ్, 1080 x 1350 | शेयर कार्ड, 1080 x 1350 |
| `cms.kit.downloadLandscape` | Download 1200×630 (link posts) | 1200×630 డౌన్‌లోడ్ చేయండి (లింక్ పోస్ట్‌లు) | 1200×630 डाउनलोड करें (लिंक पोस्ट) |
| `cms.kit.downloadPortrait` | Download 1080×1350 (LinkedIn and Instagram images) | 1080×1350 డౌన్‌లోడ్ చేయండి (LinkedIn, Instagram చిత్రాలు) | 1080×1350 डाउनलोड करें (LinkedIn और Instagram तस्वीरें) |
| `cms.kit.what` | the share kit | షేర్ కిట్ | शेयर किट |
| `cms.stats.privacy` | Counts only: no reader, address or device is kept. | లెక్కలు మాత్రమే: పాఠకుడు, అడ్రస్ లేదా డివైస్ ఏదీ ఉంచబడదు. | सिर्फ़ गिनती: कोई पाठक, पता या डिवाइस नहीं रखा जाता। |
| `cms.stats.off` | Counting is off (content.stats_enabled). | లెక్కింపు ఆఫ్‌లో ఉంది (content.stats_enabled). | गिनती बंद है (content.stats_enabled)। |
| `cms.stats.views` | Views | వీక్షణలు | व्यू |
| `cms.stats.shares` | Shares | షేర్‌లు | शेयर |
| `cms.stats.byNetwork` | By network | నెట్‌వర్క్ వారీగా | नेटवर्क के हिसाब से |
| `cms.stats.empty` | No views or shares yet | ఇంకా వీక్షణలు లేదా షేర్‌లు లేవు | अभी कोई व्यू या शेयर नहीं |
| `cms.stats.emptyBody` | Counts appear once a published post is opened or shared. | ప్రచురించిన పోస్ట్ తెరిచినప్పుడు లేదా షేర్ చేసినప్పుడు లెక్కలు కనిపిస్తాయి. | प्रकाशित पोस्ट खुलने या शेयर होने पर गिनती दिखेगी। |
| `cms.stats.what` | the counts | లెక్కలు | गिनती |
| `cms.notice.categorySaved` | Category saved. | విభాగం సేవ్ అయింది. | श्रेणी सेव हुई। |
| `cms.notice.categoryArchived` | Category archived. | విభాగం ఆర్కైవ్ అయింది. | श्रेणी आर्काइव हुई। |
| `cms.notice.categoryRestored` | Category back in use. | విభాగం మళ్లీ వాడుకలో ఉంది. | श्रेणी फिर से चालू है। |
| `cms.notice.seriesSaved` | Series saved. | సిరీస్ సేవ్ అయింది. | सीरीज़ सेव हुई। |
| `cms.notice.seriesArchived` | Series archived. | సిరీస్ ఆర్కైవ్ అయింది. | सीरीज़ आर्काइव हुई। |
| `cms.notice.seriesRestored` | Series back in use. | సిరీస్ మళ్లీ వాడుకలో ఉంది. | सीरीज़ फिर से चालू है। |
| `cms.notice.captionCopied` | Caption copied. | క్యాప్షన్ కాపీ అయింది. | कैप्शन कॉपी हुआ। |
| `cms.notice.copyFailed` | Couldn't copy. Select the caption and copy it. | కాపీ కాలేదు. క్యాప్షన్‌ను ఎంచుకుని కాపీ చేయండి. | कॉपी नहीं हुआ। कैप्शन चुनकर कॉपी करें। |
| `cms.share.native` | Share with your phone's apps | మీ ఫోన్ యాప్‌లతో షేర్ చేయండి | अपने फ़ोन के ऐप से शेयर करें |
| `cms.share.nativeShort` | Share… | షేర్… | शेयर… |
| `cms.share.facebook` | Share on Facebook | Facebookలో షేర్ చేయండి | Facebook पर शेयर करें |
| `cms.share.telegram` | Share on Telegram | Telegramలో షేర్ చేయండి | Telegram पर शेयर करें |
| `cms.share.email` | Share by email | ఈమెయిల్‌తో షేర్ చేయండి | ईमेल से शेयर करें |
| `cms.share.done` | Shared. | షేర్ అయింది. | शेयर हुआ। |
| `cms.share.aria` | Share {title} | {title} షేర్ చేయండి | {title} शेयर करें |
| `cms.share.name.linkedin` | LinkedIn | LinkedIn | LinkedIn |
| `cms.share.name.whatsapp` | WhatsApp | WhatsApp | WhatsApp |
| `cms.share.name.x` | X | X | X |
| `cms.share.name.facebook` | Facebook | Facebook | Facebook |
| `cms.share.name.telegram` | Telegram | Telegram | Telegram |
| `cms.share.name.email` | Email | ఈమెయిల్ | ईमेल |
| `cms.share.name.copy` | Copied link | కాపీ చేసిన లింక్ | कॉपी किया लिंक |
| `cms.share.name.native` | Phone share | ఫోన్ షేర్ | फ़ोन शेयर |
| `cms.crisis.aria` | Help now | ఇప్పుడే సహాయం | अभी मदद |
| `cms.crisis.title` | If you are struggling, talk to someone now | మీకు కష్టంగా ఉంటే, ఇప్పుడే ఎవరితోనైనా మాట్లాడండి | अगर मुश्किल लग रहा है, तो अभी किसी से बात करें |
| `cms.crisis.telemanas` | Tele-MANAS 14416 (free, 24×7) | Tele-MANAS 14416 (ఉచితం, 24×7) | Tele-MANAS 14416 (मुफ़्त, 24×7) |
| `cms.crisis.emergency` | Emergency 112 | అత్యవసరం 112 | आपातकाल 112 |
| `cms.topics.aria` | Filter by category | విభాగం వారీగా ఫిల్టర్ చేయండి | श्रेणी से फ़िल्टर करें |
| `cms.topics.all` | All topics | అన్ని అంశాలు | सभी विषय |

