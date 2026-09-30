import api from "./api";

export const getScholarships = async (params = {}) => {
	const response = await api.get("/scholarships", { params });
	return response.data;
};

export const getScholarshipById = async (id) => {
	const response = await api.get(`/scholarships/${id}`);
	return response.data;
};

export const evaluateProfile = async (profileData) => {
	const response = await api.post("/scholarships/evaluate", profileData);
	return response.data;
};

export const getScholarshipHistory = async (id) => {
	const response = await api.get(`/scholarships/${id}/history`);
	return response.data;
};

export const getScholarshipSuggestions = async (q) => {
	if (!q || !q.trim()) return { success: true, count: 0, data: [] };
	const response = await api.get("/scholarships/suggestions", {
		params: { q: q.trim() },
	});
	return response.data;
};

export const getUserProfile = async () => {
	const response = await api.get("/user/profile");
	return response.data;
};

export const updateUserProfile = async (profileData) => {
	const response = await api.put("/user/profile", profileData);
	return response.data;
};

export const getBookmarks = async () => {
	const response = await api.get("/bookmarks");
	return response.data;
};

export const toggleBookmark = async (scholarshipId) => {
	const response = await api.post(`/bookmarks/${scholarshipId}`);
	return response.data;
};

export const removeBookmark = async (scholarshipId) => {
	const response = await api.delete(`/bookmarks/${scholarshipId}`);
	return response.data;
};
