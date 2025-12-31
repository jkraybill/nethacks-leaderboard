/**
 * Nethacks Leaderboard - API Client
 */

// API base URL
const API_BASE = 'https://bnvjt64eva.execute-api.us-east-1.amazonaws.com/prod';

/**
 * Make an API request
 */
async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * Get global leaderboard
 */
async function getLeaderboard(filters = {}) {
  const params = new URLSearchParams();
  if (filters.class) params.set('filter_class', filters.class);
  if (filters.race) params.set('filter_race', filters.race);
  if (filters.gender) params.set('filter_gender', filters.gender);

  const query = params.toString();
  return apiRequest(`/leaderboard${query ? '?' + query : ''}`);
}

/**
 * Get leaderboard for a specific challenge
 */
async function getChallengeLeaderboard(challengeId) {
  return apiRequest(`/leaderboard/${encodeURIComponent(challengeId)}`);
}

/**
 * List all challenges
 */
async function listChallenges() {
  return apiRequest('/challenges');
}

/**
 * Get challenge details
 */
async function getChallenge(challengeId) {
  return apiRequest(`/challenges/${encodeURIComponent(challengeId)}`);
}

/**
 * Download challenge JSON
 */
function downloadChallenge(challengeId) {
  window.location.href = `${API_BASE}/challenges/${encodeURIComponent(challengeId)}/download`;
}

/**
 * Create a new challenge
 */
async function createChallenge(data) {
  return apiRequest('/challenges', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
  return apiRequest('/auth/status');
}

/**
 * Generate API token for game client
 */
async function generateApiToken() {
  return apiRequest('/auth/token', {
    method: 'POST'
  });
}

/**
 * Logout
 */
async function logout() {
  return apiRequest('/auth/logout', {
    method: 'POST'
  });
}

/**
 * Get login URL
 */
function getLoginUrl() {
  return `${API_BASE}/auth/github`;
}
