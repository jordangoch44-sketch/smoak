"use client";

import { useEffect, useState } from "react";
import {
  countUnreadSpecialistInquiryNotifications,
  listSpecialistInquiryNotifications,
  markAllSpecialistInquiryNotificationsRead,
  subscribeSpecialistInquiryNotifications,
  type SpecialistInquiryNotification,
} from "@/lib/inquiry/specialist-inquiry-notifications";

export function useSpecialistInquiryNotifications(
  specialistId: string | null | undefined
) {
  const [notifications, setNotifications] = useState<
    SpecialistInquiryNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function sync() {
      setNotifications(listSpecialistInquiryNotifications(specialistId));
      setUnreadCount(countUnreadSpecialistInquiryNotifications(specialistId));
    }

    sync();
    return subscribeSpecialistInquiryNotifications(sync);
  }, [specialistId]);

  function dismissAll() {
    if (!specialistId) return;
    markAllSpecialistInquiryNotificationsRead(specialistId);
    setNotifications(listSpecialistInquiryNotifications(specialistId));
    setUnreadCount(0);
  }

  return {
    notifications,
    unreadCount,
    latestSummary: notifications.find((n) => !n.read)?.summary ?? null,
    dismissAll,
  };
}
