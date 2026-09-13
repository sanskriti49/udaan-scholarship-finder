import api from "./api";

export const scanLinkOrContent = async ({ url = "", text = "" }) => {
  const response = await api.post("/verify/scan", { url, text });
  return response.data;
};

export const getOfficialRegistry = async () => {
  const response = await api.get("/verify/registry");
  return response.data;
};
