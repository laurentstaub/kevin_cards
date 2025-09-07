// ApiClient Module - Centralized API communication
const ApiClient = (function() {
  
  // Private configuration
  const BASE_URL = '/api';
  
  // Private request function
  const request = async function(endpoint, method = 'GET', data = null, requestOptions = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const fetchOptions = {
      ...requestOptions, // Merge incoming options
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers || {}), // Merge headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data);
    }

    // Show loading for non-GET requests (unless explicitly disabled)
    const showLoading = method !== 'GET' && !requestOptions.skipLoading;
    if (showLoading) {
      UIHelpers.loading(true);
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        // Handle 304 Not Modified as success for PATCH requests
        if (response.status === 304 && method === 'PATCH') {
          return { success: true, notModified: true };
        }
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (!text.trim()) {
          // Empty response, return empty object
          return {};
        }
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'Response text:', text);
          throw new Error('Invalid JSON response from server');
        }
      } else {
        // Non-JSON response
        return { success: true, data: await response.text() };
      }
      
    } catch (error) {
      // Show error toast for failed requests
      UIHelpers.toast(error.message || 'Erreur de communication avec le serveur', 'error');
      throw error;
    } finally {
      // Always hide loading (if we showed it)
      if (showLoading) {
        UIHelpers.loading(false);
      }
    }
  };

  // Public API
  return {
    // Basic HTTP methods
    get: function(endpoint, options) {
      return request(endpoint, 'GET', null, options);
    },
    
    post: function(endpoint, data, options) {
      return request(endpoint, 'POST', data, options);
    },
    
    put: function(endpoint, data, options) {
      return request(endpoint, 'PUT', data, options);
    },
    
    patch: function(endpoint, data, options) {
      return request(endpoint, 'PATCH', data, options);
    },
    
    delete: function(endpoint, options) {
      return request(endpoint, 'DELETE', null, options);
    },

    // Convenience methods for common operations
    questions: {
      getAll: function(params = {}) {
        const searchParams = new URLSearchParams(params);
        return request(`/questions?${searchParams}`, 'GET');
      },
      
      getById: function(id) {
        return request(`/questions/${id}`, 'GET');
      },
      
      create: function(questionData) {
        return request('/questions', 'POST', questionData);
      },
      
      update: function(id, questionData) {
        return request(`/questions/${id}`, 'PUT', questionData);
      },
      
      toggle: function(id) {
        return request(`/questions/${id}/toggle`, 'PATCH', null, { skipLoading: true });
      },
      
      delete: function(id) {
        return request(`/questions/${id}`, 'DELETE');
      }
    },

    tags: {
      getAll: function() {
        return request('/tags', 'GET');
      },
      
      getById: function(id) {
        return request(`/tags/${id}`, 'GET');
      },
      
      create: function(tagData) {
        return request('/tags', 'POST', tagData);
      },
      
      update: function(id, tagData) {
        return request(`/tags/${id}`, 'PUT', tagData);
      },
      
      delete: function(id) {
        return request(`/tags/${id}`, 'DELETE');
      }
    }
  };
})();
