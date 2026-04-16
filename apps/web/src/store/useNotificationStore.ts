import { create } from "zustand";

type Notification = {
  id: string;
  content: string;
  createdAt: string;
  read?: boolean;
};

type NotificationStore = {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  fetchNotifications: async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();

      set({ notifications: data });
    } catch (err) {
      console.error(err);
    }
  },
}));