import api from "./api";

export const getNotifications = async (params = {}) => {
	const response = await api.get("/notifications", { params });
	return response.data;
};

export const getUnreadCount = async () => {
	const response = await api.get("/notifications/unread-count");
	return response.data;
};

export const markAsRead = async (id) => {
	const response = await api.patch(`/notifications/${id}/read`);
	return response.data;
};

export const markAllAsRead = async () => {
	const response = await api.post("/notifications/mark-all-read");
	return response.data;
};

export const deleteNotification = async (id) => {
	const response = await api.delete(`/notifications/${id}`);
	return response.data;
};

export const getPreferences = async () => {
	const response = await api.get("/notifications/preferences");
	return response.data;
};

export const updatePreferences = async (preferences) => {
	const response = await api.put("/notifications/preferences", preferences);
	return response.data;
};

export const sendTestNotification = async () => {
	const response = await api.post("/notifications/test");
	return response.data;
};
