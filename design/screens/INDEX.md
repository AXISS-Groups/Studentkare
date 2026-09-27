# Student Kare — screen index

238 screens across 8 pages. Each has a picture (`screens/`) and its source markup (`source/`).

**Tier** (see DESIGN.md §5): 1 = safety-critical, full design + named review · 2 = core flow · 3 = composable from components. Tiers here are a first pass — confirm before building.


## 1 · Launch & onboarding

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [Main](screens/01-launch-onboarding/Main.jpg) · [source](source/01-launch-onboarding/Main.html) | Splash — changes with the time of day (morning · afternoon · evening) | phone | 390×844 | 2 |
| [SplashPulse](screens/01-launch-onboarding/SplashPulse.jpg) · [source](source/01-launch-onboarding/SplashPulse.html) | Splash variant — afternoon (heartbeat) | phone | 390×844 | 2 |
| [SplashVault](screens/01-launch-onboarding/SplashVault.jpg) · [source](source/01-launch-onboarding/SplashVault.html) | Splash variant — evening (care circle) | phone | 390×844 | 2 |
| [Onboarding1](screens/01-launch-onboarding/Onboarding1.jpg) · [source](source/01-launch-onboarding/Onboarding1.html) | Onboarding 1 — Campus care | phone | 390×844 | 2 |
| [Onboarding2](screens/01-launch-onboarding/Onboarding2.jpg) · [source](source/01-launch-onboarding/Onboarding2.html) | Onboarding 2 — Health vault | phone | 390×844 | 2 |
| [Onboarding3](screens/01-launch-onboarding/Onboarding3.jpg) · [source](source/01-launch-onboarding/Onboarding3.html) | Onboarding 3 — Ayush AI | phone | 390×844 | 2 |
| [SignIn](screens/01-launch-onboarding/SignIn.jpg) · [source](source/01-launch-onboarding/SignIn.html) | Sign in | phone | 390×844 | 2 |
| [OtpVerify](screens/01-launch-onboarding/OtpVerify.jpg) · [source](source/01-launch-onboarding/OtpVerify.html) | OTP verification | phone | 390×844 | 1 |
| [CreateAccount](screens/01-launch-onboarding/CreateAccount.jpg) · [source](source/01-launch-onboarding/CreateAccount.html) | Create account — step 1 | phone | 390×844 | 3 |
| [CampusVerify](screens/01-launch-onboarding/CampusVerify.jpg) · [source](source/01-launch-onboarding/CampusVerify.html) | Campus verify — step 2 | phone | 390×844 | 1 |
| [ProfileSetup](screens/01-launch-onboarding/ProfileSetup.jpg) · [source](source/01-launch-onboarding/ProfileSetup.html) | Care profile — step 3 | phone | 390×844 | 3 |
| [Permissions](screens/01-launch-onboarding/Permissions.jpg) · [source](source/01-launch-onboarding/Permissions.html) | Permissions — step 4 | phone | 390×844 | 3 |
| [AccountReady](screens/01-launch-onboarding/AccountReady.jpg) · [source](source/01-launch-onboarding/AccountReady.html) | Workspace ready | phone | 390×844 | 3 |
| [SignOut](screens/01-launch-onboarding/SignOut.jpg) · [source](source/01-launch-onboarding/SignOut.html) | Sign out | phone | 390×844 | 3 |
| [AbhaLink](screens/01-launch-onboarding/AbhaLink.jpg) · [source](source/01-launch-onboarding/AbhaLink.html) | Link ABHA | phone | 390×1300 | 3 |
| [OnboardingConsent](screens/01-launch-onboarding/OnboardingConsent.jpg) · [source](source/01-launch-onboarding/OnboardingConsent.html) | Onboarding 4/5 — DPDP consent | phone | 390×1500 | 1 |
| [VerifyIdentity](screens/01-launch-onboarding/VerifyIdentity.jpg) · [source](source/01-launch-onboarding/VerifyIdentity.html) | Verify it’s you — photo, email, college ID, government ID | phone | 390×1060 | 1 |
| [VerifyGate](screens/01-launch-onboarding/VerifyGate.jpg) · [source](source/01-launch-onboarding/VerifyGate.html) | Verification required (shown on any service) | phone | 390×844 | 1 |
| [LoggedOut](screens/01-launch-onboarding/LoggedOut.jpg) · [source](source/01-launch-onboarding/LoggedOut.html) | Logged out (mobile) | phone | 390×1090 | 3 |
| [GuardianConsent](screens/01-launch-onboarding/GuardianConsent.jpg) · [source](source/01-launch-onboarding/GuardianConsent.html) | Under 18 — ask a guardian (student) | phone | 390×1140 | 1 |
| [GuardianApprove](screens/01-launch-onboarding/GuardianApprove.jpg) · [source](source/01-launch-onboarding/GuardianApprove.html) | Guardian’s approval page (SMS link) | phone | 390×1020 | 1 |
| [LostPhone](screens/01-launch-onboarding/LostPhone.jpg) · [source](source/01-launch-onboarding/LostPhone.html) | Lost your phone — from a friend’s phone | phone | 390×1080 | 1 |
| [NewDevice](screens/01-launch-onboarding/NewDevice.jpg) · [source](source/01-launch-onboarding/NewDevice.html) | New phone — move your account | phone | 390×1060 | 1 |

## 2 · Student app (mobile)

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [HomeDiscover](screens/02-student-app-mobile/HomeDiscover.jpg) · [source](source/02-student-app-mobile/HomeDiscover.html) | Home / Discover | phone | 390×844 | 2 |
| [SearchEntry](screens/02-student-app-mobile/SearchEntry.jpg) · [source](source/02-student-app-mobile/SearchEntry.html) | Search entry | phone | 390×844 | 2 |
| [SearchTyping](screens/02-student-app-mobile/SearchTyping.jpg) · [source](source/02-student-app-mobile/SearchTyping.html) | Typing & suggestions | phone | 390×844 | 2 |
| [SearchLoading](screens/02-student-app-mobile/SearchLoading.jpg) · [source](source/02-student-app-mobile/SearchLoading.html) | Searching (skeletons) | phone | 390×844 | 2 |
| [SearchResults](screens/02-student-app-mobile/SearchResults.jpg) · [source](source/02-student-app-mobile/SearchResults.html) | All results — tabbed | phone | 390×844 | 2 |
| [NoResults](screens/02-student-app-mobile/NoResults.jpg) · [source](source/02-student-app-mobile/NoResults.html) | No results | phone | 390×844 | 2 |
| [LabResults](screens/02-student-app-mobile/LabResults.jpg) · [source](source/02-student-app-mobile/LabResults.html) | Lab test results | phone | 390×944 | 1 |
| [DoctorResults](screens/02-student-app-mobile/DoctorResults.jpg) · [source](source/02-student-app-mobile/DoctorResults.html) | Doctor results | phone | 390×944 | 2 |
| [Teleconsult](screens/02-student-app-mobile/Teleconsult.jpg) · [source](source/02-student-app-mobile/Teleconsult.html) | Teleconsult call | phone | 390×844 | 1 |
| [Appointments](screens/02-student-app-mobile/Appointments.jpg) · [source](source/02-student-app-mobile/Appointments.html) | Appointments | phone | 390×944 | 2 |
| [YourCare](screens/02-student-app-mobile/YourCare.jpg) · [source](source/02-student-app-mobile/YourCare.html) | Your Care overview | phone | 390×844 | 2 |
| [Medications](screens/02-student-app-mobile/Medications.jpg) · [source](source/02-student-app-mobile/Medications.html) | Medicines | phone | 390×944 | 3 |
| [PreventiveCare](screens/02-student-app-mobile/PreventiveCare.jpg) · [source](source/02-student-app-mobile/PreventiveCare.html) | Preventive care | phone | 390×944 | 3 |
| [Devices](screens/02-student-app-mobile/Devices.jpg) · [source](source/02-student-app-mobile/Devices.html) | Devices & sensors | phone | 390×900 | 1 |
| [Movement](screens/02-student-app-mobile/Movement.jpg) · [source](source/02-student-app-mobile/Movement.html) | Movement | phone | 390×844 | 3 |
| [RecordsVault](screens/02-student-app-mobile/RecordsVault.jpg) · [source](source/02-student-app-mobile/RecordsVault.html) | Health vault | phone | 390×844 | 3 |
| [AyushChat](screens/02-student-app-mobile/AyushChat.jpg) · [source](source/02-student-app-mobile/AyushChat.html) | Agent Ayush | phone | 390×844 | 3 |
| [Notifications](screens/02-student-app-mobile/Notifications.jpg) · [source](source/02-student-app-mobile/Notifications.html) | Notifications | phone | 390×844 | 3 |
| [EmergencyCard](screens/02-student-app-mobile/EmergencyCard.jpg) · [source](source/02-student-app-mobile/EmergencyCard.html) | Offline emergency card | phone | 390×930 | 1 |
| [CrisisSupport](screens/02-student-app-mobile/CrisisSupport.jpg) · [source](source/02-student-app-mobile/CrisisSupport.html) | Crisis support | phone | 390×844 | 1 |
| [ShopHome](screens/02-student-app-mobile/ShopHome.jpg) · [source](source/02-student-app-mobile/ShopHome.html) | Shop — Home | phone | 390×1114 | 2 |
| [ProductList](screens/02-student-app-mobile/ProductList.jpg) · [source](source/02-student-app-mobile/ProductList.html) | Shop — Product grid | phone | 390×844 | 3 |
| [ProductDetail](screens/02-student-app-mobile/ProductDetail.jpg) · [source](source/02-student-app-mobile/ProductDetail.html) | Shop — Product detail | phone | 390×844 | 3 |
| [LabPackages](screens/02-student-app-mobile/LabPackages.jpg) · [source](source/02-student-app-mobile/LabPackages.html) | Shop — Lab packages | phone | 390×844 | 2 |
| [Cart](screens/02-student-app-mobile/Cart.jpg) · [source](source/02-student-app-mobile/Cart.html) | Shop — Cart | phone | 390×844 | 2 |
| [Checkout](screens/02-student-app-mobile/Checkout.jpg) · [source](source/02-student-app-mobile/Checkout.html) | Checkout — delivery | phone | 390×844 | 2 |
| [Payment](screens/02-student-app-mobile/Payment.jpg) · [source](source/02-student-app-mobile/Payment.html) | Checkout — payment | phone | 390×844 | 2 |
| [OrderSuccess](screens/02-student-app-mobile/OrderSuccess.jpg) · [source](source/02-student-app-mobile/OrderSuccess.html) | Order placed | phone | 390×944 | 2 |
| [OrderTracking](screens/02-student-app-mobile/OrderTracking.jpg) · [source](source/02-student-app-mobile/OrderTracking.html) | Order tracking | phone | 390×844 | 2 |
| [OrderHistory](screens/02-student-app-mobile/OrderHistory.jpg) · [source](source/02-student-app-mobile/OrderHistory.html) | Order history | phone | 390×844 | 2 |
| [PrescriptionUpload](screens/02-student-app-mobile/PrescriptionUpload.jpg) · [source](source/02-student-app-mobile/PrescriptionUpload.html) | Prescription upload | phone | 390×844 | 1 |
| [MoreHub](screens/02-student-app-mobile/MoreHub.jpg) · [source](source/02-student-app-mobile/MoreHub.html) | More / account | phone | 390×844 | 3 |
| [StudentProfile](screens/02-student-app-mobile/StudentProfile.jpg) · [source](source/02-student-app-mobile/StudentProfile.html) | Student profile (flat + glass) | phone | 390×844 | 3 |
| [DigitalId](screens/02-student-app-mobile/DigitalId.jpg) · [source](source/02-student-app-mobile/DigitalId.html) | Digital health ID | phone | 390×844 | 3 |
| [PlanBilling](screens/02-student-app-mobile/PlanBilling.jpg) · [source](source/02-student-app-mobile/PlanBilling.html) | Plan & billing | phone | 390×844 | 3 |
| [ClaimsHub](screens/02-student-app-mobile/ClaimsHub.jpg) · [source](source/02-student-app-mobile/ClaimsHub.html) | Cover & claims | phone | 390×844 | 3 |
| [HelpCentre](screens/02-student-app-mobile/HelpCentre.jpg) · [source](source/02-student-app-mobile/HelpCentre.html) | Help centre | phone | 390×844 | 3 |
| [AccountDetails](screens/02-student-app-mobile/AccountDetails.jpg) · [source](source/02-student-app-mobile/AccountDetails.html) | Account details | phone | 390×1470 | 3 |
| [MyReports](screens/02-student-app-mobile/MyReports.jpg) · [source](source/02-student-app-mobile/MyReports.html) | My lab tests | phone | 390×1020 | 1 |
| [ReportInsights](screens/02-student-app-mobile/ReportInsights.jpg) · [source](source/02-student-app-mobile/ReportInsights.html) | Report insights | phone | 390×1560 | 1 |
| [ConsentInbox](screens/02-student-app-mobile/ConsentInbox.jpg) · [source](source/02-student-app-mobile/ConsentInbox.html) | Consent inbox | phone | 390×1420 | 1 |
| [SosBeacon](screens/02-student-app-mobile/SosBeacon.jpg) · [source](source/02-student-app-mobile/SosBeacon.html) | SOS beacon | phone | 390×1020 | 1 |
| [DataExport](screens/02-student-app-mobile/DataExport.jpg) · [source](source/02-student-app-mobile/DataExport.html) | Download my data | phone | 390×1300 | 3 |
| [IceContacts](screens/02-student-app-mobile/IceContacts.jpg) · [source](source/02-student-app-mobile/IceContacts.html) | Emergency contacts | phone | 390×1420 | 1 |
| [FamilyCircle](screens/02-student-app-mobile/FamilyCircle.jpg) · [source](source/02-student-app-mobile/FamilyCircle.html) | Care Circle | phone | 390×1520 | 3 |
| [RefillRequest](screens/02-student-app-mobile/RefillRequest.jpg) · [source](source/02-student-app-mobile/RefillRequest.html) | Refill request | phone | 390×1380 | 3 |
| [VitalTrends](screens/02-student-app-mobile/VitalTrends.jpg) · [source](source/02-student-app-mobile/VitalTrends.html) | Vital trends | phone | 390×1560 | 1 |
| [HostelVisit](screens/02-student-app-mobile/HostelVisit.jpg) · [source](source/02-student-app-mobile/HostelVisit.html) | Hostel room visit | phone | 390×1000 | 3 |
| [ReturnRequest](screens/02-student-app-mobile/ReturnRequest.jpg) · [source](source/02-student-app-mobile/ReturnRequest.html) | Return or refund | phone | 390×1060 | 3 |
| [PaymentResult](screens/02-student-app-mobile/PaymentResult.jpg) · [source](source/02-student-app-mobile/PaymentResult.html) | Payment result (mobile) | phone | 390×900 | 1 |
| [ResultLabBooked](screens/02-student-app-mobile/ResultLabBooked.jpg) · [source](source/02-student-app-mobile/ResultLabBooked.html) | Result — lab test booked | phone | 390×900 | 1 |
| [ResultCampBooked](screens/02-student-app-mobile/ResultCampBooked.jpg) · [source](source/02-student-app-mobile/ResultCampBooked.html) | Result — camp booked | phone | 390×900 | 1 |
| [ResultRefund](screens/02-student-app-mobile/ResultRefund.jpg) · [source](source/02-student-app-mobile/ResultRefund.html) | Result — return & refund | phone | 390×900 | 1 |
| [MyPass](screens/02-student-app-mobile/MyPass.jpg) · [source](source/02-student-app-mobile/MyPass.html) | My check-in pass (QR + code) | phone | 390×1120 | 1 |
| [CheckinReceipt](screens/02-student-app-mobile/CheckinReceipt.jpg) · [source](source/02-student-app-mobile/CheckinReceipt.html) | Handover receipt (bag photo, how you were checked) | phone | 390×1000 | 3 |
| [LeaveCampus](screens/02-student-app-mobile/LeaveCampus.jpg) · [source](source/02-student-app-mobile/LeaveCampus.html) | Leaving campus — personal account | phone | 390×1260 | 3 |
| [DeleteAccount](screens/02-student-app-mobile/DeleteAccount.jpg) · [source](source/02-student-app-mobile/DeleteAccount.html) | Delete my account (7 days to cancel) | phone | 390×1060 | 1 |
| [NotificationSettings](screens/02-student-app-mobile/NotificationSettings.jpg) · [source](source/02-student-app-mobile/NotificationSettings.html) | Notification settings | phone | 390×1440 | 3 |
| [ConsultSummary](screens/02-student-app-mobile/ConsultSummary.jpg) · [source](source/02-student-app-mobile/ConsultSummary.html) | Visit summary + e-prescription | phone | 390×1200 | 1 |
| [SosDebrief](screens/02-student-app-mobile/SosDebrief.jpg) · [source](source/02-student-app-mobile/SosDebrief.html) | After an SOS | phone | 390×1180 | 1 |
| [MyRequests](screens/02-student-app-mobile/MyRequests.jpg) · [source](source/02-student-app-mobile/MyRequests.html) | My requests | phone | 390×1100 | 3 |
| [Legal](screens/02-student-app-mobile/Legal.jpg) · [source](source/02-student-app-mobile/Legal.html) | Privacy, terms, grievance officer | phone | 390×1500 | 1 |

## 3 · Student web

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [WebSignIn](screens/03-student-web/WebSignIn.jpg) · [source](source/03-student-web/WebSignIn.html) | Web — Sign in | web | 1440×1024 | 2 |
| [WebHome](screens/03-student-web/WebHome.jpg) · [source](source/03-student-web/WebHome.html) | Web — Home | web | 1440×2230 | 2 |
| [WebDashboard](screens/03-student-web/WebDashboard.jpg) · [source](source/03-student-web/WebDashboard.html) | Web — Care dashboard | web | 1440×1100 | 2 |
| [WebShop](screens/03-student-web/WebShop.jpg) · [source](source/03-student-web/WebShop.html) | Web — Shop | web | 1440×1436 | 3 |
| [WebProduct](screens/03-student-web/WebProduct.jpg) · [source](source/03-student-web/WebProduct.html) | Web — Product | web | 1440×1024 | 3 |
| [WebCheckout](screens/03-student-web/WebCheckout.jpg) · [source](source/03-student-web/WebCheckout.html) | Web — Checkout | web | 1440×1024 | 2 |
| [WebOrders](screens/03-student-web/WebOrders.jpg) · [source](source/03-student-web/WebOrders.html) | Web — My orders | web | 1440×1024 | 2 |
| [WebSearchResults](screens/03-student-web/WebSearchResults.jpg) · [source](source/03-student-web/WebSearchResults.html) | Web — Search results | web | 1440×1024 | 2 |
| [WebVault](screens/03-student-web/WebVault.jpg) · [source](source/03-student-web/WebVault.html) | Web — Health vault | web | 1440×1100 | 3 |
| [WebAyush](screens/03-student-web/WebAyush.jpg) · [source](source/03-student-web/WebAyush.html) | Web — Ayush | web | 1440×1024 | 3 |
| [Feedback](screens/03-student-web/Feedback.jpg) · [source](source/03-student-web/Feedback.html) | System — feedback | web | 1440×1024 | 3 |
| [Landing](screens/03-student-web/Landing.jpg) · [source](source/03-student-web/Landing.html) | Landing — Discover (live) | web | 1440×6392 | 3 |
| [LandingCampus](screens/03-student-web/LandingCampus.jpg) · [source](source/03-student-web/LandingCampus.html) | Landing — for campuses | web | 1440×4592 | 3 |
| [LandingClinician](screens/03-student-web/LandingClinician.jpg) · [source](source/03-student-web/LandingClinician.html) | Landing — for clinicians | web | 1440×4752 | 3 |
| [WebLabTests](screens/03-student-web/WebLabTests.jpg) · [source](source/03-student-web/WebLabTests.html) | Web — Lab tests landing | web | 1440×5612 | 2 |
| [WebLabList](screens/03-student-web/WebLabList.jpg) · [source](source/03-student-web/WebLabList.html) | Web — Lab test category | web | 1440×2806 | 2 |
| [WebConsult](screens/03-student-web/WebConsult.jpg) · [source](source/03-student-web/WebConsult.html) | Web — Consult a doctor | web | 1440×5252 | 1 |
| [WebPrograms](screens/03-student-web/WebPrograms.jpg) · [source](source/03-student-web/WebPrograms.html) | Web — Care programmes | web | 1440×4892 | 3 |
| [WebPartnerships](screens/03-student-web/WebPartnerships.jpg) · [source](source/03-student-web/WebPartnerships.html) | Web — Partnerships | web | 1440×4592 | 3 |
| [WebPlans](screens/03-student-web/WebPlans.jpg) · [source](source/03-student-web/WebPlans.html) | Web — Plans | web | 1440×4492 | 3 |
| [WebWellness](screens/03-student-web/WebWellness.jpg) · [source](source/03-student-web/WebWellness.html) | Web — Wellness training | web | 1440×4260 | 3 |
| [WebAccount](screens/03-student-web/WebAccount.jpg) · [source](source/03-student-web/WebAccount.html) | Web — Account | web | 1440×2340 | 3 |
| [WebMyLabTests](screens/03-student-web/WebMyLabTests.jpg) · [source](source/03-student-web/WebMyLabTests.html) | Web — My lab tests | web | 1440×2580 | 2 |
| [WebReportInsights](screens/03-student-web/WebReportInsights.jpg) · [source](source/03-student-web/WebReportInsights.html) | Web — Report insights | web | 1440×2500 | 1 |
| [WebReportAssistant](screens/03-student-web/WebReportAssistant.jpg) · [source](source/03-student-web/WebReportAssistant.html) | Web — Ayush report explainer | web | 1440×1024 | 1 |
| [WebReorder](screens/03-student-web/WebReorder.jpg) · [source](source/03-student-web/WebReorder.html) | Web — Buy again & ratings | web | 1440×2260 | 2 |
| [WebEmergencyCard](screens/03-student-web/WebEmergencyCard.jpg) · [source](source/03-student-web/WebEmergencyCard.html) | Web — emergency card editor | web | 1440×1180 | 1 |
| [WebSecurity](screens/03-student-web/WebSecurity.jpg) · [source](source/03-student-web/WebSecurity.html) | Web — sign-in & security (2FA, sessions) | web | 1440×1240 | 3 |
| [WebLoggedOut](screens/03-student-web/WebLoggedOut.jpg) · [source](source/03-student-web/WebLoggedOut.html) | Web — logged out (confirmation + feedback) | web | 1440×1024 | 3 |
| [WebVerify](screens/03-student-web/WebVerify.jpg) · [source](source/03-student-web/WebVerify.html) | Web — Verify it’s you (photo, email, college ID, government ID) | web | 1440×1024 | 1 |
| [WebVerifyGate](screens/03-student-web/WebVerifyGate.jpg) · [source](source/03-student-web/WebVerifyGate.html) | Web — verification required (shown on any service) | web | 1440×900 | 1 |
| [WebPass](screens/03-student-web/WebPass.jpg) · [source](source/03-student-web/WebPass.html) | Web — my check-in pass | web | 1440×1024 | 3 |
| [WebGuardianConsent](screens/03-student-web/WebGuardianConsent.jpg) · [source](source/03-student-web/WebGuardianConsent.html) | Web — under 18, ask a guardian | web | 1440×1024 | 1 |
| [WebGuardianApprove](screens/03-student-web/WebGuardianApprove.jpg) · [source](source/03-student-web/WebGuardianApprove.html) | Web — guardian’s approval page | web | 1440×900 | 1 |
| [WebLostPhone](screens/03-student-web/WebLostPhone.jpg) · [source](source/03-student-web/WebLostPhone.html) | Web — lost your phone | web | 1440×1024 | 1 |
| [WebLeaveCampus](screens/03-student-web/WebLeaveCampus.jpg) · [source](source/03-student-web/WebLeaveCampus.html) | Web — leaving campus | web | 1440×1100 | 3 |
| [WebDeleteAccount](screens/03-student-web/WebDeleteAccount.jpg) · [source](source/03-student-web/WebDeleteAccount.html) | Web — delete my account | web | 1440×1024 | 1 |
| [WebNotifications](screens/03-student-web/WebNotifications.jpg) · [source](source/03-student-web/WebNotifications.html) | Web — notifications | web | 1440×1180 | 3 |
| [WebConsultSummary](screens/03-student-web/WebConsultSummary.jpg) · [source](source/03-student-web/WebConsultSummary.html) | Web — visit summary | web | 1440×1100 | 1 |
| [WebRequests](screens/03-student-web/WebRequests.jpg) · [source](source/03-student-web/WebRequests.html) | Web — my requests | web | 1440×1024 | 3 |
| [WebLegal](screens/03-student-web/WebLegal.jpg) · [source](source/03-student-web/WebLegal.html) | Web — privacy, terms, grievance | web | 1440×1400 | 1 |

## 4 · Campus / hostel admin

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [CampusAdminConsole](screens/04-campus-hostel-admin/CampusAdminConsole.jpg) · [source](source/04-campus-hostel-admin/CampusAdminConsole.html) | Campus admin console | web | 1440×1024 | 2 |
| [CampusCamps](screens/04-campus-hostel-admin/CampusCamps.jpg) · [source](source/04-campus-hostel-admin/CampusCamps.html) | Campus — health camps | web | 1440×1024 | 3 |
| [CampusApprovals](screens/04-campus-hostel-admin/CampusApprovals.jpg) · [source](source/04-campus-hostel-admin/CampusApprovals.html) | Campus — verification queue | web | 1440×1024 | 3 |
| [CampusOverview](screens/04-campus-hostel-admin/CampusOverview.jpg) · [source](source/04-campus-hostel-admin/CampusOverview.html) | Campus — overview | web | 1440×1024 | 2 |
| [CampusRoster](screens/04-campus-hostel-admin/CampusRoster.jpg) · [source](source/04-campus-hostel-admin/CampusRoster.html) | Campus — students & CSV import | web | 1440×1024 | 3 |
| [CampusInsights](screens/04-campus-hostel-admin/CampusInsights.jpg) · [source](source/04-campus-hostel-admin/CampusInsights.html) | Campus — health insights | web | 1440×1024 | 3 |
| [CampusAccessRequests](screens/04-campus-hostel-admin/CampusAccessRequests.jpg) · [source](source/04-campus-hostel-admin/CampusAccessRequests.html) | Campus — access requests | web | 1440×1024 | 3 |
| [CampusBreakGlass](screens/04-campus-hostel-admin/CampusBreakGlass.jpg) · [source](source/04-campus-hostel-admin/CampusBreakGlass.html) | Campus — emergency access (break-glass) | web | 1440×1024 | 1 |
| [CampusIncidents](screens/04-campus-hostel-admin/CampusIncidents.jpg) · [source](source/04-campus-hostel-admin/CampusIncidents.html) | Campus — incident desk | web | 1440×1024 | 3 |
| [CampusCounsellor](screens/04-campus-hostel-admin/CampusCounsellor.jpg) · [source](source/04-campus-hostel-admin/CampusCounsellor.html) | Campus — counsellor queue | web | 1440×1024 | 3 |
| [CampusAdminTeam](screens/04-campus-hostel-admin/CampusAdminTeam.jpg) · [source](source/04-campus-hostel-admin/CampusAdminTeam.html) | Campus — admin team & roles | web | 1440×1024 | 3 |
| [CampusIsolation](screens/04-campus-hostel-admin/CampusIsolation.jpg) · [source](source/04-campus-hostel-admin/CampusIsolation.html) | Campus — isolation | web | 1440×1024 | 3 |
| [CampusOutbreak](screens/04-campus-hostel-admin/CampusOutbreak.jpg) · [source](source/04-campus-hostel-admin/CampusOutbreak.html) | Campus — outbreak radar | web | 1440×1024 | 3 |
| [CampusWater](screens/04-campus-hostel-admin/CampusWater.jpg) · [source](source/04-campus-hostel-admin/CampusWater.html) | Campus — water radar | web | 1440×1024 | 3 |
| [CampusSanitary](screens/04-campus-hostel-admin/CampusSanitary.jpg) · [source](source/04-campus-hostel-admin/CampusSanitary.html) | Campus — sanitary audit | web | 1440×1024 | 3 |
| [CampusMess](screens/04-campus-hostel-admin/CampusMess.jpg) · [source](source/04-campus-hostel-admin/CampusMess.html) | Campus — mess & diet | web | 1440×1024 | 3 |
| [CampusAmbulance](screens/04-campus-hostel-admin/CampusAmbulance.jpg) · [source](source/04-campus-hostel-admin/CampusAmbulance.html) | Campus — ambulance dispatch | web | 1440×1024 | 3 |
| [CampusSla](screens/04-campus-hostel-admin/CampusSla.jpg) · [source](source/04-campus-hostel-admin/CampusSla.html) | Campus — SLA escalation | web | 1440×1024 | 3 |
| [CampusBlocks](screens/04-campus-hostel-admin/CampusBlocks.jpg) · [source](source/04-campus-hostel-admin/CampusBlocks.html) | Campus — hostel blocks | web | 1440×1024 | 3 |
| [CampusDischarge](screens/04-campus-hostel-admin/CampusDischarge.jpg) · [source](source/04-campus-hostel-admin/CampusDischarge.html) | Campus — discharge certificates | web | 1440×1024 | 3 |
| [CampusWellness](screens/04-campus-hostel-admin/CampusWellness.jpg) · [source](source/04-campus-hostel-admin/CampusWellness.html) | Campus — wellness workshops | web | 1440×1024 | 3 |
| [CampusSettings](screens/04-campus-hostel-admin/CampusSettings.jpg) · [source](source/04-campus-hostel-admin/CampusSettings.html) | Campus — settings & requirements | web | 1440×1024 | 3 |
| [CampusCertificates](screens/04-campus-hostel-admin/CampusCertificates.jpg) · [source](source/04-campus-hostel-admin/CampusCertificates.html) | Campus — certificate inbox | web | 1440×1024 | 3 |
| [CampusAnnouncements](screens/04-campus-hostel-admin/CampusAnnouncements.jpg) · [source](source/04-campus-hostel-admin/CampusAnnouncements.html) | Campus — announcements | web | 1440×1024 | 3 |
| [CampusReports](screens/04-campus-hostel-admin/CampusReports.jpg) · [source](source/04-campus-hostel-admin/CampusReports.html) | Campus — reports export | web | 1440×1024 | 1 |
| [CampusApply](screens/04-campus-hostel-admin/CampusApply.jpg) · [source](source/04-campus-hostel-admin/CampusApply.html) | Campus onboarding | web | 1440×1100 | 3 |

## 5 · Doctor

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [ClinicianConsole](screens/05-doctor/ClinicianConsole.jpg) · [source](source/05-doctor/ClinicianConsole.html) | Clinician console | web | 1440×1024 | 2 |
| [ClinicalReview](screens/05-doctor/ClinicalReview.jpg) · [source](source/05-doctor/ClinicalReview.html) | Clinician — critical results | web | 1440×1024 | 3 |
| [EncounterNote](screens/05-doctor/EncounterNote.jpg) · [source](source/05-doctor/EncounterNote.html) | Clinician — encounter note | web | 1440×1024 | 3 |
| [Prescribe](screens/05-doctor/Prescribe.jpg) · [source](source/05-doctor/Prescribe.html) | Clinician — prescribe | web | 1440×1024 | 1 |
| [ReportReviews](screens/05-doctor/ReportReviews.jpg) · [source](source/05-doctor/ReportReviews.html) | Clinician — report reviews | web | 1440×1024 | 1 |
| [ClinicianSchedule](screens/05-doctor/ClinicianSchedule.jpg) · [source](source/05-doctor/ClinicianSchedule.html) | Clinician — schedule | web | 1440×1024 | 3 |
| [ClinicianPatients](screens/05-doctor/ClinicianPatients.jpg) · [source](source/05-doctor/ClinicianPatients.html) | Clinician — my patients | web | 1440×1024 | 3 |
| [ClinicianEarnings](screens/05-doctor/ClinicianEarnings.jpg) · [source](source/05-doctor/ClinicianEarnings.html) | Clinician — earnings | web | 1440×1024 | 3 |
| [ClinicianLabOrder](screens/05-doctor/ClinicianLabOrder.jpg) · [source](source/05-doctor/ClinicianLabOrder.html) | Clinician — lab orders | web | 1440×1024 | 2 |
| [ClinicianReferral](screens/05-doctor/ClinicianReferral.jpg) · [source](source/05-doctor/ClinicianReferral.html) | Clinician — referrals | web | 1440×1024 | 3 |
| [ClinicianRenewals](screens/05-doctor/ClinicianRenewals.jpg) · [source](source/05-doctor/ClinicianRenewals.html) | Clinician — renewals | web | 1440×1024 | 3 |
| [ClinicianChronic](screens/05-doctor/ClinicianChronic.jpg) · [source](source/05-doctor/ClinicianChronic.html) | Clinician — chronic care | web | 1440×1024 | 3 |
| [ClinicianAyush](screens/05-doctor/ClinicianAyush.jpg) · [source](source/05-doctor/ClinicianAyush.html) | Clinician — AYUSH | web | 1440×1024 | 3 |
| [ClinicianAi](screens/05-doctor/ClinicianAi.jpg) · [source](source/05-doctor/ClinicianAi.html) | Clinician — decision support | web | 1440×1024 | 3 |
| [ClinicianToday](screens/05-doctor/ClinicianToday.jpg) · [source](source/05-doctor/ClinicianToday.html) | Clinician — today | web | 1440×1024 | 2 |
| [ClinicianInbox](screens/05-doctor/ClinicianInbox.jpg) · [source](source/05-doctor/ClinicianInbox.html) | Clinician — unified inbox | web | 1440×1024 | 3 |
| [ClinicianConsultRoom](screens/05-doctor/ClinicianConsultRoom.jpg) · [source](source/05-doctor/ClinicianConsultRoom.html) | Clinician — consult room | web | 1440×1024 | 3 |
| [WebClinicianApply](screens/05-doctor/WebClinicianApply.jpg) · [source](source/05-doctor/WebClinicianApply.html) | Doctor application — web | web | 1440×1100 | 3 |
| [ClinicianApply](screens/05-doctor/ClinicianApply.jpg) · [source](source/05-doctor/ClinicianApply.html) | Doctor application — phone | phone | 390×1060 | 3 |

## 6 · Partner — pharmacy, lab, clinic

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [CampDay](screens/06-partner-pharmacy-lab-clinic/CampDay.jpg) · [source](source/06-partner-pharmacy-lab-clinic/CampDay.html) | Camp day | phone | 390×844 | 3 |
| [LabQueue](screens/06-partner-pharmacy-lab-clinic/LabQueue.jpg) · [source](source/06-partner-pharmacy-lab-clinic/LabQueue.html) | Lab — sample queue | web | 1440×1024 | 2 |
| [DispenseRegister](screens/06-partner-pharmacy-lab-clinic/DispenseRegister.jpg) · [source](source/06-partner-pharmacy-lab-clinic/DispenseRegister.html) | Pharmacy — dispensing register | web | 1440×1024 | 3 |
| [VendorConsole](screens/06-partner-pharmacy-lab-clinic/VendorConsole.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorConsole.html) | Vendor console | web | 1440×1024 | 2 |
| [VendorSettlement](screens/06-partner-pharmacy-lab-clinic/VendorSettlement.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorSettlement.html) | Vendor — earnings & settlement | web | 1440×1024 | 3 |
| [VendorOrders](screens/06-partner-pharmacy-lab-clinic/VendorOrders.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorOrders.html) | Partner — orders | web | 1440×1024 | 2 |
| [VendorCatalogue](screens/06-partner-pharmacy-lab-clinic/VendorCatalogue.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorCatalogue.html) | Partner — catalogue & stock | web | 1440×1024 | 3 |
| [LabCollection](screens/06-partner-pharmacy-lab-clinic/LabCollection.jpg) · [source](source/06-partner-pharmacy-lab-clinic/LabCollection.html) | Lab — run sheet | web | 1440×1024 | 3 |
| [LabColdChain](screens/06-partner-pharmacy-lab-clinic/LabColdChain.jpg) · [source](source/06-partner-pharmacy-lab-clinic/LabColdChain.html) | Lab — cold chain | web | 1440×1024 | 3 |
| [LabReporting](screens/06-partner-pharmacy-lab-clinic/LabReporting.jpg) · [source](source/06-partner-pharmacy-lab-clinic/LabReporting.html) | Lab — release results | web | 1440×1024 | 1 |
| [VendorReturns](screens/06-partner-pharmacy-lab-clinic/VendorReturns.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorReturns.html) | Partner — returns | web | 1440×1024 | 3 |
| [VendorHandover](screens/06-partner-pharmacy-lab-clinic/VendorHandover.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorHandover.html) | Partner — OTP handover | web | 1440×1024 | 1 |
| [VendorSubstitution](screens/06-partner-pharmacy-lab-clinic/VendorSubstitution.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorSubstitution.html) | Partner — substitutions | web | 1440×1024 | 3 |
| [VendorReorder](screens/06-partner-pharmacy-lab-clinic/VendorReorder.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorReorder.html) | Partner — reorder rules | web | 1440×1024 | 2 |
| [VendorCampIntake](screens/06-partner-pharmacy-lab-clinic/VendorCampIntake.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorCampIntake.html) | Partner — camp intake | web | 1440×1024 | 3 |
| [VendorHome](screens/06-partner-pharmacy-lab-clinic/VendorHome.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorHome.html) | Partner — home by provider type | web | 1440×1024 | 2 |
| [VendorRxReview](screens/06-partner-pharmacy-lab-clinic/VendorRxReview.jpg) · [source](source/06-partner-pharmacy-lab-clinic/VendorRxReview.html) | Partner — pharmacist Rx review | web | 1440×1024 | 1 |
| [ScanVerify](screens/06-partner-pharmacy-lab-clinic/ScanVerify.jpg) · [source](source/06-partner-pharmacy-lab-clinic/ScanVerify.html) | Staff app — verify student (scan, photo match) | phone | 390×1000 | 1 |
| [WebScanVerify](screens/06-partner-pharmacy-lab-clinic/WebScanVerify.jpg) · [source](source/06-partner-pharmacy-lab-clinic/WebScanVerify.html) | Counter / reception — verify student | web | 1440×1024 | 1 |
| [StaffHandover](screens/06-partner-pharmacy-lab-clinic/StaffHandover.jpg) · [source](source/06-partner-pharmacy-lab-clinic/StaffHandover.html) | Staff app — hand over (bag photo) | phone | 390×960 | 1 |
| [StaffCollect](screens/06-partner-pharmacy-lab-clinic/StaffCollect.jpg) · [source](source/06-partner-pharmacy-lab-clinic/StaffCollect.html) | Staff app — collect sample (tube scan) | phone | 390×960 | 1 |
| [StaffCampFast](screens/06-partner-pharmacy-lab-clinic/StaffCampFast.jpg) · [source](source/06-partner-pharmacy-lab-clinic/StaffCampFast.html) | Staff app — camp fast mode | phone | 390×960 | 3 |
| [PartnerApply](screens/06-partner-pharmacy-lab-clinic/PartnerApply.jpg) · [source](source/06-partner-pharmacy-lab-clinic/PartnerApply.html) | Partner application — phone | phone | 390×1060 | 3 |
| [WebPartnerApply](screens/06-partner-pharmacy-lab-clinic/WebPartnerApply.jpg) · [source](source/06-partner-pharmacy-lab-clinic/WebPartnerApply.html) | Partner application — web | web | 1440×1024 | 3 |
| [PartnerStaff](screens/06-partner-pharmacy-lab-clinic/PartnerStaff.jpg) · [source](source/06-partner-pharmacy-lab-clinic/PartnerStaff.html) | Partner — staff & roles | web | 1440×1024 | 3 |

## 7 · Super admin

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [SuperAdminConsole](screens/07-super-admin/SuperAdminConsole.jpg) · [source](source/07-super-admin/SuperAdminConsole.html) | Super admin console | web | 1440×1024 | 2 |
| [AdminAccounts](screens/07-super-admin/AdminAccounts.jpg) · [source](source/07-super-admin/AdminAccounts.html) | Super admin — accounts & roles | web | 1440×1024 | 3 |
| [AuditExplorer](screens/07-super-admin/AuditExplorer.jpg) · [source](source/07-super-admin/AuditExplorer.html) | Super admin — audit explorer | web | 1440×1024 | 3 |
| [AiGovernance](screens/07-super-admin/AiGovernance.jpg) · [source](source/07-super-admin/AiGovernance.html) | Super admin — AI governance | web | 1440×1024 | 3 |
| [CatalogOps](screens/07-super-admin/CatalogOps.jpg) · [source](source/07-super-admin/CatalogOps.html) | Super admin — catalogue ops | web | 1440×1024 | 3 |
| [Integrations](screens/07-super-admin/Integrations.jpg) · [source](source/07-super-admin/Integrations.html) | Super admin — integrations & index | web | 1440×1024 | 3 |
| [DpdpQueue](screens/07-super-admin/DpdpQueue.jpg) · [source](source/07-super-admin/DpdpQueue.html) | Super admin — erasure requests | web | 1440×1024 | 2 |
| [ClaimsAdjudication](screens/07-super-admin/ClaimsAdjudication.jpg) · [source](source/07-super-admin/ClaimsAdjudication.html) | Claims adjudication (M22–M25) | web | 1440×1024 | 3 |
| [AdminVerification](screens/07-super-admin/AdminVerification.jpg) · [source](source/07-super-admin/AdminVerification.html) | Super admin — clinician verification | web | 1440×1024 | 3 |
| [AdminPartners](screens/07-super-admin/AdminPartners.jpg) · [source](source/07-super-admin/AdminPartners.html) | Super admin — partner applications | web | 1440×1024 | 3 |
| [AdminOps](screens/07-super-admin/AdminOps.jpg) · [source](source/07-super-admin/AdminOps.html) | Super admin — operations & SOS | web | 1440×1024 | 3 |
| [AdminSurveillance](screens/07-super-admin/AdminSurveillance.jpg) · [source](source/07-super-admin/AdminSurveillance.html) | Super admin — surveillance map | web | 1440×1024 | 3 |
| [AdminTenants](screens/07-super-admin/AdminTenants.jpg) · [source](source/07-super-admin/AdminTenants.html) | Super admin — organisations | web | 1440×1024 | 3 |
| [AdminRuleL](screens/07-super-admin/AdminRuleL.jpg) · [source](source/07-super-admin/AdminRuleL.html) | Super admin — Rule L firewall | web | 1440×1024 | 3 |
| [AdminConsentPolicy](screens/07-super-admin/AdminConsentPolicy.jpg) · [source](source/07-super-admin/AdminConsentPolicy.html) | Super admin — consent policy | web | 1440×1024 | 1 |
| [AdminHandover](screens/07-super-admin/AdminHandover.jpg) · [source](source/07-super-admin/AdminHandover.html) | Super admin — casualty handover | web | 1440×1024 | 1 |
| [AdminSentinel](screens/07-super-admin/AdminSentinel.jpg) · [source](source/07-super-admin/AdminSentinel.html) | Super admin — code sentinel | web | 1440×1024 | 3 |
| [AdminTokens](screens/07-super-admin/AdminTokens.jpg) · [source](source/07-super-admin/AdminTokens.html) | Super admin — token sync | web | 1440×1024 | 3 |
| [AdminBreakGlassLog](screens/07-super-admin/AdminBreakGlassLog.jpg) · [source](source/07-super-admin/AdminBreakGlassLog.html) | Super admin — break-glass log | web | 1440×1024 | 1 |
| [AdminPlansPricing](screens/07-super-admin/AdminPlansPricing.jpg) · [source](source/07-super-admin/AdminPlansPricing.html) | Super admin — plans & pricing | web | 1440×1024 | 3 |
| [AdminFlags](screens/07-super-admin/AdminFlags.jpg) · [source](source/07-super-admin/AdminFlags.html) | Super admin — feature flags per campus | web | 1440×1024 | 3 |
| [AdminTemplates](screens/07-super-admin/AdminTemplates.jpg) · [source](source/07-super-admin/AdminTemplates.html) | Super admin — WhatsApp & message templates | web | 1440×1024 | 3 |
| [AdminBilling](screens/07-super-admin/AdminBilling.jpg) · [source](source/07-super-admin/AdminBilling.html) | Super admin — billing ledger | web | 1440×1024 | 3 |
| [AdminKnowledge](screens/07-super-admin/AdminKnowledge.jpg) · [source](source/07-super-admin/AdminKnowledge.html) | Super admin — Ayush knowledge base | web | 1440×1024 | 3 |
| [AdminIntake](screens/07-super-admin/AdminIntake.jpg) · [source](source/07-super-admin/AdminIntake.html) | Super admin — intake & OCR queue | web | 1440×1024 | 3 |
| [AdminCheckins](screens/07-super-admin/AdminCheckins.jpg) · [source](source/07-super-admin/AdminCheckins.html) | Super admin — check-in audit | web | 1440×1024 | 3 |
| [AdminCase](screens/07-super-admin/AdminCase.jpg) · [source](source/07-super-admin/AdminCase.html) | Super admin — case detail (“This wasn’t me”) | web | 1440×1024 | 3 |
| [AdminPriceFix](screens/07-super-admin/AdminPriceFix.jpg) · [source](source/07-super-admin/AdminPriceFix.html) | Fix the Premium price (SK-006) | web | 1440×1024 | 1 |
| [AdminApiKeys](screens/07-super-admin/AdminApiKeys.jpg) · [source](source/07-super-admin/AdminApiKeys.html) | API access & keys (SK-005) | web | 1440×1024 | 3 |
| [AdminSignIn](screens/07-super-admin/AdminSignIn.jpg) · [source](source/07-super-admin/AdminSignIn.html) | Staff & admin sign-in (SK-004) | web | 1440×900 | 2 |

## 8 · Design system & flow map

| Screen | What it is | Platform | Size | Tier |
|---|---|---|---|---|
| [FlowMap](screens/08-design-system-flow-map/FlowMap.jpg) · [source](source/08-design-system-flow-map/FlowMap.html) | Flow map — whole application | web | 2820×3490 | 3 |
| [Sheets](screens/08-design-system-flow-map/Sheets.jpg) · [source](source/08-design-system-flow-map/Sheets.html) | System — bottom sheets | web | 1440×1560 | 3 |
| [NavSheets](screens/08-design-system-flow-map/NavSheets.jpg) · [source](source/08-design-system-flow-map/NavSheets.html) | System — navigation & sheets | web | 1440×1024 | 3 |
| [StateScreens](screens/08-design-system-flow-map/StateScreens.jpg) · [source](source/08-design-system-flow-map/StateScreens.html) | System — full-screen states | web | 1440×1024 | 3 |
| [AyushWidget](screens/08-design-system-flow-map/AyushWidget.jpg) · [source](source/08-design-system-flow-map/AyushWidget.html) | Ayush — chat widget (web, shared) | phone | 420×680 | 3 |
| [AyushSheet](screens/08-design-system-flow-map/AyushSheet.jpg) · [source](source/08-design-system-flow-map/AyushSheet.html) | Ayush — phone bottom sheet (Discover, Your Care) | phone | 390×844 | 3 |
| [MotionSystem](screens/08-design-system-flow-map/MotionSystem.jpg) · [source](source/08-design-system-flow-map/MotionSystem.html) | Motion & interaction system | web | 1440×2300 | 3 |
| [IconSystem](screens/08-design-system-flow-map/IconSystem.jpg) · [source](source/08-design-system-flow-map/IconSystem.html) | Design system — icons (3D + flat, animated) | web | 1440×1500 | 3 |
| [IllustrationLibrary](screens/08-design-system-flow-map/IllustrationLibrary.jpg) · [source](source/08-design-system-flow-map/IllustrationLibrary.html) | Design system — illustration library | web | 1440×2280 | 3 |
| [StatusMoments](screens/08-design-system-flow-map/StatusMoments.jpg) · [source](source/08-design-system-flow-map/StatusMoments.html) | Design system — result moments (success, failure, pending) | web | 1440×1000 | 3 |
| [ConfirmDialogs](screens/08-design-system-flow-map/ConfirmDialogs.jpg) · [source](source/08-design-system-flow-map/ConfirmDialogs.html) | Design system — confirm dialogs (log out, cancel, revoke) | web | 1440×900 | 3 |
| [NotificationTemplates](screens/08-design-system-flow-map/NotificationTemplates.jpg) · [source](source/08-design-system-flow-map/NotificationTemplates.html) | Notification templates (copy + rules) | web | 1440×1100 | 3 |
