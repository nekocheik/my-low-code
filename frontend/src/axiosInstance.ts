import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


axiosInstance.interceptors.response.use(
  (response) => {
    // Si le serveur renvoie des données compressées, décompressez-les ici
    if (response.headers['content-encoding'] === 'gzip') {
      // Décompresser les données
      // Note : Axios ne supporte pas directement la décompression, donc assurez-vous que le serveur renvoie des données décompressées ou utilisez une bibliothèque supplémentaire
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Vous pouvez ajouter une logique ici pour gérer les erreurs globales
    return Promise.reject(error);
  }
);

export default axiosInstance;