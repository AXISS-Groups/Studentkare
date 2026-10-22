// keep-sorted start
import { accountContactsEn } from './areas/accountContacts';
import { adminBoardEn } from './areas/adminBoard';
import { adminEn } from './areas/admin';
import { adminGovEn } from './areas/adminGov';
import { assistEn } from './areas/assist';
import { authChannelsEn } from './areas/authChannels';
import { authPasscodeEn } from './areas/authPasscode';
import { campusBoardsEn } from './areas/campusBoards';
import { campusConsoleEn } from './areas/campusConsole';
import { campusEn } from './areas/campus';
import { campusSafetyEn } from './areas/campusSafety';
import { careDirectoryEn } from './areas/careDirectory';
import { careEn } from './areas/care';
import { clinicianEn } from './areas/clinician';
import { clinicianWorkEn } from './areas/clinicianWork';
import { consoleEn } from './areas/console';
import { deviceEn } from './areas/device';
import { identityEn } from './areas/identity';
import { labbookEn } from './areas/labbook';
import { landingEn } from './areas/landing';
import { launchEn } from './areas/launch';
import { m2remindersEn } from './areas/m2reminders';
import { m2valuesEn } from './areas/m2values';
import { memberEn } from './areas/member';
import { mobile2En } from './areas/mobile2';
import { mobile2HealthEn } from './areas/mobile2health';
import { mobile2OrdersEn } from './areas/mobile2Orders';
import { mobile2WebEn } from './areas/mobile2Web';
import { onboardEn } from './areas/onboard';
import { partnerConsoleEn } from './areas/partnerConsole';
import { partnerEn } from './areas/partner';
import { partnerWorkEn } from './areas/partnerWork';
import { payEn } from './areas/pay';
import { phoneboardsEn } from './areas/phoneboards';
import { phonestoreEn } from './areas/phonestore';
import { rewardsEn } from './areas/rewards';
import { safetyEn } from './areas/safety';
import { shopwebEn } from './areas/shopweb';
import { stepsEn } from './areas/steps';
import { studentInvitesEn } from './areas/studentInvites';
import { studentPasswordEn } from './areas/studentPassword';
import { studentshellEn } from './areas/studentshell';
import { studentwebEn } from './areas/studentweb';
import { studentwebT1En } from './areas/studentwebT1';
import { teamAccountsEn } from './areas/teamAccounts';
import { wellnessEn } from './areas/wellness';
// keep-sorted end

/**
 * Every English area catalogue, one import and one spread per area, sorted. A new area
 * is one line in each list. No key may be defined in two areas (or in ./en.ts as well):
 * src/i18n/__tests__/catalogKeys.test.ts checks it, so the spread order never matters.
 * This file is merged with git's union driver (.gitattributes): keep it a pure list.
 */
export const areasEn = {
  // keep-sorted start
  ...accountContactsEn,
  ...adminBoardEn,
  ...adminEn,
  ...adminGovEn,
  ...assistEn,
  ...authChannelsEn,
  ...authPasscodeEn,
  ...campusBoardsEn,
  ...campusConsoleEn,
  ...campusEn,
  ...campusSafetyEn,
  ...careDirectoryEn,
  ...careEn,
  ...clinicianEn,
  ...clinicianWorkEn,
  ...consoleEn,
  ...deviceEn,
  ...identityEn,
  ...labbookEn,
  ...landingEn,
  ...launchEn,
  ...m2remindersEn,
  ...m2valuesEn,
  ...memberEn,
  ...mobile2En,
  ...mobile2HealthEn,
  ...mobile2OrdersEn,
  ...mobile2WebEn,
  ...onboardEn,
  ...partnerConsoleEn,
  ...partnerEn,
  ...partnerWorkEn,
  ...payEn,
  ...phoneboardsEn,
  ...phonestoreEn,
  ...rewardsEn,
  ...safetyEn,
  ...shopwebEn,
  ...stepsEn,
  ...studentInvitesEn,
  ...studentPasswordEn,
  ...studentshellEn,
  ...studentwebEn,
  ...studentwebT1En,
  ...teamAccountsEn,
  ...wellnessEn,
  // keep-sorted end
};
