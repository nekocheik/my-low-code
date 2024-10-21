// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { GraphProvider } from './contexts/GraphContext';
import { CombinedProvider } from './contexts/CombinedContext';
import { ModalProvider } from './contexts/ModalContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainApp } from './components/MainApp';
import { Header } from './components/Header';
import { ReactFlowProvider } from 'reactflow';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <AlertProvider>
        <AuthProvider>
          <ProjectProvider> {/* ProjectProvider enveloppe GraphProvider */}
            <GraphProvider> {/* GraphProvider dépend de ProjectProvider */}
              <CombinedProvider> {/* CombinedProvider dépend de GraphProvider */}
                <ErrorBoundary>
                  <ModalProvider>
                    <ReactFlowProvider>
                      <Router>
                        <Header />
                        <Routes>
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <MainApp />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Router>
                    </ReactFlowProvider>
                  </ModalProvider>
                </ErrorBoundary>
              </CombinedProvider>
            </GraphProvider>
          </ProjectProvider>
        </AuthProvider>
      </AlertProvider>
    </ChakraProvider>
  );
};

export default App;
