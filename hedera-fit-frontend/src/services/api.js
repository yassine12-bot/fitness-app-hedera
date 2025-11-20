import axios from 'axios';

// URL de ton backend
const API_URL = 'http://localhost:3000';

// Créer une instance axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: Ajouter automatiquement le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🎯 TOUTES LES FONCTIONS POUR APPELER LE BACKEND
export default {
  
  // ============ AUTH ============
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  
  // ============ CHALLENGES ============
  getChallenges: () => api.get('/api/challenges'),
  joinChallenge: (id) => api.post(`/api/challenges/${id}/join`),
  getMyProgress: () => api.get('/api/challenges/user/progress'),
  getMyHistory: () => api.get('/api/challenges/user/history'),
  
  // ============ STORE ============
  getProducts: () => api.get('/api/marketplace/products'),
  purchase: (productId, quantity = 1) => 
    api.post('/api/marketplace/purchase', { productId, quantity }),
  getMyPurchases: () => api.get('/api/marketplace/purchases'),
  getReceipt: (purchaseId) => api.get(`/api/marketplace/receipt/${purchaseId}`),
  
  // ============ SIMULATEUR ============
  addSteps: (steps) => api.post('/api/shoes/manual-steps', { steps }),
  
  // ============ LEADERBOARD ============
  getLeaderboard: (sort = 'badges') => api.get(`/api/leaderboard?sort=${sort}`),
  getMyPosition: (userId) => api.get(`/api/leaderboard/user/${userId}`),
  
  // ============ COMMUNITY ============
  getPosts: () => api.get('/api/posts'),
  createPost: (formData) => api.post('/api/posts', formData),
  likePost: (postId) => api.post('/api/likes', { postId }),
  addComment: (postId, text) => api.post('/api/comments', { postId, text }),
  
  // ============ ADMIN HCS ============
  getHCSTopics: () => api.get('/api/admin/hcs/topics'),
  getHCSMessages: (topicId, filters = {}) => 
    api.get(`/api/admin/hcs/messages/${topicId}`, { params: filters }),
}; 