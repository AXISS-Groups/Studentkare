import React from 'react';
import { ScrollView, View } from 'react-native';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { observer } from 'mobx-react-lite';
import { StateScreen } from '@/design-system';
import { useT } from '@/i18n';
import { phoneLayout } from '@/features/phoneKit/phoneParts';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar } from './searchParts';
import type { SearchLinks } from './searchParts';
import { SearchEntryView } from './SearchEntryView';
import { SearchTypingView } from './SearchTypingView';
import { SearchLoadingView } from './SearchLoadingView';
import { SearchResultsView } from './SearchResultsView';
import { NoResultsView } from './NoResultsView';
import { LabResultsView } from './LabResultsView';
import { DoctorResultsView } from './DoctorResultsView';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';

/**
 * The phone search, one board at a time, from the view model's state: entry,
 * typing, searching, results (or none), and the lab and doctor lists. Shared
 * by the web phone frame and the Expo app.
 */
export const SearchFlow = observer(function SearchFlow({ vm, links, doctorArt }: { vm: SearchViewModel; links: SearchLinks; doctorArt?: ArtSource }) {
  const t = useT();
  useScrollTopOn(`${vm.stage}:${vm.phase}:${vm.tab}`);
  if (vm.stage === 'entry') return <SearchEntryView vm={vm} links={links} />;
  if (vm.stage === 'typing') return <SearchTypingView vm={vm} links={links} />;
  if (vm.phase === 'loading' || vm.phase === 'idle') return <SearchLoadingView vm={vm} />;
  if (vm.phase === 'error') {
    return (
      <View style={phoneLayout.screen} testID="search-error">
        <SearchBar vm={vm} onBack={vm.editQuery} editable={false} />
        <ScrollView contentContainerStyle={phoneLayout.content}>
          <StateScreen kind="failure" title={t('phone.search.failedTitle')} body={t('phone.search.failedBody')}
            primary={{ label: t('common.tryAgain'), onPress: vm.retry, testID: 'search-retry' }}
            secondary={{ label: t('phone.search.editSearch'), onPress: vm.editQuery }} />
        </ScrollView>
      </View>
    );
  }
  if (vm.nothingFound) return <NoResultsView vm={vm} links={links} />;
  if (vm.tab === 'labs') return <LabResultsView vm={vm} links={links} />;
  if (vm.tab === 'doctors') return <DoctorResultsView vm={vm} links={links} art={doctorArt} />;
  return <SearchResultsView vm={vm} links={links} />;
});
