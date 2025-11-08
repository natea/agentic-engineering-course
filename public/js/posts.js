// Load published posts
async function loadPosts() {
  try {
    const res = await fetch('/api/blog/posts?status=PUBLISHED');
    const data = await res.json();

    const container = document.getElementById('posts-container');

    if (data.posts.length === 0) {
      container.innerHTML = '<p class="text-muted">No published posts</p>';
      return;
    }

    container.innerHTML = data.posts.map(post => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${post.title}</h5>
          <p class="card-text text-muted">
            Published ${new Date(post.publishedAt).toLocaleString()} · ${post.messageCount} messages
          </p>
          <div class="btn-group">
            <a href="/post.html?id=${post.id}" class="btn btn-sm btn-outline-primary">View</a>
            <button class="btn btn-sm btn-warning" onclick="archivePost(${post.id})">Archive</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showAlert('Failed to load posts', 'danger');
  }
}

// Archive post
async function archivePost(id) {
  if (!confirm('Archive this post?')) return;

  try {
    await fetch(`/api/blog/posts/${id}/archive`, { method: 'POST' });
    showAlert('Post archived', 'success');
    loadPosts();
  } catch (error) {
    showAlert('Failed to archive post', 'danger');
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
loadPosts();
