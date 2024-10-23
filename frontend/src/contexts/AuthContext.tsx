// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import axiosInstance from '../axiosInstance';
import { useAlert } from './AlertContext';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  // Ajoutez d'autres propriétés si nécessaire
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showAlert } = useAlert();

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { username, password });
      // Supposons que le token est stocké dans localStorage
      localStorage.setItem('token', response.data.token);
      setIsAuthenticated(true);
      showAlert('Connexion réussie.', 'success');
    } catch (error: any) {
      console.error('Failed to login:', error);
      showAlert(error.response?.data?.message || 'Échec de la connexion.', 'error');
      throw error;
    }
  }, [showAlert]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    showAlert('Déconnexion réussie.', 'info');
  }, [showAlert]);

  useEffect(() => {
    // Vérifiez si le token est présent lors du chargement initial
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    // Ajoutez d'autres fonctions ou propriétés si nécessaire
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
