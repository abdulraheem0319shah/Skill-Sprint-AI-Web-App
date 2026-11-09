import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

const readSavedUser = () => {
  try {
    const saved = localStorage.getItem('skillsprint_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem('skillsprint_user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(readSavedUser);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('skillsprint_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('skillsprint_user');
    }
  }, [currentUser]);

  const login = async (username, password, portal) => {
    try {
      const response = await authService.login(username, password, portal);
      setCurrentUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Unable to sign in. Please try again.',
      };
    }
  };

  const logout = () => setCurrentUser(null);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
