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
    // Backend ainda não tem endpoint de notificações, 
    // mock silencioso para evitar 404.
    set({ notifications: [] });
  },
}));