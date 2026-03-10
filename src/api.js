import axios from 'axios';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

// Step 1: Set the Base URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.kumarancoffeecorner.tech/api';

const API = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Step 2: SignalR Hub Connection Logic
export const hubConnection = new HubConnectionBuilder()
    .withUrl(BASE_URL.replace('/api', '/orderHub'))
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();

// Step 3: Image URL Helper
export const getImageUrl = (path) => {
    if (!path) return '/placeholder.png';
    if (path.startsWith('http')) return path;

    const serverRoot = BASE_URL.replace('/api', '');
    return `${serverRoot}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Step 4: Request Interceptor (UPDATED TO FIX CLOUDINARY CORS)
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        const isExternal = config.url.startsWith('http') && !config.url.includes('kumarancoffeecorner.tech');

        if (token && !isExternal) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ============================================================
// API ENDPOINTS
// ============================================================

// Auth APIs
export const login = (credentials) => API.post('/auth/login', credentials);

// Menu (Product) APIs
export const fetchMenu = () => API.get('/menu');
export const addMenu = (data) => API.post('/menu', data);
export const updateMenu = (id, data) => API.put(`/menu/${id}`, data);
export const deleteMenu = (id) => API.delete(`/menu/${id}`);

// Branch APIs
export const fetchBranches = () => API.get('/branch');
export const addBranch = (data) => API.post('/branch', data);
export const updateBranch = (id, data) => API.put(`/branch/${id}`, data);
export const deleteBranch = (id) => API.delete(`/branch/${id}`);

// Order APIs
export const broadcastOrder = (id) => API.patch(`/Order/${id}/broadcast`);

export default API;


// import axios from 'axios';
// import { HubConnectionBuilder } from '@microsoft/signalr';

// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5054/api';

// const API = axios.create({
//     baseURL: BASE_URL
// });

// export const hubConnection = new HubConnectionBuilder()
//     .withUrl(BASE_URL.replace('/api', '/orderHub'))
//     .withAutomaticReconnect()
//     .build();

// export const getImageUrl = (path) => {
//     if (!path) return '/placeholder.png';
//     if (path.startsWith('http')) return path;

//     // 🔥 This part is critical for images to load on mobile
//     const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5054/api').replace('/api', '');
//     return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
// };

// // Add Interceptor to attach JWT token
// API.interceptors.request.use(async (config) => {
//     const token = localStorage.getItem('token');

//     // Internal check fix
//     const isInternal = !config.url.startsWith('http') || config.url.startsWith(config.baseURL);

//     if (token && isInternal) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// }, (error) => {
//     return Promise.reject(error);
// });

// // 🔥 ADD LOGIN API 
// export const login = (credentials) => API.post('/auth/login', credentials);

// // Menu (Product) APIs
// export const fetchMenu = () => API.get('/menu');
// export const addMenu = (data) => API.post('/menu', data);
// export const updateMenu = (id, data) => API.put(`/menu/${id}`, data);
// export const deleteMenu = (id) => API.delete(`/menu/${id}`);

// // Branch APIs
// export const fetchBranches = () => API.get('/branch');
// export const addBranch = (data) => API.post('/branch', data);
// export const updateBranch = (id, data) => API.put(`/branch/${id}`, data);
// export const deleteBranch = (id) => API.delete(`/branch/${id}`);

// // Order APIs
// export const broadcastOrder = (id) => API.patch(`/Order/${id}/broadcast`);

// export default API;