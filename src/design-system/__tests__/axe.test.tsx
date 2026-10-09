import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('../motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('../motion')>()), useReducedMotion: () => true }));

import {
  Button, Card, Checkbox, Chip, CodeInput, CrisisLinks, EmptyState, ErrorState, Eyebrow, ListRow, Note, PhoneInput,
  RadioGroup, ResultMomentView, Select, Skeleton, SourceBadge, SwitchRow, Table, TextField, Toast, VerifiedBadge,
} from '..';

const noop = () => undefined;
const cases: [string, React.ReactElement][] = [
  ['Button', <Button label="Continue" onPress={noop} />],
  ['Button busy', <Button label="Paying" onPress={noop} busy />],
  ['TextField invalid', <TextField label="City" value="" onChangeText={noop} error="Enter your city" />],
  ['CodeInput', <CodeInput label="Verification code" value="12" onChangeText={noop} />],
  ['PhoneInput', <PhoneInput label="Mobile number" value="98765" onChangeText={noop} hint="We send a code here" />],
  ['Select', <Select label="Schedule" options={[{ value: 'OTC', label: 'OTC' }]} value="OTC" onChange={noop} />],
  ['Checkbox', <Checkbox label="I agree" checked onChange={noop} />],
  ['Chip', <Chip label="Unread" selected onPress={noop} />],
  ['SwitchRow', <SwitchRow label="Reminders" value onChange={noop} />],
  ['RadioGroup', <RadioGroup label="Show" options={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Unread' }]} value="a" onChange={noop} />],
  ['ListRow action', <ListRow title="CBC report" detail="Lab" onPress={noop} />],
  ['Card + Eyebrow + Note', <Card><Eyebrow>Records</Eyebrow><Note tone="danger" title="Not saved">Try again.</Note></Card>],
  ['Toast', <Toast message="Saved" tone="success" />],
  ['States', <><Skeleton label="Loading" lines={['80%']} /><EmptyState title="Nothing yet" body="Add one." /><ErrorState title="Couldn't load" body="Try again." retryLabel="Retry" onRetry={noop} /></>],
  ['Table', <Table caption="Orders" columns={[{ key: 'n', header: 'Name', render: (r: { id: string }) => r.id }]} rows={[{ id: 'a' }]} rowKey={(r) => r.id} empty={{ title: 'None', body: 'None yet.' }} />],
  ['ResultMoment + badges', <><ResultMomentView moment={{ kind: 'pending' }} title="Waiting" body="The provider confirms." /><SourceBadge source="device" /><VerifiedBadge serverStatus="VERIFIED" /></>],
  ['CrisisLinks', <CrisisLinks />],
];

describe('design system passes axe', () => {
  it.each(cases)('%s', async (_name, element) => {
    const { container } = render(<main>{element}</main>);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
