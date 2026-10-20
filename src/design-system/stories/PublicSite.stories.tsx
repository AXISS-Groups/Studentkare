import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { NewsletterBand, PublicSiteFooter, PublicSiteHeader } from '../public-site';

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
