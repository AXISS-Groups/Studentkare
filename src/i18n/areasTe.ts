// keep-sorted start
import { accountContactsTe } from './areas/accountContacts';
import { adminBoardTe } from './areas/adminBoard';
import { adminGovTe } from './areas/adminGov';
import { adminTe } from './areas/admin';
import { assistTe } from './areas/assist';
import { authChannelsTe } from './areas/authChannels';
import { authPasscodeTe } from './areas/authPasscode';
import { campusBoardsTe } from './areas/campusBoards';
import { campusConsoleTe } from './areas/campusConsole';
import { campusSafetyTe } from './areas/campusSafety';
import { campusTe } from './areas/campus';
import { careDirectoryTe } from './areas/careDirectory';
import { careTe } from './areas/care';
import { clinicianTe } from './areas/clinician';
import { clinicianWorkTe } from './areas/clinicianWork';
import { consoleTe } from './areas/console';
import { deviceTe } from './areas/device';
import { identityTe } from './areas/identity';
import { labbookTe } from './areas/labbook';
import { landingTe } from './areas/landing';
import { launchTe } from './areas/launch';
import { m2remindersTe } from './areas/m2reminders';
import { m2valuesTe } from './areas/m2values';
import { memberTe } from './areas/member';
import { mobile2HealthTe } from './areas/mobile2health';
import { mobile2OrdersTe } from './areas/mobile2Orders';
import { mobile2Te } from './areas/mobile2';
import { mobile2WebTe } from './areas/mobile2Web';
import { onboardTe } from './areas/onboard';
import { partnerConsoleTe } from './areas/partnerConsole';
import { partnerTe } from './areas/partner';
import { partnerWorkTe } from './areas/partnerWork';
import { payTe } from './areas/pay';
import { phoneboardsTe } from './areas/phoneboards';
import { phonestoreTe } from './areas/phonestore';
import { rewardsTe } from './areas/rewards';
import { safetyTe } from './areas/safety';
import { shopwebTe } from './areas/shopweb';
import { stepsTe } from './areas/steps';
import { studentInvitesTe } from './areas/studentInvites';
import { studentPasswordTe } from './areas/studentPassword';
import { studentshellTe } from './areas/studentshell';
import { studentwebT1Te } from './areas/studentwebT1';
import { studentwebTe } from './areas/studentweb';
import { teamAccountsTe } from './areas/teamAccounts';
import { wellnessTe } from './areas/wellness';
// keep-sorted end

/**
 * Every Telugu area catalogue, one import and one spread per area, sorted. A new area
 * is one line in each list. No key may be defined in two areas (or in ./te.ts as well):
 * src/i18n/__tests__/catalogKeys.test.ts checks it, so the spread order never matters.
 * This file is merged with git's union driver (.gitattributes): keep it a pure list.
 */
export const areasTe = {
  // keep-sorted start
  ...accountContactsTe,
  ...adminBoardTe,
  ...adminGovTe,
  ...adminTe,
  ...assistTe,
  ...authChannelsTe,
  ...authPasscodeTe,
  ...campusBoardsTe,
  ...campusConsoleTe,
  ...campusSafetyTe,
  ...campusTe,
  ...careDirectoryTe,
  ...careTe,
  ...clinicianTe,
  ...clinicianWorkTe,
  ...consoleTe,
  ...deviceTe,
  ...identityTe,
  ...labbookTe,
  ...landingTe,
  ...launchTe,
  ...m2remindersTe,
  ...m2valuesTe,
  ...memberTe,
  ...mobile2HealthTe,
  ...mobile2OrdersTe,
  ...mobile2Te,
  ...mobile2WebTe,
  ...onboardTe,
  ...partnerConsoleTe,
  ...partnerTe,
  ...partnerWorkTe,
  ...payTe,
  ...phoneboardsTe,
  ...phonestoreTe,
  ...rewardsTe,
  ...safetyTe,
  ...shopwebTe,
  ...stepsTe,
  ...studentInvitesTe,
  ...studentPasswordTe,
  ...studentshellTe,
  ...studentwebT1Te,
  ...studentwebTe,
  ...teamAccountsTe,
  ...wellnessTe,
  // keep-sorted end
};
