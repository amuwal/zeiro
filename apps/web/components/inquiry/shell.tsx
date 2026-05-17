'use client';

import { useState, type ReactNode } from 'react';
import { InboxList, type InboxItemView } from './inbox-list';
import { Sidebar } from './sidebar';

export type FilterState = {
  filter: string;
  channel: string;
  lifecycle: string;
  category: string;
};

const DEFAULT: FilterState = {
  filter: 'all',
  channel: 'all',
  lifecycle: 'all',
  category: 'all',
};

export function InboxShell({
  items,
  children,
}: {
  items: InboxItemView[];
  children: ReactNode;
}) {
  const [state, setState] = useState<FilterState>(DEFAULT);
  const setKey = <K extends keyof FilterState>(k: K) => (v: string) =>
    setState((s) => ({ ...s, [k]: v }));

  return (
    <>
      <Sidebar
        items={items}
        filter={state.filter}
        channel={state.channel}
        lifecycle={state.lifecycle}
        category={state.category}
        setFilter={setKey('filter')}
        setChannel={setKey('channel')}
        setLifecycle={setKey('lifecycle')}
        setCategory={setKey('category')}
      />
      <InboxList items={items} state={state} />
      {children}
    </>
  );
}
