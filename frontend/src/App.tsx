// frontend/src/App.tsx

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { GraphProvider } from './contexts/GraphContext';
import { ModalProvider } from './contexts/ModalContext';
import { CombinedProvider } from './contexts/CombinedContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { ReactFlowProvider } from 'reactflow';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Modals } from './components/Modals';

// Lazy loading des pages
const LoginPage = lazy(() => import('./pages/LoginPage')); // Assurez-vous que LoginPage a un export par défaut
const RegisterPage = lazy(() => import('./pages/RegisterPage')); // Assurez-vous que RegisterPage a un export par défaut
const MainApp = lazy(() => import('./components/MainApp')); // Assurez-vous que MainApp a un export par défaut

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <AuthProvider>
            <ProjectProvider>
              <GraphProvider>
                <ModalProvider>
                  <CombinedProvider>
                    <ErrorBoundary>
                      <ReactFlowProvider>
                        <Router>
                          <Header />
                          <Modals /> {/* Composant Modals placé ici */}
                          <Suspense fallback={<div>Loading...</div>}>
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
                          </Suspense>
                        </Router>
                      </ReactFlowProvider>
                    </ErrorBoundary>
                  </CombinedProvider>
                </ModalProvider>
              </GraphProvider>
            </ProjectProvider>
          </AuthProvider>
        </AlertProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

export default React.memo(App);
