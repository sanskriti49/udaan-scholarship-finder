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
