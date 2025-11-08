// Load dashboard stats
async function loadDashboard() {
  try {
    // Get sync status
    const statusRes = await fetch('/api/sync/status');
    const status = await statusRes.json();

    document.getElementById('message-count').textContent = status.messageCount;
    document.getElementById('draft-count').textContent = status.draftCount;
    document.getElementById('sync-schedule').textContent = status.schedule;

    if (status.lastSyncTime) {
      const date = new Date(status.lastSyncTime);
      document.getElementById('last-sync').textContent = date.toLocaleString();
    }

    // Get published count
    const postsRes = await fetch('/api/blog/posts?status=PUBLISHED');
    const posts = await postsRes.json();
    document.getElementById('published-count').textContent = posts.posts.length;
  } catch (error) {
    showAlert('Failed to load dashboard', 'danger');
  }
}

// Manual sync
document.getElementById('manual-sync-btn').addEventListener('click', async () => {
  try {
    showAlert('Syncing messages...', 'info');
    const res = await fetch('/api/sync/trigger', { method: 'POST' });
    const data = await res.json();

    showAlert(`Synced ${data.result.messagesAdded} messages`, 'success');
    loadDashboard();
  } catch (error) {
    showAlert('Sync failed', 'danger');
  }
});

// Manual generate
document.getElementById('manual-generate-btn').addEventListener('click', async () => {
  try {
    showAlert('Generating drafts...', 'info');
    const res = await fetch('/api/sync/generate', { method: 'POST' });
    const data = await res.json();

    showAlert(`Created ${data.result.draftsCreated} drafts`, 'success');
    loadDashboard();
  } catch (error) {
    showAlert('Generation failed', 'danger');
  }
});

// Show alert helper
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alert-container').appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Load on page load
loadDashboard();
