import {
  Button,
  Cell,
  Input,
  Section,
  Switch,
  Text,
} from '@telegram-apps/telegram-ui';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { getMySavedGroups } from '@/api/getMySavedGroups';

import './EventGroupIdsEditor.css';

export type EventGroupIdsEditorHandle = {
  getGroupIds: () => string[];
  getGroupLabels: () => Record<string, string>;
};

export type EventGroupIdsEditorProps = {
  initialSelectedIds: string[];
  /** Подписи при редактировании существующего события */
  initialGroupLabels?: Record<string, string>;
  footer?: string;
  /** ID групп, которые сервер отклонил (подсветка только поля/строки с ID) */
  invalidGroupIds?: string[];
  /** Сброс подсветки при правке полей */
  onClearInvalidHighlight?: () => void;
};

export const EventGroupIdsEditor = forwardRef<
  EventGroupIdsEditorHandle,
  EventGroupIdsEditorProps
>(function EventGroupIdsEditor(
  { initialSelectedIds, initialGroupLabels, footer, invalidGroupIds, onClearInvalidHighlight },
  ref,
) {
  const [savedChatIds, setSavedChatIds] = useState<string[]>([]);
  const [savedGroupsLoading, setSavedGroupsLoading] = useState(true);
  const [selectedSavedIds, setSelectedSavedIds] = useState<string[]>(() => [...initialSelectedIds]);
  const [labels, setLabels] = useState<Record<string, string>>(() => ({
    ...(initialGroupLabels ?? {}),
  }));
  const [extraGroupRows, setExtraGroupRows] = useState<
    { key: string; chatId: string; label: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    setSavedGroupsLoading(true);
    getMySavedGroups()
      .then((res) => {
        if (cancelled) return;
        const ids = (res.groups ?? []).map((g) => g.chatId);
        setSavedChatIds(ids);
        setLabels((prev) => {
          const next = { ...prev };
          for (const g of res.groups ?? []) {
            if (next[g.chatId] === undefined) {
              next[g.chatId] = g.label ?? '';
            }
          }
          return next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSavedChatIds([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSavedGroupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialGroupLabels) return;
    setLabels((prev) => ({ ...prev, ...initialGroupLabels }));
  }, [initialGroupLabels]);

  const switchListIds = useMemo(
    () =>
      [
        ...new Set([
          ...savedChatIds,
          ...initialSelectedIds,
          ...selectedSavedIds,
          ...Object.keys(labels),
        ]),
      ].filter(Boolean),
    [savedChatIds, initialSelectedIds, selectedSavedIds, labels],
  );

  const invalidSet = useMemo(() => {
    const s = new Set<string>();
    for (const id of invalidGroupIds ?? []) {
      const t = String(id).trim();
      if (t) s.add(t);
    }
    return s;
  }, [invalidGroupIds]);

  const isChatInvalid = useCallback(
    (rawId: string) => invalidSet.has(String(rawId).trim()),
    [invalidSet],
  );

  const clearInvalid = useCallback(() => {
    onClearInvalidHighlight?.();
  }, [onClearInvalidHighlight]);

  const setLabel = useCallback(
    (chatId: string, value: string) => {
      clearInvalid();
      setLabels((prev) => ({ ...prev, [chatId]: value }));
    },
    [clearInvalid],
  );

  const toggleSavedGroup = useCallback(
    (groupId: string) => {
      clearInvalid();
      setSelectedSavedIds((prev) =>
        prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
      );
    },
    [clearInvalid],
  );

  const addExtraGroupRow = useCallback(() => {
    clearInvalid();
    setExtraGroupRows((rows) => [...rows, { key: crypto.randomUUID(), chatId: '', label: '' }]);
  }, [clearInvalid]);

  const updateExtraRow = useCallback(
    (key: string, patch: Partial<{ chatId: string; label: string }>) => {
      clearInvalid();
      setExtraGroupRows((rows) =>
        rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
      );
    },
    [clearInvalid],
  );

  const removeExtraGroupRow = useCallback(
    (key: string) => {
      clearInvalid();
      setExtraGroupRows((rows) => rows.filter((r) => r.key !== key));
    },
    [clearInvalid],
  );

  const scrollFocusKey = useMemo(() => {
    if (!invalidGroupIds?.length) return null;
    for (const chatId of switchListIds) {
      if (invalidSet.has(String(chatId).trim())) return `saved:${chatId}`;
    }
    for (const row of extraGroupRows) {
      if (invalidSet.has(String(row.chatId).trim())) return `extra:${row.key}`;
    }
    return null;
  }, [invalidGroupIds, switchListIds, extraGroupRows, invalidSet]);

  useLayoutEffect(() => {
    if (!scrollFocusKey) return;
    const el = document.querySelector<HTMLElement>('[data-invalid-group-focus="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollFocusKey]);

  useImperativeHandle(
    ref,
    () => ({
      getGroupIds: () => {
        const fromSaved = selectedSavedIds.map((id) => id.trim()).filter(Boolean);
        const fromExtra = extraGroupRows.map((r) => r.chatId.trim()).filter(Boolean);
        return [...new Set([...fromSaved, ...fromExtra])];
      },
      getGroupLabels: () => {
        const ids = new Set<string>();
        const out: Record<string, string> = {};
        for (const id of selectedSavedIds.map((x) => x.trim()).filter(Boolean)) {
          ids.add(id);
          out[id] = (labels[id] ?? '').trim();
        }
        for (const r of extraGroupRows) {
          const cid = r.chatId.trim();
          if (!cid) continue;
          ids.add(cid);
          out[cid] = r.label.trim();
        }
        return out;
      },
    }),
    [extraGroupRows, labels, selectedSavedIds],
  );

  return (
    <Section
      header="Группы"
      footer={
        footer ??
        'У каждой группы укажите название и ID чата в Telegram. Название можно не повторять при следующих событиях — оно сохранится в профиле.'
      }
    >
      {savedGroupsLoading ? (
        <Cell subtitle="Загружаем список…">Сохранённые группы</Cell>
      ) : switchListIds.length === 0 ? (
        <Cell subtitle="Добавьте новую группу ниже — после сохранения она появится здесь">
          Сохранённых групп пока нет
        </Cell>
      ) : (
        switchListIds.map((chatId) => {
          const invalid = isChatInvalid(chatId);
          const focusFirst = scrollFocusKey === `saved:${chatId}`;
          return (
            <div key={chatId} style={{ padding: '6px 16px 10px' }}>
              <div
                className={invalid ? 'event-group-ids-editor__id-highlight' : undefined}
                data-invalid-group-focus={focusFirst ? 'true' : undefined}
              >
                <Text style={{ fontSize: 12, opacity: 0.72 }}>ID: {chatId}</Text>
              </div>
              <Input
                header="Название"
                placeholder="Например: Зал №2, Секция бега"
                value={labels[chatId] ?? ''}
                onChange={(ev) => setLabel(chatId, ev.target.value)}
              />
              <Cell
                subtitle="Включить эту группу в событие"
                after={
                  <Switch
                    checked={selectedSavedIds.includes(chatId)}
                    onChange={() => toggleSavedGroup(chatId)}
                  />
                }
              >
                Участвует
              </Cell>
            </div>
          );
        })
      )}

      {extraGroupRows.map((row, index) => {
        const invalid = isChatInvalid(row.chatId);
        const focusFirst = scrollFocusKey === `extra:${row.key}`;
        return (
          <div key={row.key} style={{ padding: '4px 16px 12px' }}>
            <Text style={{ padding: '0 0 6px', opacity: 0.85 }}>Новая группа ({index + 1})</Text>
            <Input
              header="Название"
              placeholder="Как показывать в списке"
              value={row.label}
              onChange={(ev) => updateExtraRow(row.key, { label: ev.target.value })}
            />
            <div
              style={{ paddingTop: 8 }}
              className={invalid ? 'event-group-ids-editor__id-highlight' : undefined}
              data-invalid-group-focus={focusFirst ? 'true' : undefined}
            >
              <Input
                header="ID чата Telegram"
                placeholder="-1001234567890"
                value={row.chatId}
                onChange={(ev) => updateExtraRow(row.key, { chatId: ev.target.value })}
              />
            </div>
            <div style={{ paddingTop: 8 }}>
              <Button type="button" size="s" mode="bezeled" onClick={() => removeExtraGroupRow(row.key)}>
                Убрать
              </Button>
            </div>
          </div>
        );
      })}

      <div style={{ padding: '8px 16px 12px' }}>
        <Button type="button" size="m" stretched mode="bezeled" onClick={addExtraGroupRow}>
          Добавить группу (название + ID)
        </Button>
      </div>
    </Section>
  );
});
