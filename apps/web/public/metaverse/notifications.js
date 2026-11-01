// Add to app.js

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    const icon = document.createElement('i');
    switch(type) {
        case 'success':
            icon.className = 'fas fa-check-circle';
            break;
        case 'error':
            icon.className = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon.className = 'fas fa-exclamation-triangle';
            break;
        default:
            icon.className = 'fas fa-info-circle';
    }
    
    notification.appendChild(icon);
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);
    
    document.body.appendChild(notification);
    
    // Slide in animation
    requestAnimationFrame(() => {
        notification.style.transform = 'translateY(100%)';
        notification.style.opacity = '0';
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '0.9';
        });
    });
    
    // Auto remove after shorter delay (2 seconds)
    setTimeout(() => {
        notification.style.transform = 'translateY(10px)';
        notification.style.opacity = '0';
        
        // Remove after animation
        setTimeout(() => {
            notification.remove();
        }, 200);
    }, 2000);
}

// System message handler
function addSystemMessage(message, type = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message system ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-text">
                    ${message}
                </div>
                <div class="message-time">
                    ${new Date().toLocaleTimeString()}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Also show as notification
    showNotification(message, type);
}

// Error handler
function handleError(error, context = '') {
    console.error(`${context} Error:`, error);
    const errorMessage = error.message || 'An unknown error occurred';
    addSystemMessage(`Error: ${errorMessage}`, 'error');
    showNotification(errorMessage, 'error');
}