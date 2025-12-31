/**
 * Nethacks Leaderboard - Leaderboard Rendering
 */

let leaderboardData = null;
let expandedChallenges = new Set();
let unclaimedSort = { field: 'created_at', direction: 'desc' };
let unclaimedFilter = '';

/**
 * Initialize leaderboard on page load
 */
async function initLeaderboard() {
  // Set up filter listeners
  document.getElementById('filter-class').addEventListener('change', applyFilters);
  document.getElementById('filter-race').addEventListener('change', applyFilters);
  document.getElementById('filter-gender').addEventListener('change', applyFilters);

  // Load initial data
  await loadLeaderboard();
}

/**
 * Load leaderboard data from API
 */
async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7">Loading leaderboard...</td></tr>';

  try {
    const filters = {
      class: document.getElementById('filter-class').value,
      race: document.getElementById('filter-race').value,
      gender: document.getElementById('filter-gender').value
    };

    leaderboardData = await getLeaderboard(filters);
    renderLeaderboard();
    renderUnclaimed();
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Failed to load leaderboard: ${error.message}</td></tr>`;
  }
}

/**
 * Apply filters and reload
 */
function applyFilters() {
  loadLeaderboard();
}

/**
 * Render the main leaderboard table
 */
function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');

  if (!leaderboardData || !leaderboardData.leaderboard.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7">No scores yet. Be the first to submit!</td></tr>';
    return;
  }

  tbody.innerHTML = leaderboardData.leaderboard.map((entry, index) => {
    const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
    const isExpanded = expandedChallenges.has(entry.challenge.challenge_id);

    return `
      <tr data-challenge-id="${entry.challenge.challenge_id}">
        <td class="col-expand">
          <button class="expand-btn" onclick="toggleExpand('${entry.challenge.challenge_id}')">
            ${isExpanded ? '−' : '+'}
          </button>
        </td>
        <td class="col-rank">
          <span class="rank ${rankClass}">${entry.rank}</span>
        </td>
        <td class="col-player">
          <div class="player-cell">
            ${entry.player.avatar_url ? `<img src="${entry.player.avatar_url}" alt="" class="player-avatar">` : ''}
            <span class="player-name">${escapeHtml(entry.player.display_name || entry.player.github_username)}</span>
          </div>
        </td>
        <td class="col-character">
          <a href="#" class="character-link" onclick="showChallengeDetails('${entry.challenge.challenge_id}'); return false;">
            ${escapeHtml(entry.challenge.character_name || 'Challenger')} the ${entry.challenge.role}
          </a>
          <div class="character-class">${entry.challenge.race} ${entry.challenge.role}</div>
        </td>
        <td class="col-details">
          <span class="detail">Dlvl ${entry.deepest_level}</span>
          <span class="detail">${formatNumber(entry.turns)} turns</span>
          <span class="detail">${entry.kills} kills</span>
          ${entry.death_reason ? `<div class="death-reason">${escapeHtml(entry.death_reason)}</div>` : ''}
        </td>
        <td class="col-points">
          <span class="score">${formatNumber(entry.score)}</span>
        </td>
        <td class="col-challenge">
          <button class="btn btn-small" onclick="downloadChallenge('${entry.challenge.challenge_id}')">
            Play
          </button>
        </td>
      </tr>
      ${isExpanded ? `<tr class="expanded-row" id="expanded-${entry.challenge.challenge_id}">
        <td colspan="7">
          <div class="loading">Loading challenge scores...</div>
        </td>
      </tr>` : ''}
    `;
  }).join('');

  // Load expanded challenge data
  expandedChallenges.forEach(challengeId => {
    loadChallengeSubmissions(challengeId);
  });
}

/**
 * Render unclaimed challenges
 */
function renderUnclaimed() {
  const section = document.getElementById('unclaimed-section');
  const tbody = document.getElementById('unclaimed-body');

  if (!leaderboardData || !leaderboardData.unclaimed_challenges.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  // Set up sort click handlers (once)
  setupSortHandlers();

  // Get filtered and sorted data
  let challenges = [...leaderboardData.unclaimed_challenges];

  // Apply filter
  if (unclaimedFilter) {
    const filter = unclaimedFilter.toLowerCase();
    challenges = challenges.filter(c =>
      (c.name || '').toLowerCase().includes(filter) ||
      (c.role || '').toLowerCase().includes(filter) ||
      (c.race || '').toLowerCase().includes(filter) ||
      (c.alignment || '').toLowerCase().includes(filter) ||
      (c.gender || '').toLowerCase().includes(filter)
    );
  }

  // Apply sort
  challenges.sort((a, b) => {
    let aVal = a[unclaimedSort.field] || '';
    let bVal = b[unclaimedSort.field] || '';

    // Handle date sorting
    if (unclaimedSort.field === 'created_at') {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return unclaimedSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return unclaimedSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Update sort indicators
  updateSortIndicators();

  if (challenges.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-results">No matching challenges</td></tr>';
    return;
  }

  tbody.innerHTML = challenges.map(challenge => `
    <tr>
      <td>
        <a href="#" class="challenge-name-link" onclick="showChallengePreview('${challenge.challenge_id}'); return false;">
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
      <td>
        <button class="btn-icon" onclick="downloadChallenge('${challenge.challenge_id}')" title="Download challenge">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Toggle expanded view for a challenge
 */
async function toggleExpand(challengeId) {
  if (expandedChallenges.has(challengeId)) {
    expandedChallenges.delete(challengeId);
  } else {
    expandedChallenges.add(challengeId);
  }
  renderLeaderboard();
}

/**
 * Load submissions for expanded challenge
 */
async function loadChallengeSubmissions(challengeId) {
  const expandedRow = document.getElementById(`expanded-${challengeId}`);
  if (!expandedRow) return;

  try {
    const data = await getChallengeLeaderboard(challengeId);

    expandedRow.innerHTML = `
      <td colspan="7">
        <h4>All scores for "${escapeHtml(data.challenge.name)}"</h4>
        <table class="sub-leaderboard">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Turns</th>
              <th>Level</th>
              <th>Kills</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.leaderboard.map(entry => `
              <tr>
                <td>${entry.rank}</td>
                <td>${escapeHtml(entry.player.display_name || entry.player.github_username)}</td>
                <td>${formatNumber(entry.score)}</td>
                <td>${formatNumber(entry.turns)}</td>
                <td>${entry.deepest_level}</td>
                <td>${entry.kills}</td>
                <td>${formatDate(entry.submitted_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </td>
    `;
  } catch (error) {
    expandedRow.innerHTML = `<td colspan="7">Failed to load: ${error.message}</td>`;
  }
}

/**
 * Show challenge details (could open modal or navigate)
 */
function showChallengeDetails(challengeId) {
  toggleExpand(challengeId);
}

/**
 * Show upload modal
 */
function showUploadModal() {
  if (!currentUser) {
    alert('Please log in to create challenges');
    return;
  }
  document.getElementById('upload-modal').classList.remove('hidden');
}

/**
 * Hide upload modal
 */
function hideUploadModal() {
  document.getElementById('upload-modal').classList.add('hidden');
}

/**
 * Submit new challenge
 */
async function submitChallenge(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById('challenge-name').value,
    description: document.getElementById('challenge-desc').value,
    role: document.getElementById('challenge-role').value,
    race: document.getElementById('challenge-race').value,
    gender: document.getElementById('challenge-gender').value,
    alignment: document.getElementById('challenge-align').value,
    character_name: document.getElementById('challenge-charname').value || 'Challenger'
  };

  try {
    const result = await createChallenge(data);
    alert(`Challenge created! ID: ${result.challenge_id}`);
    hideUploadModal();
    loadLeaderboard();
  } catch (error) {
    alert('Failed to create challenge: ' + error.message);
  }
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
 * Format relative time (e.g., "30 seconds ago", "2 hours ago")
 */
function formatRelativeTime(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return seconds <= 1 ? 'just now' : `${seconds} seconds ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
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
 * Show challenge preview modal with ASCII art
 */
async function showChallengePreview(challengeId) {
  // Find the challenge data
  const challenge = leaderboardData?.unclaimed_challenges?.find(c => c.challenge_id === challengeId)
    || leaderboardData?.leaderboard?.find(e => e.challenge?.challenge_id === challengeId)?.challenge;

  if (!challenge) {
    alert('Challenge not found');
    return;
  }

  // Check if we have ASCII preview stored
  let asciiPreview = challenge.ascii_preview;

  // If no stored preview, generate a placeholder
  if (!asciiPreview) {
    asciiPreview = generatePlaceholderAscii(challenge);
  }

  // Create and show modal
  showAsciiModal(challenge, asciiPreview);
}

/**
 * Generate placeholder ASCII art for challenge preview
 */
function generatePlaceholderAscii(challenge) {
  const name = challenge.character_name || challenge.name || 'Challenger';
  const role = challenge.role || 'Adventurer';
  const race = capitalize(challenge.race) || 'Human';
  const gender = challenge.gender === 'female' ? 'female' : 'male';
  const align = formatAlignment(challenge.alignment);

  // Simple dungeon room representation
  const lines = [
    '                                                                                ',
    '                              ------                                            ',
    '                              |....|                                            ',
    '                              |....+###                                         ',
    '                              |.@..|                                            ',
    '                              ------                                            ',
    '                                                                                ',
    `${name} the ${race} ${role}              St:16 Dx:14 Co:15 In:12 Wi:10 Ch:8`,
    `Dlvl:1  $:0  HP:16(16) Pw:2(2) AC:6  Xp:1/0  T:1                 ${align}      `,
  ];

  return lines.join('\n');
}

/**
 * Show ASCII modal
 */
function showAsciiModal(challenge, asciiContent) {
  // Remove existing modal if any
  const existing = document.getElementById('ascii-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'ascii-modal';
  modal.className = 'ascii-modal';
  modal.innerHTML = `
    <div class="ascii-modal-content">
      <div class="ascii-modal-header">
        <h3>${escapeHtml(challenge.name)}</h3>
        <button class="ascii-modal-close" onclick="closeAsciiModal()">&times;</button>
      </div>
      <div class="ascii-modal-body">
        <pre class="ascii-preview">${escapeHtml(asciiContent)}</pre>
      </div>
      <div class="ascii-modal-footer">
        <span class="ascii-seed">Seed: ${challenge.seed || 'N/A'}</span>
        <button class="btn btn-small" onclick="downloadChallenge('${challenge.challenge_id}'); closeAsciiModal();">
          Download Challenge
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAsciiModal();
  });

  // Close on Escape
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeAsciiModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

/**
 * Close ASCII modal
 */
function closeAsciiModal() {
  const modal = document.getElementById('ascii-modal');
  if (modal) modal.remove();
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
      if (unclaimedSort.field === field) {
        // Toggle direction
        unclaimedSort.direction = unclaimedSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        unclaimedSort.field = field;
        unclaimedSort.direction = 'asc';
      }
      renderUnclaimed();
    });
  });

  sortHandlersSetup = true;
}

/**
 * Update sort indicator arrows on column headers
 */
function updateSortIndicators() {
  document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === unclaimedSort.field) {
      th.classList.add(unclaimedSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

/**
 * Filter unclaimed challenges by search input
 */
function filterUnclaimed() {
  unclaimedFilter = document.getElementById('unclaimed-search').value;
  renderUnclaimed();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLeaderboard);
