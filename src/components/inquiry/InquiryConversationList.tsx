"use client";

import { InquiryAvatar } from "./InquiryAvatar";
import { cn } from "@/lib/utils";

export interface InquiryInboxRow {
  id: string;
  name: string;
  avatarUrl: string;
  preview: string;
  time: string;
  unread: boolean;
}

interface InquiryConversationListProps {
  rows: InquiryInboxRow[];
  onSelect: (id: string) => void;
}

export function InquiryConversationList({
  rows,
  onSelect,
}: InquiryConversationListProps) {
  return (
    <ul className="inquiry-inbox-list">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            className={cn(
              "smoac-control inquiry-inbox-row",
              row.unread && "inquiry-inbox-row--unread"
            )}
            onClick={() => onSelect(row.id)}
          >
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
          </button>
        </li>
      ))}
    </ul>
  );
}
