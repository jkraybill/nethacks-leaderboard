/**
 * Nethacks - Challenge Detail Page
 */

let challengeId = null;
let challengeData = null;
let submissionSort = { field: 'score', direction: 'desc' };

/**
 * Initialize on page load
 */
async function initChallengePage() {
  // Get challenge ID from URL
  const params = new URLSearchParams(window.location.search);
  challengeId = params.get('id');

  if (!challengeId) {
    document.getElementById('challenge-title').textContent = 'Challenge Not Found';
    document.getElementById('submissions-body').innerHTML =
      '<tr><td colspan="7">No challenge ID provided</td></tr>';
    return;
  }

  // Set up sort handlers
  setupSortHandlers();

  // Load challenge data
  await loadChallengeData();
}

/**
 * Load challenge details and submissions
 */
async function loadChallengeData() {
  try {
    challengeData = await getChallengeLeaderboard(challengeId);
    renderChallengeInfo();
    renderSubmissions();
  } catch (error) {
    console.error('Failed to load challenge:', error);
    document.getElementById('challenge-title').textContent = 'Error Loading Challenge';
    document.getElementById('submissions-body').innerHTML =
      `<tr><td colspan="7">Failed to load: ${escapeHtml(error.message)}</td></tr>`;
  }
}

/**
 * Render challenge info header
 */
function renderChallengeInfo() {
  const c = challengeData.challenge;

  document.title = `${c.name} - Nethack Challenge`;
  document.getElementById('challenge-title').textContent = c.name;
  document.getElementById('challenge-subtitle').textContent =
    `${capitalize(c.gender)} ${capitalize(c.race)} ${c.role}`;

  document.getElementById('info-url').textContent = getChallengeDownloadUrl(challengeId);
  document.getElementById('info-class').textContent = c.role;
  document.getElementById('info-race').textContent = capitalize(c.race);
  document.getElementById('info-align').textContent = formatAlignmentFull(c.alignment);
  document.getElementById('info-seed').textContent = c.seed || 'Hidden';

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Render submissions table
 */
function renderSubmissions() {
  const tbody = document.getElementById('submissions-body');

  if (!challengeData.leaderboard || challengeData.leaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="no-results">No submissions yet. Be the first!</td></tr>';
    return;
  }

  // Sort submissions
  let submissions = [...challengeData.leaderboard];
  submissions.sort((a, b) => {
    let aVal = a[submissionSort.field];
    let bVal = b[submissionSort.field];

    if (submissionSort.field === 'submitted_at') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    } else if (submissionSort.field === 'player') {
      aVal = (a.player?.display_name || a.player?.github_username || '').toLowerCase();
      bVal = (b.player?.display_name || b.player?.github_username || '').toLowerCase();
    } else if (submissionSort.field === 'death_reason') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    } else {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }

    if (aVal < bVal) return submissionSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return submissionSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  updateSortIndicators();

  tbody.innerHTML = submissions.map((entry, index) => {
    const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : '';
    return `
      <tr>
        <td><span class="rank ${rankClass}">${entry.rank}</span></td>
        <td>
          <div class="player-cell">
            ${entry.player?.avatar_url ? `<img src="${entry.player.avatar_url}" alt="" class="player-avatar">` : ''}
            <span>${escapeHtml(entry.player?.display_name || entry.player?.github_username || 'Unknown')}</span>
          </div>
        </td>
        <td class="col-score"><strong>${formatNumber(entry.score)}</strong></td>
        <td>${formatNumber(entry.turns)}</td>
        <td>${entry.deepest_level}</td>
        <td>${entry.kills}</td>
        <td class="col-death" title="${escapeHtml(entry.death_reason) || ''}">${escapeHtml(entry.death_reason) || '—'}</td>
        <td>
          <span class="relative-time" title="${formatDateUTC(entry.submitted_at)}">
            ${formatRelativeTime(entry.submitted_at)}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Download this challenge
 */
function downloadThisChallenge() {
  if (challengeId) {
    downloadChallenge(challengeId);
  }
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
 * Copy this challenge's download URL to clipboard
 * The URL includes full server info for decentralized sharing
 */
let lastCopyTime = 0;
function copyThisUrl() {
  if (!challengeId) return;

  // Debounce - prevent double-firing
  const now = Date.now();
  if (now - lastCopyTime < 500) return;
  lastCopyTime = now;

  const url = getChallengeDownloadUrl(challengeId);
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
    // Fallback
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Link copied to clipboard');
  });
}

// ==================== Sorting ====================

let sortHandlersSetup = false;

function setupSortHandlers() {
  if (sortHandlersSetup) return;

  document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (submissionSort.field === field) {
        submissionSort.direction = submissionSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        submissionSort.field = field;
        submissionSort.direction = (field === 'score' || field === 'kills') ? 'desc' : 'asc';
      }
      renderSubmissions();
    });
  });

  sortHandlersSetup = true;
}

function updateSortIndicators() {
  document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === submissionSort.field) {
      th.classList.add(submissionSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ==================== Utility Functions ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

function formatDateUTC(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatAlignmentFull(alignment) {
  if (!alignment) return '?';
  const a = alignment.toLowerCase();
  if (a === 'lawful' || a === 'law') return 'Lawful';
  if (a === 'neutral' || a === 'neu') return 'Neutral';
  if (a === 'chaotic' || a === 'cha') return 'Chaotic';
  return capitalize(alignment);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initChallengePage);
