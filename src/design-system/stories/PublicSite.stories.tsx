import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NewsletterBand, PublicAppBand, PublicAudienceHeader, PublicSiteFooter, PublicSiteHeader, PublicSitePage, PublicTrustBand } from '../public-site';

const meta = { title: 'Design system/Public site' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const stored = () => Promise.resolve();
const failed = () => Promise.reject(new Error('not stored'));
const pending = () => new Promise<void>(() => undefined);

export const Header: Story = { render: () => <PublicSiteHeader current="discover" /> };
export const HeaderOffNav: Story = { render: () => <PublicSiteHeader current={null} /> };
export const Footer: Story = { render: () => <PublicSiteFooter band={<NewsletterBand />} /> };
export const NewsletterNotOpen: Story = { render: () => <NewsletterBand /> };
export const NewsletterOpen: Story = { render: () => <NewsletterBand subscribe={stored} /> };
export const NewsletterFails: Story = { render: () => <NewsletterBand subscribe={failed} /> };
export const NewsletterBusy: Story = { render: () => <NewsletterBand subscribe={pending} /> };
export const HeaderCompact: Story = { render: () => <PublicSiteHeader current="labTests" variant="compact" /> };
export const HeaderAudience: Story = { render: () => <PublicAudienceHeader current="campuses" cta={{ label: 'landing.campus.enquire', href: '/partnerships' }} /> };
export const TrustPrimary: Story = { render: () => <PublicTrustBand art="primary" /> };
export const TrustAlternate: Story = { render: () => <PublicTrustBand art="alternate" /> };
export const AppNotListed: Story = { render: () => <PublicAppBand art="primary" /> };
export const AppNotListedAlternate: Story = { render: () => <PublicAppBand art="alternate" /> };
export const PageFrame: Story = {
  render: () => (
    <PublicSitePage header={<PublicSiteHeader current="programmes" variant="compact" />} art="alternate">
      <div style={{ height: 240 }} />
    </PublicSitePage>
  ),
};
