import { Cell, List, Section } from '@telegram-apps/telegram-ui';
import { useLaunchParams } from '@tma.js/sdk-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import { Page } from '@/components/Page.tsx';
import { Link } from '@/components/Link/Link.tsx';
import { getAllEvents } from '@/api/getAllEvents';
import type { IEvent } from '@/types/eventTypes';
import { EventsCalendar } from '@/pages/IndexPage/EventsCalendar';

export const IndexPage: FC = () => {
  const { tgWebAppStartParam } = useLaunchParams();
  const showCheatSheet = tgWebAppStartParam === 'debug';
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAllEvents()
      .then((data) => {
        if (cancelled) return;
        setEvents(data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load events');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Page back={false}>
      <List>
        <Section>
          <EventsCalendar events={events} loading={loading} error={error} />
        </Section>
        {showCheatSheet && (
          <Section header="Cheat Sheet">
            <Link to="/cheatsheet">
              <Cell
                subtitle="Useful pages & quick links"
              >
                Open cheat sheet
              </Cell>
            </Link>
          </Section>
        )}
      </List>
    </Page>
  );
};
