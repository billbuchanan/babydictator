import axios from 'axios';
import Logger from '../utils/logger';

const API_BASE_URL = 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false; // Important for CORS
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.timeout = 10000; // 10 second timeout for normal requests

// Create a custom axios instance for long-running operations
const longRunningAxios = axios.create({
  timeout: 35000, // 35 second timeout for decryption
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for logging
axios.interceptors.request.use(request => {
  const requestData = {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  };
  Logger.info('API Request', requestData);

  // Test server availability
  fetch(API_BASE_URL.replace('/api', ''))
    .then(response => Logger.info('Server is reachable', { status: response.status }))
    .catch(error => Logger.error('Server is not reachable', { error }));

  return request;
}, error => {
  Logger.error('Request Setup Error', error);
  return Promise.reject(error);
});

// Add response interceptor for logging
axios.interceptors.response.use(
  response => {
    const responseData = {
      url: response.config.url,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
    Logger.info('API Response', responseData);
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      Logger.error('API Error Response', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        message: error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      Logger.error('API No Response', {
        url: error.config?.url,
        request: error.request,
        message: error.message,
        code: error.code
      });

      // Additional debugging for network errors
      if (error.code === 'ERR_NETWORK') {
        Logger.error('Network Error Details', {
          message: 'Cannot reach the server. Please ensure the Flask server is running and accessible.',
          serverUrl: API_BASE_URL,
          error: error
        });
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      Logger.error('API Request Setup Error', {
        message: error.message,
        error: error
      });
    }
    throw error;
  }
);

export const api = {
  testConnection: async () => {
    try {
      Logger.info('Testing server connection');
      const response = await fetch(API_BASE_URL.replace('/api', ''));
      Logger.info('Server connection test result', { status: response.status });
      return response.ok;
    } catch (error) {
      Logger.error('Server connection test failed', error);
      return false;
    }
  },

  encrypt: async ({ dict_priv, alice_priv, x, cm }) => {
    try {
      Logger.info('Encrypting message', { x, cm });
      
      // Test connection before making the request
      const isConnected = await api.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to server');
      }

      const response = await axios.post(`${API_BASE_URL}/encrypt`, {
        dict_priv,
        alice_priv,
        x,
        cm,
        out: 'cipher.json'
      });
      
      if (!response.data.cipher) {
        throw new Error('No cipher received in response');
      }
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to encrypt message';
      Logger.error('Encryption failed', { error: errorMessage, details: error });
      throw new Error(errorMessage);
    }
  },

  decryptAlice: async ({ alice_priv, cipher }) => {
    try {
      Logger.info('Decrypting message for Alice', { cipher });
      
      // Calculate maximum value for 30-bit integer
      const MAX_30_BIT = Math.pow(2, 30) - 1;
      Logger.info('Using 30-bit max range', { max: MAX_30_BIT });
      
      // Use longRunningAxios for this request
      const response = await longRunningAxios.post(`${API_BASE_URL}/decrypt-alice`, {
        alice_priv,
        cipher,
        max: MAX_30_BIT.toString() // Use full 30-bit range
      });
      
      Logger.info('Alice decryption successful', { 
        responseTime: response.headers['x-response-time'],
        data: response.data 
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to decrypt message';
      Logger.error('Alice decryption failed', { error: errorMessage, details: error });
      throw new Error(errorMessage);
    }
  },

  decryptDictator: async ({ dict_priv, cipher }) => {
    try {
      Logger.info('Decrypting message for Dictator', { cipher });
      
      const response = await axios.post(`${API_BASE_URL}/decrypt-dictator`, {
        dict_priv,
        cipher
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to decrypt message';
      Logger.error('Dictator decryption failed', { error: errorMessage, details: error });
      throw new Error(errorMessage);
    }
  }
}; 