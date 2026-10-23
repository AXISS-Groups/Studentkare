import React from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { HomeDiscoverView } from './HomeDiscoverView';

/**
 * /health for a signed-in student at phone width: the Discover board inside
 * the student phone frame (which draws the brand, the bell and the tab bar).
 */
export function HomeDiscoverRoute(): React.ReactElement {
  const { user } = useAuth();
  return (
    <HomeDiscoverView
      campus={user?.university ?? ''}
      verified={user?.isVerifiedStudent === true}
      links={{
        openSearch: () => navigate('search'),
        openCrisis: () => navigate('sos'),
        call112: () => { void Linking.openURL('tel:112'); },
        openShop: () => navigate('shop'),
        openCover: () => navigate('insurance'),
        openAyush: () => navigate('ayush'),
        openNotifications: () => navigate('notifications'),
      }}
    />
  );
}
