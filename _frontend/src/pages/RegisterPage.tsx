import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, Input, Button, Heading, Text, Link, useToast } from '@chakra-ui/react';
import axios from '../axiosInstance';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async () => {
    if (!username || !password) {
      toast({
        title: "Erreur",
        description: "Nom d'utilisateur et mot de passe requis.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('/auth/register', { username, password });
      toast({
        title: "Inscription réussie",
        description: response.data.message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.response?.data?.message || "Une erreur est survenue lors de l'inscription.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box maxWidth="400px" margin="auto" mt={8}>
      <VStack spacing={4}>
        <Heading>Inscription</Heading>
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
        <Button colorScheme="green" onClick={handleRegister} isLoading={isSubmitting}>
          S'inscrire
        </Button>
        <Text>
          Déjà un compte ?{' '}
          <Link color="blue.500" onClick={() => navigate('/login')}>
            Se connecter
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};