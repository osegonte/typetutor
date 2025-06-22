// TypeTutor API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// API endpoints
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  stats: `${API_BASE_URL}/stats`,
  saveStats: `${API_BASE_URL}/save-stats`,
  resetStats: `${API_BASE_URL}/reset-stats`,
  uploadPdf: `${API_BASE_URL}/upload-pdf`,
  processText: `${API_BASE_URL}/process-text`,
  pdfSupport: `${API_BASE_URL}/pdf-support`
}

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API call failed for ${url}:`, error)
    throw error
  }
}

console.log(`🔗 TypeTutor API configured for: ${API_BASE_URL}`)
export { API_BASE_URL }
