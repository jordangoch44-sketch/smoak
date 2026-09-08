"use client";

import { useCallback, useId, useRef, useState, type PointerEvent } from "react";
import { InquiryAvatar } from "./InquiryAvatar";
import { cn } from "@/lib/utils";

export interface InquiryInboxRow {
  id: string;
  name: string;
  avatarUrl: string;
  preview: string;
  time: string;
  unread: boolean;
  topicLabels?: string[];
}

interface InquiryConversationListProps {
  rows: InquiryInboxRow[];
  onSelect: (id: string) => void;
  swipeActions?: boolean;
  onViewProfile?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const SWIPE_OPEN_PX = 168;
const SWIPE_SNAP_PX = 56;

export function InquiryConversationList({
  rows,
  onSelect,
  swipeActions = false,
  onViewProfile,
  onDelete,
}: InquiryConversationListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="inquiry-inbox-list">
      {rows.map((row) => (
        <li key={row.id}>
          {swipeActions ? (
            <InquirySwipeRow
              row={row}
              open={openId === row.id}
              onOpenChange={(next) => setOpenId(next ? row.id : null)}
              onSelect={() => onSelect(row.id)}
              onViewProfile={() => onViewProfile?.(row.id)}
              onDelete={() => onDelete?.(row.id)}
            />
          ) : (
            <button
              type="button"
              className={cn(
                "smoac-control inquiry-inbox-row",
                row.unread && "inquiry-inbox-row--unread"
              )}
              onClick={() => onSelect(row.id)}
            >
              <InquiryRowContent row={row} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function InquiryRowContent({ row }: { row: InquiryInboxRow }) {
  return (
    <>
      <InquiryAvatar name={row.name} src={row.avatarUrl} size="md" />
      <span className="inquiry-inbox-row__copy">
        <span className="inquiry-inbox-row__top">
          <span className="inquiry-inbox-row__name">{row.name}</span>
          <span className="inquiry-inbox-row__time">{row.time}</span>
        </span>
        {row.preview ? (
          <span className="inquiry-inbox-row__preview">{row.preview}</span>
        ) : null}
      </span>
      {row.unread ? (
        <span className="inquiry-inbox-row__dot" aria-label="Unread" />
      ) : null}
    </>
  );
}

function InquirySwipeRow({
  row,
  open,
  onOpenChange,
  onSelect,
  onViewProfile,
  onDelete,
}: {
  row: InquiryInboxRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onViewProfile: () => void;
  onDelete: () => void;
}) {
  const labelId = useId();
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const axisLocked = useRef<"x" | "y" | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const [draggingNow, setDraggingNow] = useState(false);
  const revealed = draggingNow ? offset : open ? -SWIPE_OPEN_PX : 0;

  const settle = useCallback(
    (nextOffset: number) => {
      if (nextOffset <= -SWIPE_SNAP_PX) {
        setOffset(-SWIPE_OPEN_PX);
        onOpenChange(true);
      } else {
        setOffset(0);
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging.current = true;
    axisLocked.current = null;
    startX.current = event.clientX;
    startY.current = event.clientY;
    setOffset(open ? -SWIPE_OPEN_PX : 0);
    setDraggingNow(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLocked.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axisLocked.current === "y") return;
    }
    if (axisLocked.current !== "x") return;
    event.preventDefault();
    const base = open ? -SWIPE_OPEN_PX : 0;
    setOffset(Math.min(0, Math.max(-SWIPE_OPEN_PX, base + dx)));
  }

  function endPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    setDraggingNow(false);
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    const wasHorizontal = axisLocked.current === "x";
    axisLocked.current = null;
    if (wasHorizontal) {
      suppressClick.current = true;
      settle(open ? -SWIPE_OPEN_PX + dx : dx);
      return;
    }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      if (open) {
        suppressClick.current = true;
        onOpenChange(false);
      }
    }
  }

  return (
    <div className={cn("inquiry-inbox-swipe", open && "inquiry-inbox-swipe--open")}>
      <div className="inquiry-inbox-swipe__actions" aria-hidden={!open}>
        <button
          type="button"
          className="smoac-control inquiry-inbox-swipe__action inquiry-inbox-swipe__action--profile"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onOpenChange(false);
            onViewProfile();
          }}
        >
          View Profile
        </button>
        <button
          type="button"
          className="smoac-control inquiry-inbox-swipe__action inquiry-inbox-swipe__action--delete"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onOpenChange(false);
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
      <button
        type="button"
        className={cn(
          "smoac-control inquiry-inbox-row inquiry-inbox-swipe__front",
          row.unread && "inquiry-inbox-row--unread",
          draggingNow && "inquiry-inbox-swipe__front--dragging"
        )}
        style={{ transform: `translate3d(${revealed}px, 0, 0)` }}
        aria-labelledby={labelId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            suppressClick.current = false;
            return;
          }
          if (open) {
            onOpenChange(false);
            return;
          }
          onSelect();
        }}
      >
        <span id={labelId} className="sr-only">
          {row.name}
        </span>
        <InquiryRowContent row={row} />
      </button>
    </div>
  );
}
