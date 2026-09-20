import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '../viewmodel/useAuthViewModel';

export const AuthenticatedFlowScreen: React.FC = observer(() => {
  const { state, actions } = useAuthViewModel();

  useEffect(() => {
    void actions.loadOptions();
  }, [actions]);

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <h2>Studentkare Secure Sign In</h2>
      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
      <p>Authentication flow active for channel {state.channel}</p>
    </div>
  );
});
