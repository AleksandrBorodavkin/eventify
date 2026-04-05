import type { FC, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Cell, Text } from '@telegram-apps/telegram-ui';
import { useNavigate } from 'react-router-dom';

import type { IEvent } from '@/types/eventTypes';
import { Link } from '@/components/Link/Link';
import { getInitialChatMembership } from '@/api/getInitialChatMembership';
import { InitialChatJoinGate } from '@/components/InitialChatJoinGate/InitialChatJoinGate.tsx';

import './EventsCalendar.css';

type Props = {
  events: IEvent[];
  loading?: boolean;
  error?: string | null;
};

type EventWithDate = IEvent & { __date: Date };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function sameYmd(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toKeyYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function gridStartForMonth(monthStart: Date) {
  // Monday-first grid
  const jsDay = monthStart.getDay(); // 0 Sun .. 6 Sat
  const mondayIndex = (jsDay + 6) % 7; // 0 Mon .. 6 Sun
  const d = new Date(monthStart);
  d.setDate(d.getDate() - mondayIndex);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatMonthTitle(d: Date) {
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

/** Вторая строка ячейки (subtitle Cell): свободно / лимит / резерв. */
function EventListEventSecondLine({ ev }: { ev: EventWithDate }): ReactNode {
  const main = ev.mainParticipantsTotal;
  const reserveTotal = ev.reserveParticipantsTotal;
  const hasData = main !== undefined && reserveTotal !== undefined;
  const freeMain = hasData ? Math.max(0, ev.limit - main) : null;
  const reserve = hasData ? reserveTotal : null;

  return (
    <div
      className="eventsCalendarEventRow2"
      role="group"
      aria-label={
        hasData
          ? `Свободных мест: ${freeMain}, лимит: ${ev.limit}, в резерве: ${reserve}`
          : `Данные о заполненности неполные, лимит: ${ev.limit}`
      }
    >
      <div className="eventsCalendarEventStat">
        <span className="eventsCalendarEventStatLabel">Свободно</span>
        <span className="eventsCalendarEventStatValue">{freeMain ?? '—'}</span>
      </div>
      <span className="eventsCalendarEventStatSep" aria-hidden>
        ·
      </span>
      <div className="eventsCalendarEventStat">
        <span className="eventsCalendarEventStatLabel">Лимит</span>
        <span className="eventsCalendarEventStatValue">{ev.limit}</span>
      </div>
      <span className="eventsCalendarEventStatSep" aria-hidden>
        ·
      </span>
      <div className="eventsCalendarEventStat">
        <span className="eventsCalendarEventStatLabel">Резерв</span>
        <span className="eventsCalendarEventStatValue">{reserve ?? '—'}</span>
      </div>
    </div>
  );
}

/** Первая строка ячейки: название : время : Участвую или приглашающий смайлик. */
function EventListEventFirstLine({ ev }: { ev: EventWithDate }): ReactNode {
  const iso = ev.__date.toISOString();
  const when = ev.__date.toLocaleString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="eventsCalendarEventRow1">
      <span className="eventsCalendarEventRow1Title">{ev.title}</span>
      <span className="eventsCalendarEventRow1Dash" aria-hidden="true">
        :
      </span>
      <time className="eventsCalendarEventRow1Time" dateTime={iso}>
        {when}
      </time>
      {ev.isParticipant ? (
        <>
          <span className="eventsCalendarEventRow1Dash" aria-hidden="true">
            :
          </span>
          <span className="eventsCalendarEventRow1Partake" role="status">
            Участвую
          </span>
        </>
      ) : (
        <>
          <span className="eventsCalendarEventRow1Dash" aria-hidden="true">
            :
          </span>
          <span
            className="eventsCalendarEventRow1Invite"
            role="img"
            aria-label="Можно присоединиться"
          >
          &nbsp;&nbsp;&nbsp;😉
          </span>
        </>
      )}
    </div>
  );
}

export const EventsCalendar: FC<Props> = ({ events, loading, error }) => {
  const navigate = useNavigate();
  const [createChecking, setCreateChecking] = useState(false);
  const [joinModal, setJoinModal] = useState<{
    path: string;
    joinChatLink: string;
  } | null>(null);
  const [createGateError, setCreateGateError] = useState<string | null>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  const eventsWithDates: EventWithDate[] = useMemo(() => {
    return (events ?? [])
      .map((e) => {
        const d = new Date(e.date);
        return Number.isNaN(d.getTime()) ? null : ({ ...e, __date: d } as EventWithDate);
      })
      .filter(Boolean) as EventWithDate[];
  }, [events]);

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, EventWithDate[]>();
    for (const ev of eventsWithDates) {
      const day = new Date(ev.__date);
      day.setHours(0, 0, 0, 0);
      const k = toKeyYmd(day);
      const arr = map.get(k);
      if (arr) arr.push(ev);
      else map.set(k, [ev]);
    }
    // stable ordering inside a day
    for (const arr of map.values()) {
      arr.sort((a, b) => a.__date.getTime() - b.__date.getTime());
    }
    return map;
  }, [eventsWithDates]);

  const gridDays = useMemo(() => {
    const start = gridStartForMonth(month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [month]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const k = toKeyYmd(selectedDay);
    return eventsByDayKey.get(k) ?? [];
  }, [eventsByDayKey, selectedDay]);

  const monthTitle = useMemo(() => formatMonthTitle(month), [month]);

  const handleCreateEventClick = async () => {
    if (!selectedDay) return;
    const path = `/events/new?date=${encodeURIComponent(toKeyYmd(selectedDay))}`;
    setCreateGateError(null);
    setCreateChecking(true);
    try {
      const { inGroup, joinChatLink } = await getInitialChatMembership();
      if (inGroup) {
        navigate(path);
      } else {
        setJoinModal({ path, joinChatLink });
      }
    } catch (e) {
      setCreateGateError(e instanceof Error ? e.message : 'Не удалось проверить доступ');
    } finally {
      setCreateChecking(false);
    }
  };

  return (
    <div className="eventsCalendar">
      <div className="eventsCalendarHeader">
        <button
          type="button"
          className="eventsCalendarNavBtn"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <div className="eventsCalendarHeaderTitle">{monthTitle}</div>
        <button
          type="button"
          className="eventsCalendarNavBtn"
          onClick={() => setMonth((m) => addMonths(m, +1))}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="eventsCalendarWeekRow">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="eventsCalendarDow">
            {d}
          </div>
        ))}
      </div>

      <div
        className="eventsCalendarDaySeparator eventsCalendarDaySeparator--afterWeekRow"
        role="separator"
        aria-hidden="true"
      />

      <div className="eventsCalendarGrid" role="grid" aria-label="Календарь событий">
        {gridDays.map((d) => {
          const isOtherMonth = d.getMonth() !== month.getMonth();
          const isSelected = selectedDay ? sameYmd(d, selectedDay) : false;
          const dayEvents = eventsByDayKey.get(toKeyYmd(d)) ?? [];
          const hasEvents = dayEvents.length > 0;

          const cls = [
            'eventsCalendarCell',
            isOtherMonth ? 'eventsCalendarCellOtherMonth' : '',
            hasEvents ? 'eventsCalendarCellHasEvents' : '',
            isSelected ? 'eventsCalendarCellSelected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={toKeyYmd(d)}
              type="button"
              className={cls}
              onClick={() => setSelectedDay(d)}
              aria-label={`День ${d.getDate()}`}
            >
              <div className="eventsCalendarCellDayNumRow">
                <div className="eventsCalendarCellDayNum">{d.getDate()}</div>
              </div>
              {hasEvents && (
                <div className="eventsCalendarCellCount eventsCalendarCellCountBadge">
                  {dayEvents.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!selectedDay ? (
        <Cell subtitle="Нажми на дату в календаре">Выбери день</Cell>
      ) : loading ? (
        <Cell subtitle="Загружаем события…">События на выбранный день</Cell>
      ) : error ? (
        <Cell subtitle={error}>Не удалось загрузить события</Cell>
      ) : (
        <>
          <div className="eventsCalendarDaySeparator" role="separator" aria-hidden="true" />
          {selectedDayEvents.map((ev) => {
            const key = String(ev.id ?? `${ev.title}-${ev.date}`);
            if (!ev.id) {
              return (
                <Cell
                  key={key}
                  subtitle={<EventListEventSecondLine ev={ev} />}
                >
                  <EventListEventFirstLine ev={ev} />
                </Cell>
              );
            }
            return (
              <Link key={key} to={`/events/${ev.id}`}>
                <Cell
                  subtitle={<EventListEventSecondLine ev={ev} />}
                >
                  <EventListEventFirstLine ev={ev} />
                </Cell>
              </Link>
            );
          })}
          <Cell
            subtitle={
              createChecking ? 'Проверяем доступ…' : 'На выбранную дату'
            }
            onClick={createChecking ? undefined : () => void handleCreateEventClick()}
          >
            Создать событие
          </Cell>
          {createGateError && (
            <Text style={{ padding: '8px 16px', color: 'var(--tgui--destructive_text_color)' }}>
              {createGateError}
            </Text>
          )}
        </>
      )}

      {joinModal && (
        <div
          className="eventsCalendarJoinOverlay"
          role="presentation"
          onClick={() => setJoinModal(null)}
        >
          <div
            className="eventsCalendarJoinCard"
            role="dialog"
            aria-modal="true"
            aria-label="Вступление в группу"
            onClick={(e) => e.stopPropagation()}
          >
            <InitialChatJoinGate
              joinChatLink={joinModal.joinChatLink}
              onUnlocked={() => {
                setJoinModal(null);
                navigate(joinModal.path);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

