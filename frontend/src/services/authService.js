import api from "./api";

export const loginUser = async (credentials) => {
  const { data } = await api.post("/auth/login", credentials);
  return data;
};

export const signupUser = async (formData) => {
  const { data } = await api.post("/auth/register", formData);
  return data;
};
