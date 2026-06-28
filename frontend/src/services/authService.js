import api from "./api";

export const loginUser = async (credentials) => {
  const { data } = await api.post("/auth/login", credentials);
  return data;
};

export const signupUser = async (formData) => {
  const { data } = await api.post("/auth/register", formData);
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const GOOGLE_AUTH_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
}/auth/google`;
