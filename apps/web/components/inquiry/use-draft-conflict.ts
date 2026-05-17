'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Manages textarea state with a "new server-side draft arrived" conflict
 * handler. While the user hasn't touched the textarea, server updates flow
 * through silently. Once the user has edits, incoming updates are stashed
 * and the caller can render a toast offering to load them or keep edits.
 *
 * Returned API:
 *   text             — current textarea value
 *   setText          — pass to <textarea onChange>
 *   pendingDraftBody — non-null while a new body is queued behind the user's edits
 *   loadIncoming     — swap to the queued body, dismiss the toast
 *   keepMyEdits      — adopt the queued body as baseline (text stays), dismiss the toast
 */
export function useDraftConflict(serverBody: string) {
  const [text, setText] = useState(serverBody);
  const baselineRef = useRef(serverBody);
  const [pendingDraftBody, setPendingDraftBody] = useState<string | null>(null);

  useEffect(() => {
    if (serverBody === baselineRef.current) return;
    const userHasEdits = text !== baselineRef.current;
    if (!userHasEdits) {
      setText(serverBody);
      baselineRef.current = serverBody;
      setPendingDraftBody(null);
    } else {
      setPendingDraftBody(serverBody);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverBody]);

  const loadIncoming = () => {
    if (pendingDraftBody === null) return;
    setText(pendingDraftBody);
    baselineRef.current = pendingDraftBody;
    setPendingDraftBody(null);
  };
  const keepMyEdits = () => {
    if (pendingDraftBody !== null) baselineRef.current = pendingDraftBody;
    setPendingDraftBody(null);
  };

  return { text, setText, pendingDraftBody, loadIncoming, keepMyEdits };
}
