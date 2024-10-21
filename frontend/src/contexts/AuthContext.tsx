import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useAlert } from './AlertContext';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const { showAlert } = useAlert();

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { username, password });
      setToken(response.data.token);
      showAlert('Connexion réussie.', 'success');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Échec de la connexion.';
      showAlert(message, 'error');
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      await axiosInstance.post('/auth/register', { username, password });
      showAlert('Inscription réussie. Vous pouvez maintenant vous connecter.', 'success');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Échec de l\'inscription.';
      showAlert(message, 'error');
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    showAlert('Déconnexion réussie.', 'info');
  };

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};
