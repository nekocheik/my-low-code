import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, VStack, Input, Button, Heading, Text, Link } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async () => {
    try {
      await login(username, password);
      showAlert('Connexion réussie', 'success');
      const origin = (location.state as any)?.from?.pathname || '/';
      navigate(origin);
    } catch (error) {
      showAlert('Échec de la connexion', 'error');
    }
  };

  return (
    <Box maxWidth="400px" margin="auto" mt={8}>
      <VStack spacing={4}>
        <Heading>Connexion</Heading>
        <Input
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleLogin}>
          Se connecter
        </Button>
        <Text>
          Pas encore de compte ?{' '}
          <Link color="blue.500" onClick={() => navigate('/register')}>
            S'inscrire
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};