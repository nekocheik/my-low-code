import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000', // URL de base de l'API backend
});

export default axiosInstance;