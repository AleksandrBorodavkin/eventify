import {
  Button,
  Cell,
  Input,
  List,
  Section,
  Switch,
  Text,
  Textarea,
} from '@telegram-apps/telegram-ui';
import type { FC, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon24ChevronDown } from '@telegram-apps/telegram-ui/dist/icons/24/chevron_down';
import { Icon24Chat } from '@telegram-apps/telegram-ui/dist/icons/24/chat';
import { Icon24PersonRemove } from '@telegram-apps/telegram-ui/dist/icons/24/person_remove';
import { Icon28Chat } from '@telegram-apps/telegram-ui/dist/icons/28/chat';
import { initData, openLink } from '@tma.js/sdk-react';

import { getEventDetail } from '@/api/getEventDetails';
import { markParticipantPayment } from '@/api/markParticipantPayment';
import { removeEventParticipant } from '@/api/removeEventParticipant';
import { setEventParticipation } from '@/api/setEventParticipation';
import { updateEvent } from '@/api/updateEvent';
import { isTelegramGroupIdsInvalidError } from '@/api/telegramGroupIdsError';
import {
  EventGroupIdsEditor,
  type EventGroupIdsEditorHandle,
} from '@/components/EventGroupIdsEditor/EventGroupIdsEditor.tsx';
import { ParticipantSwipeRow } from '@/components/ParticipantSwipeRow/ParticipantSwipeRow';
import { Page } from '@/components/Page';
import type { User } from '@tma.js/types';

import type { EventDetails, EventParticipant } from '@/types/eventDetailsTypes';

import './EventDetailsPage.css';

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function organizerDisplayName(c: EventDetails['creator']): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return 'Организатор';
}

function organizerUsernameLine(c: EventDetails['creator']): string {
  const u = c.username?.trim();
  if (u) return `@${u.replace(/^@/, '')}`;
  return `ID: ${c.telegramId}`;
}

function initDataUserMatch(telegramId: string, initUser?: User, initReceiver?: User): User | undefined {
  const id = Number(telegramId);
  if (Number.isNaN(id)) return undefined;
  if (initUser?.id === id) return initUser;
  if (initReceiver?.id === id) return initReceiver;
  return undefined;
}

function participantDisplayName(p: EventParticipant, initUser?: User, initReceiver?: User): string {
  const apiParts = [p.firstName, p.lastName].filter(Boolean) as string[];
  if (apiParts.length > 0) return apiParts.join(' ');
  const match = initDataUserMatch(p.telegramId, initUser, initReceiver);
  if (match) {
    const parts = [match.first_name, match.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return match.first_name;
  }
  return `Пользователь #${p.userId}`;
}

function participantUsernameLine(p: EventParticipant, initUser?: User, initReceiver?: User): string {
  const trimmed = p.username?.trim();
  if (trimmed) return `@${trimmed.replace(/^@/, '')}`;
  const match = initDataUserMatch(p.telegramId, initUser, initReceiver);
  const u = match?.username?.trim();
  if (u) return `@${u.replace(/^@/, '')}`;
  return `ID: ${p.telegramId}`;
}

function participantContactLink(p: EventParticipant, initUser?: User, initReceiver?: User): string {
  if (p.contactLink) return p.contactLink;
  const match = initDataUserMatch(p.telegramId, initUser, initReceiver);
  const u = match?.username?.trim();
  if (u) return `https://t.me/${u.replace(/^@/, '')}`;
  return `tg://user?id=${p.telegramId}`;
}

export const EventDetailsPage: FC = () => {
  const { id } = useParams();
  const groupEditorRef = useRef<EventGroupIdsEditorHandle>(null);
  const [groupEditorKey, setGroupEditorKey] = useState(0);
  const [data, setData] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateLocal, setEditDateLocal] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editStatus, setEditStatus] = useState(true);
  const [editAllowMultipleSlots, setEditAllowMultipleSlots] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [invalidGroupIds, setInvalidGroupIds] = useState<string[] | null>(null);
  const [participantBusyKey, setParticipantBusyKey] = useState<string | null>(null);
  /** Не смешивать с `error`: иначе ломается первая секция и список участников. */
  const [participantActionError, setParticipantActionError] = useState<string | null>(null);
  const [participantSwipeOpenKey, setParticipantSwipeOpenKey] = useState<string | null>(null);

  const eventId = useMemo(() => (id ? String(id) : ''), [id]);
  const currentTelegramId = useMemo(() => initData.user()?.id, []);
  const initDataUser = useMemo(() => initData.user(), []);
  const initDataReceiver = useMemo(() => initData.receiver(), []);

  const isParticipant = useMemo(() => {
    if (!data || !currentTelegramId) return false;
    return data.participants.some((p) => String(p.telegramId) === String(currentTelegramId));
  }, [data, currentTelegramId]);

  /** Моя запись участника (несколько мест: основа + резерв). */
  const myParticipation = useMemo((): EventParticipant | undefined => {
    if (!data || currentTelegramId == null) return undefined;
    return data.participants.find((p) => String(p.telegramId) === String(currentTelegramId));
  }, [data, currentTelegramId]);

  const myTotalSlots = useMemo(() => {
    if (!myParticipation) return 0;
    return myParticipation.mainParticipantsCount + myParticipation.reserveParticipantsCount;
  }, [myParticipation]);

  const allowMultipleSlotsPerUser = data?.allowMultipleSlotsPerUser === true;

  const isCreator = useMemo(() => {
    if (!data || currentTelegramId == null) return false;
    return String(data.creator.telegramId) === String(currentTelegramId);
  }, [data, currentTelegramId]);

  /** Очередь текущего состава: кто раньше записался — выше (№1, №2…). createdAt строки = момент записи в этом «заходе». */
  const participantsDisplayOrder = useMemo(() => {
    if (!data?.participants?.length) return [];
    return [...data.participants].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return a.userId - b.userId;
    });
  }, [data?.participants]);

  /** Суммы по записям участников — как на бэкенде для списка событий. */
  const slotSummary = useMemo(() => {
    if (!data) return null;
    const mainOccupied = data.participants.reduce((s, p) => s + p.mainParticipantsCount, 0);
    const reserveTotal = data.participants.reduce((s, p) => s + p.reserveParticipantsCount, 0);
    const freeMain = Math.max(0, data.limit - mainOccupied);
    return { freeMain, reserveTotal, limit: data.limit };
  }, [data]);

  const loadEventDetails = useCallback(
    async (options?: { withLoading?: boolean; canUpdate?: () => boolean }) => {
      if (!eventId) return;
      const withLoading = options?.withLoading ?? false;
      const canUpdate = options?.canUpdate ?? (() => true);
      if (withLoading && canUpdate()) setLoading(true);
      try {
        const res = await getEventDetail(eventId);
        if (!canUpdate()) return;
        setData(res);
        setParticipantActionError(null);
      } catch (e) {
        if (!canUpdate()) return;
        setError(e instanceof Error ? e.message : 'Не удалось загрузить событие');
      } finally {
        if (withLoading && canUpdate()) setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setError(null);
    void loadEventDetails({ withLoading: true, canUpdate: () => !cancelled });

    return () => {
      cancelled = true;
    };
  }, [eventId, loadEventDetails]);

  const editInitialGroupLabels = useMemo(() => {
    if (!data?.groups?.length) return undefined;
    const m: Record<string, string> = {};
    for (const g of data.groups) {
      m[g.chatId] = g.label ?? '';
    }
    return m;
  }, [data]);

  const startEditing = useCallback(() => {
    if (!data) return;
    setEditTitle(data.title);
    setEditDescription(data.description ?? '');
    setEditDateLocal(toDatetimeLocalValue(new Date(data.date)));
    setEditLimit(String(data.limit));
    setEditStatus(data.status);
    setEditAllowMultipleSlots(data.allowMultipleSlotsPerUser === true);
    setEditError(null);
    setInvalidGroupIds(null);
    setGroupEditorKey((k) => k + 1);
    setEditing(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditError(null);
    setInvalidGroupIds(null);
  }, []);

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId || !data) return;
    setEditError(null);
    setInvalidGroupIds(null);
    const limitNum = Number(editLimit);
    if (!editTitle.trim()) {
      setEditError('Укажите название');
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum < 1) {
      setEditError('Лимит участников — число не меньше 1');
      return;
    }
    const groupIds = groupEditorRef.current?.getGroupIds() ?? [];
    const groupLabels = groupEditorRef.current?.getGroupLabels?.() ?? {};
    if (groupIds.length === 0) {
      setEditError('Выберите хотя бы одну группу или добавьте новую с названием и ID');
      return;
    }
    setSubmitting(true);
    try {
      await updateEvent(eventId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        date: new Date(editDateLocal).toISOString(),
        limit: limitNum,
        status: editStatus,
        allowMultipleSlotsPerUser: editAllowMultipleSlots,
        groupIds,
        groupLabels,
      });
      await loadEventDetails();
      setEditing(false);
    } catch (err) {
      if (isTelegramGroupIdsInvalidError(err)) {
        setInvalidGroupIds(err.invalidGroupIds);
        return;
      }
      setEditError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  const participantRowKey = (p: EventParticipant) => `${p.userId}-${p.telegramId}`;

  const onToggleParticipantPaid = async (p: EventParticipant) => {
    if (!eventId) return;
    const key = participantRowKey(p);
    setParticipantBusyKey(key);
    setParticipantActionError(null);
    try {
      await markParticipantPayment(eventId, {
        participantTelegramId: Number(p.telegramId),
        paid: !p.paid,
      });
      await loadEventDetails();
      setParticipantSwipeOpenKey(null);
    } catch (e) {
      setParticipantActionError(
        e instanceof Error ? e.message : 'Не удалось обновить отметку об оплате',
      );
    } finally {
      setParticipantBusyKey(null);
    }
  };

  const onExcludeParticipant = async (p: EventParticipant) => {
    if (!eventId) return;
    if (!window.confirm('Исключить этого участника из события?')) return;
    const key = participantRowKey(p);
    setParticipantBusyKey(key);
    setParticipantActionError(null);
    try {
      await removeEventParticipant(eventId, p.telegramId);
      await loadEventDetails();
      setParticipantSwipeOpenKey(null);
    } catch (e) {
      setParticipantActionError(e instanceof Error ? e.message : 'Не удалось исключить участника');
    } finally {
      setParticipantBusyKey(null);
    }
  };

  /** +1 место (первая запись или дополнительный слот) — POST. */
  const onAddParticipationSlot = useCallback(async () => {
    if (!eventId) return;
    setSubmitting(true);
    setError(null);
    try {
      await setEventParticipation(eventId, true);
      await loadEventDetails();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось записаться или добавить место');
    } finally {
      setSubmitting(false);
    }
  }, [eventId, loadEventDetails]);

  /** −1 место — PATCH (очередь резерва на бэкенде по времени записи). */
  const onRemoveOneParticipationSlot = useCallback(async () => {
    if (!eventId || !myParticipation || myTotalSlots <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await setEventParticipation(eventId, false);
      await loadEventDetails();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось уменьшить число мест');
    } finally {
      setSubmitting(false);
    }
  }, [eventId, loadEventDetails, myParticipation, myTotalSlots]);

  /** Снять все слоты подряд — покинуть событие. */
  const onLeaveEventCompletely = useCallback(async () => {
    if (!eventId || currentTelegramId == null) return;
    if (!window.confirm('Покинуть событие полностью?')) return;
    setSubmitting(true);
    setError(null);
    try {
      for (let step = 0; step < 64; step++) {
        const res = await getEventDetail(eventId);
        const me = res.participants.find((p) => String(p.telegramId) === String(currentTelegramId));
        if (!me) {
          setData(res);
          break;
        }
        const slots = me.mainParticipantsCount + me.reserveParticipantsCount;
        if (slots <= 0) {
          setData(res);
          break;
        }
        await setEventParticipation(eventId, false);
      }
      await loadEventDetails();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось покинуть событие');
    } finally {
      setSubmitting(false);
    }
  }, [eventId, currentTelegramId, loadEventDetails]);

  return (
    <Page>
      <Section header={data?.title?.trim() || 'Событие'}>
        <List>
          {loading ? (
            <Cell subtitle="Загружаем…">Детали</Cell>
          ) : error ? (
            <Cell subtitle={error}>Ошибка</Cell>
          ) : !data ? (
            <Cell subtitle="Нет данных">Детали</Cell>
          ) : editing && isCreator ? (
            <form onSubmit={onSaveEdit}>
              <Input
                placeholder="Название мероприятия"
                value={editTitle}
                onChange={(ev) => setEditTitle(ev.target.value)}
              />
              <Textarea
                header="Описание"
                value={editDescription}
                onChange={(ev) => setEditDescription(ev.target.value)}
              />
              <Input
                header="Дата и время"
                type="datetime-local"
                value={editDateLocal}
                onChange={(ev) => setEditDateLocal(ev.target.value)}
              />
              <Input
                header="Лимит участников"
                type="number"
                min={1}
                inputMode="numeric"
                value={editLimit}
                onChange={(ev) => setEditLimit(ev.target.value)}
              />
              <EventGroupIdsEditor
                ref={groupEditorRef}
                key={`edit-groups-${groupEditorKey}`}
                initialSelectedIds={data.groups.map((g) => g.chatId)}
                initialGroupLabels={editInitialGroupLabels}
                footer="Названия и ID чатов: после сохранения подписи остаются в профиле для следующих событий."
                invalidGroupIds={invalidGroupIds ?? undefined}
                onClearInvalidHighlight={() => setInvalidGroupIds(null)}
              />
              <Cell
                after={
                  <Switch
                    checked={editStatus}
                    onChange={(ev) => setEditStatus(ev.target.checked)}
                  />
                }
              >
                Событие активно
              </Cell>
              <Cell
                subtitle="Иначе у каждого участника не больше одного места"
                after={
                  <Switch
                    checked={editAllowMultipleSlots}
                    onChange={(ev) => setEditAllowMultipleSlots(ev.target.checked)}
                  />
                }
              >
                Несколько мест одному участнику
              </Cell>
              {editError && (
                <Text style={{ padding: '12px 16px', color: 'var(--tgui--destructive_text_color)' }}>
                  {editError}
                </Text>
              )}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button type="submit" size="l" stretched disabled={submitting}>
                  {submitting ? 'Сохраняем…' : 'Сохранить'}
                </Button>
                <Button type="button" size="l" stretched mode="bezeled" disabled={submitting} onClick={cancelEditing}>
                  Отмена
                </Button>
              </div>
            </form>
          ) : (
            <div className="eventDetailsSummary">
              <div className="eventDetailsBlockCard">
                <div className="eventDetailsBlockHint">Организатор</div>
                <button
                  type="button"
                  className="eventDetailsOrganizerBtn"
                  onClick={() => openLink(data.creator.contactLink)}
                >
                  <div className="eventDetailsOrganizerText">
                    <span className="eventDetailsOrganizerName">
                      {organizerDisplayName(data.creator)}
                    </span>
                    <span className="eventDetailsOrganizerSub">
                      {organizerUsernameLine(data.creator)}
                    </span>
                  </div>
                  <span className="organizerChatIconWrap" aria-hidden>
                    <Icon28Chat
                      width={28}
                      height={28}
                      style={{ color: 'var(--tgui--link_color, var(--tg-theme-link-color, #2481cc))' }}
                    />
                  </span>
                </button>
              </div>

              <div className="eventDetailsBlockCard">
                <div className="eventDetailsBlockHint">Когда</div>
                <p className="eventDetailsBlockWhenValue">{formatDateTime(data.date)}</p>
              </div>

              {slotSummary ? (
                <div className="eventDetailsBlockCard">
                  <div className="eventDetailsBlockHint">Места</div>
                  <p
                    className="eventDetailsBlockPlacesValue"
                    aria-label={`Свободных мест: ${slotSummary.freeMain} из ${slotSummary.limit}, резерв ${slotSummary.reserveTotal}`}
                  >
                    Свободных: <strong>{slotSummary.freeMain}</strong> из <strong>{slotSummary.limit}</strong>
                    {' · '}
                    резерв <strong>{slotSummary.reserveTotal}</strong>
                  </p>
                </div>
              ) : null}

              {data.description?.trim() ? (
                <div className="eventDetailsBlockCard">
                  <div className="eventDetailsBlockHint">Описание</div>
                  <Text className="eventDetailsBlockDescription">{data.description}</Text>
                </div>
              ) : null}

              <details
                key={eventId}
                className="eventDetailsBlockCard eventDetailsBlockCard--accordion eventDetailsGroupsDetails"
              >
                <summary className="eventDetailsGroupsSummary">
                  <span className="eventDetailsBlockHint eventDetailsBlockHint--accordion">Для каких групп</span>
                  <Icon24ChevronDown
                    className="eventDetailsGroupsChevron"
                    width={20}
                    height={20}
                    aria-hidden
                  />
                </summary>
                <div className="eventDetailsGroupsContent">
                  {data.groups && data.groups.length > 0 ? (
                    <ul className="eventDetailsGroupsList">
                      {data.groups.map((g) => (
                        <li key={g.chatId} className="eventDetailsGroupsItem">
                          <span className="eventDetailsGroupsLabel">{g.label.trim() || 'Без названия'}</span>
                          <span className="eventDetailsGroupsId">ID: {g.chatId}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="eventDetailsGroupsEmpty">Не указаны</p>
                  )}
                </div>
              </details>

              {isCreator && (
                <div style={{ padding: '12px 16px 4px' }}>
                  <Button type="button" size="l" stretched mode="bezeled" onClick={startEditing}>
                    Редактировать событие
                  </Button>
                </div>
              )}
              <div className="eventDetailsParticipationBlock">
                {!isParticipant ? (
                  <Button
                    size="l"
                    stretched
                    disabled={submitting || !data.status}
                    onClick={() => void onAddParticipationSlot()}
                  >
                    {submitting ? 'Записываем…' : 'Принять участие'}
                  </Button>
                ) : allowMultipleSlotsPerUser ? (
                  <>
                    <div className="eventDetailsMySlotsSummary">
                      <span className="eventDetailsMySlotsLabel">Ваши места</span>
                      <span className="eventDetailsMySlotsCounts">
                        основа {myParticipation?.mainParticipantsCount ?? 0} · резерв{' '}
                        {myParticipation?.reserveParticipantsCount ?? 0}
                        {' · '}
                        всего <strong>{myTotalSlots}</strong>
                      </span>
                    </div>
                    <div className="eventDetailsMySlotsStepper">
                      <Button
                        type="button"
                        size="m"
                        mode="bezeled"
                        disabled={submitting || myTotalSlots <= 0}
                        onClick={() => void onRemoveOneParticipationSlot()}
                        aria-label="Убрать одно место"
                      >
                        −
                      </Button>
                      <span className="eventDetailsMySlotsTotal" aria-live="polite">
                        {myTotalSlots}
                      </span>
                      <Button
                        type="button"
                        size="m"
                        disabled={submitting || !data.status}
                        onClick={() => void onAddParticipationSlot()}
                        aria-label="Добавить одно место"
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      size="l"
                      stretched
                      mode="bezeled"
                      disabled={submitting}
                      onClick={() => void onLeaveEventCompletely()}
                    >
                      {submitting ? 'Выходим…' : 'Покинуть событие полностью'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="eventDetailsMySlotsSummary">
                      <span className="eventDetailsMySlotsLabel">Ваше участие</span>
                      <span className="eventDetailsMySlotsCounts">
                        основа {myParticipation?.mainParticipantsCount ?? 0} · резерв{' '}
                        {myParticipation?.reserveParticipantsCount ?? 0}
                      </span>
                    </div>
                    <Button
                      size="l"
                      stretched
                      mode="bezeled"
                      disabled={submitting || myTotalSlots <= 0}
                      onClick={() => {
                        if (myTotalSlots > 1) void onLeaveEventCompletely();
                        else void onRemoveOneParticipationSlot();
                      }}
                    >
                      {submitting ? 'Выходим…' : 'Покинуть событие'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </List>
      </Section>

      <Section header="Участники">
        <div
          className={
            participantActionError
              ? 'eventDetailsParticipantErrorSlot eventDetailsParticipantErrorSlot--visible'
              : 'eventDetailsParticipantErrorSlot'
          }
          aria-live="polite"
        >
          {participantActionError ? (
            <Text className="eventDetailsParticipantErrorText">{participantActionError}</Text>
          ) : null}
        </div>
        <List>
          {loading ? (
            <Cell subtitle="Загружаем…">Список</Cell>
          ) : error ? (
            <Cell subtitle="Не удалось загрузить участников">Список</Cell>
          ) : !data ? (
            <Cell subtitle="Нет данных">Список</Cell>
          ) : data.participants.length === 0 ? (
            <Cell subtitle="Пока никто не записался">Список</Cell>
          ) : (
            participantsDisplayOrder.map((p, orderIndex) => {
              const rowKey = participantRowKey(p);
              const queueNumber = orderIndex + 1;
              const busy = participantBusyKey === rowKey;
              const contact = participantContactLink(p, initDataUser, initDataReceiver);

              const subtitle = (
                <div className="eventDetailsParticipantSubtitle">
                  <span className="eventDetailsParticipantUsername">
                    {participantUsernameLine(p, initDataUser, initDataReceiver)}
                  </span>
                  <span className="eventDetailsParticipantStats">
                    {isCreator ? (
                      <>
                        <span
                          className={
                            p.paid
                              ? 'eventDetailsParticipantPaid--yes'
                              : 'eventDetailsParticipantPaid--no'
                          }
                        >
                          {p.paid ? 'Оплачено' : 'Не оплачено'}
                        </span>
                        {' · '}
                        Осн.: {p.mainParticipantsCount} · Рез.: {p.reserveParticipantsCount}
                        {' · '}
                        <span className="eventDetailsParticipantSwipeHint">Свайп влево</span>
                      </>
                    ) : (
                      <>
                        Оплата: {p.paid ? 'да' : 'нет'} · Осн.: {p.mainParticipantsCount} · Рез.:{' '}
                        {p.reserveParticipantsCount}
                      </>
                    )}
                  </span>
                </div>
              );

              const title = (
                <>
                  <span className="eventDetailsParticipantOrder">№{queueNumber}</span>{' '}
                  {participantDisplayName(p, initDataUser, initDataReceiver)}
                </>
              );

              if (isCreator) {
                return (
                  <ParticipantSwipeRow
                    key={rowKey}
                    rowKey={rowKey}
                    openRowKey={participantSwipeOpenKey}
                    onOpenRowKey={setParticipantSwipeOpenKey}
                    disabled={busy}
                    actions={
                      <>
                        <button
                          type="button"
                          className={
                            p.paid
                              ? 'eventDetailsParticipantIconBtn eventDetailsParticipantIconBtn--paid'
                              : 'eventDetailsParticipantIconBtn'
                          }
                          aria-label={p.paid ? 'Снять отметку об оплате' : 'Отметить оплату'}
                          disabled={busy}
                          onClick={() => void onToggleParticipantPaid(p)}
                        >
                          {p.paid ? (
                            <span className="eventDetailsParticipantDollarEmoji" aria-hidden>
                              😀
                            </span>
                          ) : (
                            <span className="eventDetailsParticipantMoneyMark" aria-hidden>
                              ₽
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          className="eventDetailsParticipantIconBtn"
                          aria-label="Написать в чат"
                          disabled={busy}
                          onClick={() => openLink(contact)}
                        >
                          <Icon24Chat
                            width={24}
                            height={24}
                            style={{ color: 'var(--tgui--link_color, var(--tg-theme-link-color, #2481cc))' }}
                            aria-hidden
                          />
                        </button>
                        {String(p.telegramId) !== String(currentTelegramId) ? (
                          <button
                            type="button"
                            className="eventDetailsParticipantIconBtn eventDetailsParticipantIconBtn--danger"
                            aria-label="Исключить из события"
                            disabled={busy}
                            onClick={() => void onExcludeParticipant(p)}
                          >
                            <Icon24PersonRemove width={24} height={24} aria-hidden />
                          </button>
                        ) : null}
                      </>
                    }
                  >
                    <Cell
                      subtitle={subtitle}
                      after={<span className="eventDetailsParticipantSwipeCue">‹‹</span>}
                    >
                      {title}
                    </Cell>
                  </ParticipantSwipeRow>
                );
              }

              return (
                <Cell
                  key={rowKey}
                  subtitle={subtitle}
                  after={
                    <span className="organizerChatIconWrap" aria-hidden>
                      <Icon24Chat
                        width={24}
                        height={24}
                        style={{ color: 'var(--tgui--link_color, var(--tg-theme-link-color, #2481cc))' }}
                      />
                    </span>
                  }
                  onClick={() => openLink(participantContactLink(p, initDataUser, initDataReceiver))}
                >
                  {title}
                </Cell>
              );
            })
          )}
        </List>
      </Section>
    </Page>
  );
};
