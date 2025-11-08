let currentEditId = null;
let editModal = null;

// Load drafts
async function loadDrafts() {
  try {
    const res = await fetch('/api/blog/posts?status=DRAFT');
    const data = await res.json();

    const container = document.getElementById('drafts-container');

    if (data.posts.length === 0) {
      container.innerHTML = '<p class="text-muted">No drafts available</p>';
      return;
    }

    container.innerHTML = data.posts.map(post => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${post.title}</h5>
          <p class="card-text text-muted">
            ${new Date(post.threadStartTime).toLocaleString()} - ${post.messageCount} messages
          </p>
          <div class="btn-group">
            <a href="/post.html?id=${post.id}" class="btn btn-sm btn-outline-primary">View</a>
            <button class="btn btn-sm btn-outline-secondary" onclick="editPost(${post.id})">Edit</button>
            <button class="btn btn-sm btn-success" onclick="publishPost(${post.id})">Publish</button>
            <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showAlert('Failed to load drafts', 'danger');
  }
}

// Edit post
async function editPost(id) {
  try {
    const res = await fetch(`/api/blog/posts/${id}`);
    const data = await res.json();

    currentEditId = id;
    document.getElementById('edit-title').value = data.post.title;
    document.getElementById('edit-content').value = data.post.content;

    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
  } catch (error) {
    showAlert('Failed to load post', 'danger');
  }
}

// Save edit
document.getElementById('save-edit-btn').addEventListener('click', async () => {
  try {
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;

    await fetch(`/api/blog/posts/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    editModal.hide();
    showAlert('Post updated', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to update post', 'danger');
  }
});

// Publish post
async function publishPost(id) {
  if (!confirm('Publish this post?')) return;

  try {
    await fetch(`/api/blog/posts/${id}/publish`, { method: 'POST' });
    showAlert('Post published', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to publish post', 'danger');
  }
}

// Delete post
async function deletePost(id) {
  if (!confirm('Delete this draft?')) return;

  try {
    await fetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
    showAlert('Draft deleted', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to delete draft', 'danger');
  }
}

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
loadDrafts();
