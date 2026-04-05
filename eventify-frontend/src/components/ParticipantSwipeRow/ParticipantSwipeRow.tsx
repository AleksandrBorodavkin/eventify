import type { FC, PointerEvent, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import './ParticipantSwipeRow.css';

/** Доля ширины строки, на которую выезжает панель действий (80%). */
export const PARTICIPANT_SWIPE_REVEAL_FRACTION = 0.8;

export type ParticipantSwipeRowProps = {
  rowKey: string;
  openRowKey: string | null;
  onOpenRowKey: (key: string | null) => void;
  actions: ReactNode;
  children: ReactNode;
  disabled?: boolean;
};

export const ParticipantSwipeRow: FC<ParticipantSwipeRowProps> = ({
  rowKey,
  openRowKey,
  onOpenRowKey,
  actions,
  children,
  disabled = false,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startClientXRef = useRef(0);
  const startTranslateRef = useRef(0);
  const openRowKeyRef = useRef(openRowKey);
  openRowKeyRef.current = openRowKey;

  const [hostW, setHostW] = useState(0);
  const [translate, setTranslate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const translateRef = useRef(0);

  const revealW = hostW > 0 ? hostW * PARTICIPANT_SWIPE_REVEAL_FRACTION : 0;

  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      setHostW(host.offsetWidth);
    });
    ro.observe(host);
    setHostW(host.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback((t: number, w: number) => {
    if (w <= 0) return 0;
    if (t > 0) return 0;
    if (t < -w) return -w;
    return t;
  }, []);

  useEffect(() => {
    if (draggingRef.current || revealW <= 0) return;
    const open = openRowKey === rowKey;
    setTranslate(open ? -revealW : 0);
  }, [openRowKey, rowKey, revealW]);

  const snapFromDrag = useCallback(
    (finalT: number) => {
      if (revealW <= 0) return;
      const threshold = -revealW / 2;
      if (finalT <= threshold) {
        onOpenRowKey(rowKey);
        setTranslate(-revealW);
      } else {
        if (openRowKeyRef.current === rowKey) {
          onOpenRowKey(null);
        }
        setTranslate(0);
      }
    },
    [revealW, onOpenRowKey, rowKey],
  );

  const onMainPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || revealW <= 0) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    startClientXRef.current = e.clientX;
    startTranslateRef.current = translate;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMainPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled || revealW <= 0) return;
    const dx = e.clientX - startClientXRef.current;
    const next = clamp(startTranslateRef.current + dx, revealW);
    setTranslate(next);
  };

  const onMainPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    snapFromDrag(translateRef.current);
  };

  const onMainPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (revealW > 0) {
      setTranslate(openRowKeyRef.current === rowKey ? -revealW : 0);
    }
  };

  return (
    <div ref={hostRef} className="participantSwipeHost">
      <div
        className="participantSwipeTrack"
        style={{
          transform: `translate3d(${translate}px,0,0)`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="participantSwipeMain"
          style={{ width: hostW > 0 ? hostW : '100%' }}
          onPointerDown={onMainPointerDown}
          onPointerMove={onMainPointerMove}
          onPointerUp={onMainPointerUp}
          onPointerCancel={onMainPointerCancel}
        >
          {children}
        </div>
        <div
          className="participantSwipeActions"
          style={{
            width: revealW > 0 ? revealW : undefined,
            minWidth: revealW > 0 ? revealW : undefined,
            flex: '0 0 auto',
          }}
        >
          {actions}
        </div>
      </div>
    </div>
  );
};
