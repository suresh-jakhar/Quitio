import axios, { AxiosInstance } from 'axios';

const httpClient: AxiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('HTTP client error:', error.message);
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
);

export default httpClient;
