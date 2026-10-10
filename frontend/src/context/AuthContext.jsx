import { createContext, useState, useEffect } from "react";
import { loginUser, signupUser, googleAuth } from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser && localStorage.getItem("token") ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser && localStorage.getItem("token")) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    window.addEventListener("auth-changed", syncUser);
    const syncStorage = (event) => {
      if (event.key === "user" || event.key === "token" || event.key === null) syncUser();
    };
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("auth-changed", syncUser);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const login = async (credentials) => {
    const { user, token } = await loginUser(credentials);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const signup = async (formData) => {
    const { user, token } = await signupUser(formData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const loginWithGoogle = async (credential) => {
    const { user, token } = await googleAuth(credential);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
};
