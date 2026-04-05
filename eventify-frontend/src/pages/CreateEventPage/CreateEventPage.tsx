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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { createEvent } from '@/api/createEvent.ts';
import { isTelegramGroupIdsInvalidError } from '@/api/telegramGroupIdsError.ts';
import { getInitialChatMembership } from '@/api/getInitialChatMembership.ts';
import {
  EventGroupIdsEditor,
  type EventGroupIdsEditorHandle,
} from '@/components/EventGroupIdsEditor/EventGroupIdsEditor.tsx';
import { InitialChatJoinGate } from '@/components/InitialChatJoinGate/InitialChatJoinGate.tsx';
import { Page } from '@/components/Page.tsx';

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const CreateEventPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const groupEditorRef = useRef<EventGroupIdsEditorHandle>(null);

  const initialDateLocal = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const date = sp.get('date'); // YYYY-MM-DD
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return `${date}T12:00`;
    }
    return toDatetimeLocalValue(new Date());
  }, [location.search]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateLocal, setDateLocal] = useState(() => initialDateLocal);
  const [limit, setLimit] = useState('10');
  const [status, setStatus] = useState(true);
  /** Несколько мест на одного участника (+/− на странице события). */
  const [allowMultipleSlotsPerUser, setAllowMultipleSlotsPerUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidGroupIds, setInvalidGroupIds] = useState<string[] | null>(null);

  const [membershipPhase, setMembershipPhase] = useState<
    'loading' | 'ok' | 'need_join' | 'error'
  >('loading');
  const [joinChatLinkGate, setJoinChatLinkGate] = useState<string | null>(null);
  const [membershipLoadError, setMembershipLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { inGroup, joinChatLink } = await getInitialChatMembership();
        if (cancelled) return;
        if (inGroup) {
          setMembershipPhase('ok');
        } else {
          setJoinChatLinkGate(joinChatLink);
          setMembershipPhase('need_join');
        }
      } catch (e) {
        if (cancelled) return;
        setMembershipLoadError(
          e instanceof Error ? e.message : 'Не удалось проверить доступ',
        );
        setMembershipPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInvalidGroupIds(null);
    const limitNum = Number(limit);
    if (!title.trim()) {
      setError('Укажите название');
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum < 1) {
      setError('Лимит участников — число не меньше 1');
      return;
    }
    const groupIds = groupEditorRef.current?.getGroupIds() ?? [];
    const groupLabels = groupEditorRef.current?.getGroupLabels?.() ?? {};
    if (groupIds.length === 0) {
      setError('Выберите хотя бы одну группу или добавьте новую с названием и ID');
      return;
    }
    const dateIso = new Date(dateLocal).toISOString();
    setSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        groupIds,
        groupLabels,
        date: dateIso,
        limit: limitNum,
        status,
        allowMultipleSlotsPerUser,
      });
      navigate('/');
    } catch (err) {
      if (isTelegramGroupIdsInvalidError(err)) {
        setInvalidGroupIds(err.invalidGroupIds);
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось создать событие');
    } finally {
      setSubmitting(false);
    }
  };

  if (membershipPhase === 'loading') {
    return (
      <Page>
        <List>
          <Section header="Новое событие">
            <Cell subtitle="Проверяем доступ к созданию…">Загрузка</Cell>
          </Section>
        </List>
      </Page>
    );
  }

  if (membershipPhase === 'need_join' && joinChatLinkGate) {
    return (
      <Page>
        <List>
          <Section header="Создание событий">
            <div style={{ padding: '12px 16px 16px' }}>
              <InitialChatJoinGate
                joinChatLink={joinChatLinkGate}
                onUnlocked={() => setMembershipPhase('ok')}
              />
            </div>
          </Section>
        </List>
      </Page>
    );
  }

  if (membershipPhase === 'error') {
    return (
      <Page>
        <List>
          <Section header="Новое событие">
            <Cell subtitle={membershipLoadError ?? 'Ошибка'}>Не удалось проверить группу</Cell>
            <div style={{ padding: '12px 16px' }}>
              <Button type="button" size="l" stretched mode="bezeled" onClick={() => navigate(-1)}>
                Назад
              </Button>
            </div>
          </Section>
        </List>
      </Page>
    );
  }

  return (
    <Page>
      <List>
        <form onSubmit={onSubmit}>
          <Section header="Новое событие">
            <Input
              header="Название"
              placeholder="Встреча, тренировка…"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
            />
            <Textarea
              header="Описание"
              placeholder="Детали, место, что взять с собой"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
            />
            <Input
              header="Дата и время"
              type="datetime-local"
              value={dateLocal}
              onChange={(ev) => setDateLocal(ev.target.value)}
            />
            <Input
              header="Лимит участников"
              type="number"
              min={1}
              inputMode="numeric"
              value={limit}
              onChange={(ev) => setLimit(ev.target.value)}
            />
            <Cell
              after={
                <Switch
                  checked={status}
                  onChange={(ev) => setStatus(ev.target.checked)}
                />
              }
            >
              Событие активно
            </Cell>
            <Cell
              subtitle="Иначе у каждого участника не больше одного места"
              after={
                <Switch
                  checked={allowMultipleSlotsPerUser}
                  onChange={(ev) => setAllowMultipleSlotsPerUser(ev.target.checked)}
                />
              }
            >
              Несколько мест одному участнику
            </Cell>
          </Section>

          <EventGroupIdsEditor
            ref={groupEditorRef}
            key="create-event-groups"
            initialSelectedIds={[]}
            footer="ID чатов Telegram: отметьте сохранённые или добавьте новые поля. После создания события новые ID сохранятся в профиле."
            invalidGroupIds={invalidGroupIds ?? undefined}
            onClearInvalidHighlight={() => setInvalidGroupIds(null)}
          />

          {error && (
            <Text style={{ padding: '12px 16px', color: 'var(--tgui--destructive_text_color)' }}>
              {error}
            </Text>
          )}
          <div style={{ padding: '12px 16px 24px' }}>
            <Button
              type="submit"
              size="l"
              stretched
              disabled={submitting}
            >
              {submitting ? 'Создаём…' : 'Создать событие'}
            </Button>
          </div>
        </form>
      </List>
    </Page>
  );
};
