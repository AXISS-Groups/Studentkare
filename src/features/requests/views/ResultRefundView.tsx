import React, { useState } from 'react';
import { ResultMomentCard, ResultMomentScreen, Toast } from '@/design-system';
import { copyText } from '@/data/services/clipboard';
import { money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { orderRef } from '@/features/phoneKit/orderRef';

export interface RequestedReturn {
  returnId: string;
  item: string;
  orderId: string;
  /** What the line cost (GET /api/returns/eligible). The refund is decided by the pharmacy, not here. */
  pricePaise: number;
}

/**
 * After a return is requested (canvas ResultRefund; the shared result moment).
 * The canvas celebrates "₹349 on its way", but at this point nothing is on its
 * way: the pharmacy has to accept the return and collect it first, and only
 * then is a refund arranged. So this is the pending mood, and the card says
 * what happens next and that the amount is the item's price, not a promise.
 * The receipt link is drawn but not offered (there is no refund yet).
 */
export function ResultRefundView({ request, onBack, onTrack, onAnother, onCopy = copyText }: {
  request: RequestedReturn;
  onBack: () => void;
  onTrack: () => void;
  onAnother: () => void;
  onCopy?: (text: string) => Promise<boolean>;
}): React.ReactElement {
  const t = useT();
  const [toast, setToast] = useState<MessageKey | ''>('');
  const ref = orderRef(request.returnId);
  const share = async () => {
    const ok = await onCopy(t('phone.refund.share', { item: request.item, ref }));
    setToast(ok ? 'phone.result.copied' : 'phone.result.copyFailed');
  };
  return (
    <>
      <ResultMomentScreen title={t('phone.refund.hero')} backLabel={t('common.back')} onBack={onBack} replayLabel={t('pay.result.replay')} testID="result-refund">
        <ResultMomentCard
          testID="result-refund-card"
          moment={{ kind: 'pending' }}
          title={t('phone.refund.title')}
          sub={t('phone.refund.sub', { item: request.item })}
          share={{ label: t('pay.result.copy'), onPress: () => void share(), testID: 'refund-copy' }}
          receipt={{ label: t('pay.result.receipt'), accessibilityLabel: t('phone.refund.noReceipt'), onPress: () => undefined, disabled: true }}
          parties={[
            { label: t('pay.result.to'), name: t('phone.refund.toName'), line: t('phone.refund.toLine', { amount: money(request.pricePaise) }), mono: t('phone.refund.returnRef', { ref }) },
            { label: t('phone.result.from'), name: request.item, mono: t('phone.refund.orderRef', { ref: orderRef(request.orderId) }) },
          ]}
          more={{
            rows: [
              { k: t('phone.refund.next'), v: t('phone.refund.nextValue') },
              { k: t('phone.refund.questions'), v: t('phone.refund.questionsValue') },
            ],
            showLabel: t('pay.result.more'),
            hideLabel: t('pay.result.less'),
          }}
          primary={{ label: t('phone.refund.track'), onPress: onTrack, testID: 'refund-track' }}
          secondary={{ label: t('phone.refund.another'), onPress: onAnother, testID: 'refund-another' }}
        />
      </ResultMomentScreen>
      {toast ? <Toast message={t(toast)} tone={toast === 'phone.result.copyFailed' ? 'error' : 'success'} onDone={() => setToast('')} /> : null}
    </>
  );
}
