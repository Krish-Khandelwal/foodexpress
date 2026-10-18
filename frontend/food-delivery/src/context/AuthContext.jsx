import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('userInfo') || localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        setUser(parsed);
        if (parsed?.token) {
          localStorage.setItem('token', parsed.token);
          localStorage.setItem('userInfo', JSON.stringify(parsed));
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error('Failed to parse stored user session:', err);
      localStorage.removeItem('userInfo');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    if (!userData) return;
    localStorage.setItem('userInfo', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};