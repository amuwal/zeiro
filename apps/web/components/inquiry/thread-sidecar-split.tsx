'use client';

import type { ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

export function ThreadSidecarSplit({
  thread,
  sidecar,
}: {
  thread: ReactNode;
  sidecar: ReactNode;
}) {
  return (
    <Group orientation="horizontal" id="thread-sidecar" className="thread-sidecar-split">
      <Panel defaultSize="68%" minSize="25%">
        {thread}
      </Panel>
      <Separator className="resize-handle">
        <span className="resize-grip" aria-hidden="true" />
      </Separator>
      <Panel defaultSize="32%" minSize="20%" maxSize="60%">
        {sidecar}
      </Panel>
    </Group>
  );
}
