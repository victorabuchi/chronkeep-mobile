import { useEffect, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { useToast } from '../components/ui';
import * as commands from './commands';
import { isDone } from './selectors';
import type { Item } from './types';

// The current time, refreshed every `ms` (the red "now" line moves, "in 3 h" counts down).
export function useNow(ms = 60000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

const soft = () => LayoutAnimation.configureNext(LayoutAnimation.create(240, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));

// What ticking, deleting and the other everyday changes do, with their toasts and an Undo.
export function useItemActions() {
  const toast = useToast();
  return {
    // Ticks an item for the occurrence on `ds`. A short pause lets the tick's pop play before the row slides away.
    tick(it: Item, ds: string, delay = 0) {
      const completing = !isDone(it, ds);
      const run = () => {
        soft();
        const done = commands.toggleDone(it.id, ds);
        if (done && completing) toast.show(`Done: ${it.title}`, { action: 'Undo', onAction: () => { soft(); commands.toggleDone(it.id, ds); } });
      };
      if (delay && completing) setTimeout(run, delay); else run();
    },
    step(it: Item, stepId: string, ds: string) {
      if (commands.tickStep(it.id, stepId)) toast.show('All steps are done', { action: 'Mark task done', onAction: () => commands.toggleDone(it.id, ds) });
    },
    remove(it: Item) {
      soft();
      commands.removeItem(it.id);
      toast.show(`Moved "${it.title}" to the bin`, { action: 'Undo', onAction: () => { soft(); commands.restoreItem(it.id); } });
    },
  };
}
