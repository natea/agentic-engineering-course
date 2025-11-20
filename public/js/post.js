// Load post detail
async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('post-container').innerHTML = '<p class="text-danger">Post ID required</p>';
    return;
  }

  try {
    const res = await fetch(`/api/blog/posts/${id}`);
    const data = await res.json();
    const post = data.post;

    document.getElementById('post-container').innerHTML = `
      <article>
        <h1>${post.title}</h1>
        <p class="text-muted">
          ${post.status} ·
          ${post.publishedAt ? `Published ${new Date(post.publishedAt).toLocaleString()}` : `Created ${new Date(post.createdAt).toLocaleString()}`}
        </p>

        <div class="mt-4" style="white-space: pre-wrap;">${post.content}</div>

        <div class="mt-4">
          <button class="btn btn-outline-secondary" onclick="toggleMessages()">
            View Source Messages (${post.messageCount})
          </button>
        </div>

        <div id="messages-container" class="mt-3 d-none">
          <h3>Source Messages</h3>
          ${post.messages.map(pm => {
            // Simple contact name mapping (you can expand this)
            const contactNames = {
              '+17323223521': 'Cesar',
              '+16177848993': 'Adam',
              // Add more contacts as needed
            };

            // Check if this message is from you
            const isFromMe = pm.message.isFromMe;

            // Determine sender name
            let senderName;
            if (isFromMe) {
              senderName = 'You';
            } else {
              senderName = pm.message.senderName || contactNames[pm.message.senderId] || pm.message.senderId;
            }

            // Style messages differently based on sender
            const messageClass = isFromMe ? 'bg-primary bg-opacity-10 border-primary' : 'bg-light';
            const textAlign = isFromMe ? 'text-end' : 'text-start';

            return `
              <div class="card mb-2 ${messageClass}">
                <div class="card-body ${textAlign}">
                  <p class="card-text"><strong>${senderName}</strong></p>
                  <p class="card-text">${pm.message.text || '(no text)'}</p>
                  <p class="card-text"><small class="text-muted">${new Date(pm.message.sentAt).toLocaleString()}</small></p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </article>
    `;
  } catch (error) {
    showAlert('Failed to load post', 'danger');
  }
}

// Toggle messages visibility
function toggleMessages() {
  const container = document.getElementById('messages-container');
  container.classList.toggle('d-none');
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
loadPost();
