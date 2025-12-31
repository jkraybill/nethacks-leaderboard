/**
 * Nethacks Leaderboard - Authentication Handling
 */

let currentUser = null;

/**
 * Initialize authentication on page load
 */
async function initAuth() {
  // Check URL params for login result
  const params = new URLSearchParams(window.location.search);

  if (params.get('login') === 'success') {
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (params.get('error')) {
    alert('Login failed: ' + params.get('error'));
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Check authentication status
  try {
    const status = await checkAuthStatus();
    if (status.authenticated) {
      currentUser = status.user;
      showUserInfo();
    } else {
      hideUserInfo();
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    hideUserInfo();
  }
}

/**
 * Handle login button click
 */
function handleLogin() {
  window.location.href = getLoginUrl();
}

/**
 * Handle logout button click
 */
async function handleLogout() {
  try {
    await logout();
    currentUser = null;
    hideUserInfo();
    location.reload();
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

/**
 * Show user info in header
 */
function showUserInfo() {
  if (!currentUser) return;

  const userInfo = document.getElementById('user-info');
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-name');
  const loginBtn = document.getElementById('btn-login');

  avatar.src = currentUser.avatar_url;
  name.textContent = currentUser.display_name || currentUser.github_username;

  userInfo.classList.remove('hidden');
  loginBtn.classList.add('hidden');
}

/**
 * Hide user info
 */
function hideUserInfo() {
  const userInfo = document.getElementById('user-info');
  const loginBtn = document.getElementById('btn-login');

  userInfo.classList.add('hidden');
  loginBtn.classList.remove('hidden');
}

/**
 * Generate and display API token
 */
async function generateToken() {
  if (!currentUser) {
    alert('Please log in first');
    return;
  }

  try {
    const result = await generateApiToken();
    showTokenModal(result.token);
  } catch (error) {
    alert('Failed to generate token: ' + error.message);
  }
}

/**
 * Show token modal
 */
function showTokenModal(token) {
  const modal = document.getElementById('token-modal');
  const tokenValue = document.getElementById('token-value');
  tokenValue.textContent = token;
  modal.classList.remove('hidden');
}

/**
 * Hide token modal
 */
function hideTokenModal() {
  const modal = document.getElementById('token-modal');
  modal.classList.add('hidden');
}

/**
 * Copy token to clipboard
 */
function copyToken() {
  const tokenValue = document.getElementById('token-value');
  navigator.clipboard.writeText(tokenValue.textContent).then(() => {
    alert('Token copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy. Please select and copy manually.');
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAuth);
