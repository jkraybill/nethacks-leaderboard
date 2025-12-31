/**
 * Nethacks Leaderboard - Leaderboard Rendering
 */

let leaderboardData = null;
let expandedChallenges = new Set();

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

  tbody.innerHTML = leaderboardData.unclaimed_challenges.map(challenge => `
    <tr>
      <td>
        <strong>${escapeHtml(challenge.name)}</strong>
      </td>
      <td>
        ${escapeHtml(challenge.character_name || 'Challenger')}
        (${challenge.race} ${challenge.role})
      </td>
      <td>${formatDate(challenge.created_at)}</td>
      <td>
        <button class="btn btn-small" onclick="downloadChallenge('${challenge.challenge_id}')">
          Play
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLeaderboard);
