import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  evaluateRouteAccess,
  getActiveAccessSession,
  subscribeToAccessSession,
  verifySessionAccountActive,
} from '../services/accessControl.js';

export default function RouteAccessGuard({ children }) {
  const location = useLocation();
  const [sessionState, setSessionState] = useState(() => getActiveAccessSession());

  useEffect(() => {
    let active = true;
    verifySessionAccountActive().then((verified) => {
      if (active) setSessionState(verified);
    });

    const unsubscribe = subscribeToAccessSession(() => {
      if (active) setSessionState(getActiveAccessSession());
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [location.pathname, location.search]);

  const decision = evaluateRouteAccess(location.pathname, sessionState.session, {
    search: location.search,
  });

  if (!decision.allowed) {
    return (
      <Navigate
        to={decision.redirectTo}
        replace
        state={{
          accessDeniedReason: decision.reason,
          deniedFrom: location.pathname,
        }}
      />
    );
  }

  return children;
}
