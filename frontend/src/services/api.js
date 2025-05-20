import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(`${API_URL}/upload-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

export const processText = async (text) => {
  try {
    const response = await axios.post(`${API_URL}/process-text`, { text });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

export const getStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};

export const saveStats = async (sessionData) => {
  try {
    const response = await axios.post(`${API_URL}/save-stats`, sessionData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error');
  }
};