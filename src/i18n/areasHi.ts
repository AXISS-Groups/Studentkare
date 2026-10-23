// keep-sorted start
import { accountContactsHi } from './areas/accountContacts';
import { adminBoardHi } from './areas/adminBoard';
import { adminGovHi } from './areas/adminGov';
import { adminHi } from './areas/admin';
import { assistHi } from './areas/assist';
import { authChannelsHi } from './areas/authChannels';
import { authPasscodeHi } from './areas/authPasscode';
import { autopilotHi } from './areas/autopilot';
import { campsHi } from './areas/camps';
import { campusBoardsHi } from './areas/campusBoards';
import { campusConsoleHi } from './areas/campusConsole';
import { campusHi } from './areas/campus';
import { campusSafetyHi } from './areas/campusSafety';
import { careDirectoryHi } from './areas/careDirectory';
import { careHi } from './areas/care';
import { clinicianHi } from './areas/clinician';
import { clinicianWorkHi } from './areas/clinicianWork';
import { consoleHi } from './areas/console';
import { deviceHi } from './areas/device';
import { identityHi } from './areas/identity';
import { labbookHi } from './areas/labbook';
import { landingHi } from './areas/landing';
import { launchHi } from './areas/launch';
import { m2remindersHi } from './areas/m2reminders';
import { m2valuesHi } from './areas/m2values';
import { medicineInfoHi } from './areas/medicineInfo';
import { memberHi } from './areas/member';
import { mobile2HealthHi } from './areas/mobile2health';
import { mobile2Hi } from './areas/mobile2';
import { mobile2OrdersHi } from './areas/mobile2Orders';
import { mobile2WebHi } from './areas/mobile2Web';
import { newsroomContentHi } from './areas/newsroomContent';
import { newsroomHi } from './areas/newsroom';
import { onboardHi } from './areas/onboard';
import { partnerConsoleHi } from './areas/partnerConsole';
import { partnerHi } from './areas/partner';
import { partnerWorkHi } from './areas/partnerWork';
import { payHi } from './areas/pay';
import { phoneboardsHi } from './areas/phoneboards';
import { phonestoreHi } from './areas/phonestore';
import { privacyHi } from './areas/privacy';
import { pushHi } from './areas/push';
import { refillsHi } from './areas/refills';
import { rewardsHi } from './areas/rewards';
import { safetyHi } from './areas/safety';
import { shopwebHi } from './areas/shopweb';
import { stepsHi } from './areas/steps';
import { studentInvitesHi } from './areas/studentInvites';
import { studentPasswordHi } from './areas/studentPassword';
import { studentshellHi } from './areas/studentshell';
import { studentwebHi } from './areas/studentweb';
import { studentwebT1Hi } from './areas/studentwebT1';
import { teamAccountsHi } from './areas/teamAccounts';
import { wellnessHi } from './areas/wellness';
// keep-sorted end

/**
 * Every Hindi area catalogue, one import and one spread per area, sorted. A new area
 * is one line in each list. No key may be defined in two areas (or in ./hi.ts as well):
 * src/i18n/__tests__/catalogKeys.test.ts checks it, so the spread order never matters.
 * This file is merged with git's union driver (.gitattributes): keep it a pure list.
 */
export const areasHi = {
  // keep-sorted start
  ...accountContactsHi,
  ...adminBoardHi,
  ...adminGovHi,
  ...adminHi,
  ...assistHi,
  ...authChannelsHi,
  ...authPasscodeHi,
  ...autopilotHi,
  ...campsHi,
  ...campusBoardsHi,
  ...campusConsoleHi,
  ...campusHi,
  ...campusSafetyHi,
  ...careDirectoryHi,
  ...careHi,
  ...clinicianHi,
  ...clinicianWorkHi,
  ...consoleHi,
  ...deviceHi,
  ...identityHi,
  ...labbookHi,
  ...landingHi,
  ...launchHi,
  ...m2remindersHi,
  ...m2valuesHi,
  ...medicineInfoHi,
  ...memberHi,
  ...mobile2HealthHi,
  ...mobile2Hi,
  ...mobile2OrdersHi,
  ...mobile2WebHi,
  ...newsroomContentHi,
  ...newsroomHi,
  ...onboardHi,
  ...partnerConsoleHi,
  ...partnerHi,
  ...partnerWorkHi,
  ...payHi,
  ...phoneboardsHi,
  ...phonestoreHi,
  ...privacyHi,
  ...pushHi,
  ...refillsHi,
  ...rewardsHi,
  ...safetyHi,
  ...shopwebHi,
  ...stepsHi,
  ...studentInvitesHi,
  ...studentPasswordHi,
  ...studentshellHi,
  ...studentwebHi,
  ...studentwebT1Hi,
  ...teamAccountsHi,
  ...wellnessHi,
  // keep-sorted end
};
