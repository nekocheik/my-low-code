// frontend/src/components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { Box, Text } from '@chakra-ui/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    // Vous pouvez également envoyer les erreurs à un service de reporting
  }

  render() {
    if (this.state.hasError) {
      console.log('Error:', this.state.error);
      return (
        <Box p={5}>
          <Text fontSize="xl" color="red.500">Quelque chose s'est mal passé.</Text>
          <Text>{this.state.error?.message}</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
