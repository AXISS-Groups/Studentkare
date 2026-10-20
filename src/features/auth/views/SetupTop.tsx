import React from 'react';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { setupPosition, type SetupStep } from './setupSteps';
import './setup-top.css';

export interface SetupTopProps {
  step: SetupStep;
  onBack: () => void;
}

/**
 * The setup boards' top row (canvas ProfileSetup, Permissions): a round back
 * button, the segmented progress and "n of m". The bar is a progressbar so the
 * position is announced; the visible count is the same fact, so it is hidden
 * from screen readers.
 */
export function SetupTop({ step, onBack }: SetupTopProps): React.ReactElement {
  const t = useT();
  const { position, total } = setupPosition(step);
  return (
    <div className="sk-setuptop">
      <button type="button" className="sk-setuptop__back" onClick={onBack} aria-label={t('common.back')}>
        <Icon name="arrow-left" size={20} />
      </button>
      <div
        className="sk-setuptop__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={position}
        aria-label={t('launch.setup.stepOf', { position, total })}
      >
        {Array.from({ length: total }, (_, index) => (
          <span key={index} data-done={index < position ? 'true' : 'false'} />
        ))}
      </div>
      <span className="sk-setuptop__count" aria-hidden="true">
        {t('launch.setup.position', { position, total })}
      </span>
    </div>
  );
}
