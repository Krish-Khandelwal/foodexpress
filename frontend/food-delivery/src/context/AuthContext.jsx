import React, { createContext, useState, useEffect, useContext } from 'react';
import { googleAuthLogin } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('userInfo');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      }
    } catch (error) {
      console.error('Failed to parse stored userInfo:', error);
      localStorage.removeItem('userInfo');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    if (userData?.token) {
      localStorage.setItem('token', userData.token);
    }
    setUser(userData);
  };

  const googleLogin = async ({ name, email, credential }) => {
    const { data } = await googleAuthLogin({ name, email, credential });
    login(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        googleLogin,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;