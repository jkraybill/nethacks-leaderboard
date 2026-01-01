/**
 * Nethacks - Challenge Leaderboard
 */

let challengesData = null;
let challengeSort = { field: 'created_at', direction: 'desc' };
let challengeFilter = '';

/**
 * Initialize on page load
 */
async function initLeaderboard() {
  // Set up filter listeners
  document.getElementById('filter-class').addEventListener('change', applyFilters);
  document.getElementById('filter-race').addEventListener('change', applyFilters);
  document.getElementById('filter-gender').addEventListener('change', applyFilters);

  // Set up sort handlers
  setupSortHandlers();

  // Load initial data
  await loadChallenges();
}

/**
 * Load challenges data from API
 */
async function loadChallenges() {
  const tbody = document.getElementById('challenges-body');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="9">Loading challenges...</td></tr>';

  try {
    // Get all challenges and leaderboard data
    challengesData = await getLeaderboard({});
    renderChallenges();
  } catch (error) {
    console.error('Failed to load challenges:', error);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="9">Failed to load: ${error.message}</td></tr>`;
  }
}

/**
 * Apply dropdown filters and reload
 */
function applyFilters() {
  renderChallenges();
}

/**
 * Render the main challenges table
 */
function renderChallenges() {
  const tbody = document.getElementById('challenges-body');

  if (!challengesData) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="9">Loading...</td></tr>';
    return;
  }

  // Build unified list: challenges with their top score (if any)
  let challenges = buildChallengeList();

  // Apply dropdown filters
  const classFilter = document.getElementById('filter-class').value.toLowerCase();
  const raceFilter = document.getElementById('filter-race').value.toLowerCase();
  const genderFilter = document.getElementById('filter-gender').value.toLowerCase();

  if (classFilter) {
    challenges = challenges.filter(c => (c.role || '').toLowerCase() === classFilter);
  }
  if (raceFilter) {
    challenges = challenges.filter(c => (c.race || '').toLowerCase() === raceFilter);
  }
  if (genderFilter) {
    challenges = challenges.filter(c => (c.gender || '').toLowerCase() === genderFilter);
  }

  // Apply text filter
  if (challengeFilter) {
    const filter = challengeFilter.toLowerCase();
    challenges = challenges.filter(c =>
      (c.name || '').toLowerCase().includes(filter) ||
      (c.role || '').toLowerCase().includes(filter) ||
      (c.race || '').toLowerCase().includes(filter) ||
      (c.alignment || '').toLowerCase().includes(filter) ||
      (c.champion || '').toLowerCase().includes(filter)
    );
  }

  // Apply sort
  challenges.sort((a, b) => {
    let aVal = a[challengeSort.field];
    let bVal = b[challengeSort.field];

    // Handle special cases
    if (challengeSort.field === 'created_at') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    } else if (challengeSort.field === 'best_score') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return challengeSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return challengeSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Update sort indicators
  updateSortIndicators();

  if (challenges.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="no-results">No challenges found</td></tr>';
    return;
  }

  tbody.innerHTML = challenges.map(challenge => `
    <tr>
      <td>
        <a href="challenge.html?id=${challenge.challenge_id}" class="challenge-name-link">
          <strong>${escapeHtml(challenge.name)}</strong>
        </a>
      </td>
      <td>${escapeHtml(challenge.role)}</td>
      <td>${formatGender(challenge.gender)}</td>
      <td>${capitalize(challenge.race)}</td>
      <td>${formatAlignment(challenge.alignment)}</td>
      <td>
        <span class="relative-time" title="${formatDateUTC(challenge.created_at)}">
          ${formatRelativeTime(challenge.created_at)}
        </span>
      </td>
      <td class="col-score">
        ${challenge.best_score ? formatNumber(challenge.best_score) : '<span class="unclaimed">—</span>'}
      </td>
      <td class="col-champion">
        ${challenge.champion ? escapeHtml(challenge.champion) : '<span class="unclaimed">Be first!</span>'}
      </td>
      <td class="actions-cell">
        <button class="btn-icon" onclick="copyUrl('${challenge.challenge_id}')" title="Copy download URL">
          <i data-lucide="link" class="icon-sm"></i>
        </button>
        <button class="btn-icon" onclick="downloadChallenge('${challenge.challenge_id}')" title="Download challenge">
          <i data-lucide="download" class="icon-sm"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Build unified challenge list with top scores
 */
function buildChallengeList() {
  const challengeMap = new Map();

  // Add unclaimed challenges
  if (challengesData.unclaimed_challenges) {
    challengesData.unclaimed_challenges.forEach(c => {
      challengeMap.set(c.challenge_id, {
        ...c,
        best_score: null,
        champion: null
      });
    });
  }

  // Add challenges from leaderboard entries (with scores)
  if (challengesData.leaderboard) {
    challengesData.leaderboard.forEach(entry => {
      const c = entry.challenge;
      const existing = challengeMap.get(c.challenge_id);

      if (!existing || (entry.score > (existing.best_score || 0))) {
        challengeMap.set(c.challenge_id, {
          challenge_id: c.challenge_id,
          name: c.name,
          role: c.role,
          race: c.race,
          gender: c.gender,
          alignment: c.alignment,
          created_at: c.created_at,
          best_score: entry.score,
          champion: entry.player?.display_name || entry.player?.github_username || 'Unknown'
        });
      }
    });
  }

  return Array.from(challengeMap.values());
}

// ==================== Sorting & Filtering ====================

let sortHandlersSetup = false;

/**
 * Set up click handlers for sortable columns
 */
function setupSortHandlers() {
  if (sortHandlersSetup) return;

  document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (challengeSort.field === field) {
        challengeSort.direction = challengeSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        challengeSort.field = field;
        challengeSort.direction = field === 'best_score' ? 'desc' : 'asc';
      }
      renderChallenges();
    });
  });

  sortHandlersSetup = true;
}

/**
 * Update sort indicator arrows
 */
function updateSortIndicators() {
  document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === challengeSort.field) {
      th.classList.add(challengeSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

/**
 * Filter challenges by search input
 */
function filterChallenges() {
  challengeFilter = document.getElementById('challenge-search').value;
  renderChallenges();
}

// ==================== Utility Functions ====================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

/**
 * Format ISO date to readable format
 */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format ISO date to UTC string for tooltip
 */
function formatDateUTC(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Format relative time
 */
function formatRelativeTime(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return seconds <= 1 ? 'just now' : `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Format gender to M/F
 */
function formatGender(gender) {
  if (!gender) return '?';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return 'M';
  if (g === 'female' || g === 'f') return 'F';
  return '?';
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format alignment to short form
 */
function formatAlignment(alignment) {
  if (!alignment) return '?';
  const a = alignment.toLowerCase();
  if (a === 'lawful' || a === 'law') return 'Law';
  if (a === 'neutral' || a === 'neu') return 'Neu';
  if (a === 'chaotic' || a === 'cha') return 'Cha';
  return capitalize(alignment.slice(0, 3));
}

/**
 * Show a toast notification
 */
function showToast(message) {
  // Create container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Copy challenge download URL to clipboard
 * The URL includes full server info for decentralized sharing
 */
function copyUrl(challengeId) {
  const url = getChallengeDownloadUrl(challengeId);
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard');
    // Brief visual feedback on button
    const btn = event.currentTarget;
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback: select text in a temporary input
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Link copied to clipboard');
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLeaderboard);
