// Constant configurations
const PHYSICS_CONFIG = {
    collisionDistance: 1.0,
    avatarRadius: 0.5,
    avatarHeight: 2.0
};

// Asset configurations
const AVATAR_ASSETS = {
    'male1': 'assets/avatars/male1.svg',
    'female1': 'assets/avatars/female1.svg',
    'male2': 'assets/avatars/male2.svg',
    'female2': 'assets/avatars/female2.svg'
};

// Application state management
const AppState = {
    // 3D Environment
    scene: null,
    camera: null,
    renderer: null,
    
    // User state
    avatar: null,
    currentRoom: null,
    
    // UI state
    isLoading: false,
    initialized: false,
    
    // Selection state
    selectedRoom: null,
    selectedAvatar: null,
    
    // Camera settings
    cameraMode: 'third-person',
    cameraControls: {
        distance: 8,
        height: 3,
        angle: 0
    },
    
    // Animation state
    isMoving: false,
    mouseSensitivity: 0.002,
    isPointerLocked: false,
    
    // Initialize the application
    init() {
        this.bindEvents();
        this.initialized = false;
        console.log('[DEBUG] AppState initialized');
    },
    
    // Event binding
    bindEvents() {
        // Bind UI event handlers
        const enterRoomBtn = document.getElementById('enter-room-btn');
        if (enterRoomBtn) {
            enterRoomBtn.addEventListener('click', () => enterRoom());
        }
        
        const exitRoomBtn = document.getElementById('exit-room');
        if (exitRoomBtn) {
            exitRoomBtn.addEventListener('click', () => exitRoom());
        }
        
        // Window events
        window.addEventListener('resize', () => {
            if (this.camera && this.renderer) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
        
        console.log('[DEBUG] Events bound');
    }
};

// 3D Environment Setup
async function setup3DEnvironment() {
    console.log('[DEBUG] Setting up 3D environment');
    
    try {
        // Create scene
        AppState.scene = new THREE.Scene();
        
        // Setup camera
        AppState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        AppState.camera.position.set(0, 2, 5);
        
        // Setup renderer
        const canvas = document.getElementById('three-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        AppState.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        AppState.renderer.setSize(window.innerWidth, window.innerHeight);
        AppState.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        AppState.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        AppState.scene.add(directionalLight);

        // Set initialization flag
        AppState.initialized = true;
        
        console.log('[DEBUG] 3D environment setup complete');
        return true;
    } catch (error) {
        console.error('[ERROR] Failed to setup 3D environment:', error);
        return false;
    }
}

// Loading screen management
function showLoadingScreen(message = 'Loading...') {
    console.log('[DEBUG] Showing loading screen:', message);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        const messageElement = loadingScreen.querySelector('.loading-content h2');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] Initializing application...');
    
    // Initialize application state
    AppState.init();
    
    // Set up initial UI state
    const elements = {
        dashboard: document.getElementById('dashboard'),
        avatarModal: document.getElementById('avatar-modal'),
        gameContainer: document.getElementById('game-container'),
        loadingScreen: document.getElementById('loading-screen'),
        enterRoomBtn: document.getElementById('enter-room-btn')
    };
    
    // Show dashboard, hide other elements
    if (elements.dashboard) {
        elements.dashboard.style.display = 'block';
    }
    
    // Hide modals and game container
    [elements.avatarModal, elements.gameContainer, elements.loadingScreen].forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Add event listener for enter room button
    if (elements.enterRoomBtn) {
        elements.enterRoomBtn.addEventListener('click', function() {
            enterRoom();
        });
        console.log('[DEBUG] Enter room button event listener added');
    }
    
    // Initialize global functions
    window.selectRoom = selectRoom;
    window.closeAvatarModal = closeAvatarModal;
    window.selectPreset = selectPreset;
    
    console.log('[DEBUG] Application initialized');
});

// Error handling
function handleError(error, context) {
    log(context, error, 'error');
    showErrorNotification(error.message || 'An error occurred');
}

function showErrorNotification(message) {
    console.log('[DEBUG] Showing error notification:', message);
    
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize error handlers
window.addEventListener('error', (event) => {
    handleError(event.error, 'Uncaught error');
});

window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'Unhandled promise rejection');
});

// Room selection handler
function selectRoom(roomId) {
    console.log('[DEBUG] Selecting room:', roomId);
    
    try {
        if (!roomId) {
            throw new Error('Invalid room ID');
        }
        
        // Update application state
        AppState.selectedRoom = roomId;
        AppState.currentRoom = roomId;
        
        // Get UI elements
        const elements = {
            dashboard: document.getElementById('dashboard'),
            avatarModal: document.getElementById('avatar-modal'),
            enterRoomBtn: document.getElementById('enter-room-btn'),
            roomName: document.getElementById('current-room-name')
        };
        
        // Validate required elements
        if (!elements.avatarModal) {
            throw new Error('Required UI elements not found');
        }
        
        // Update UI state
        if (elements.dashboard) {
            elements.dashboard.style.display = 'none';
        }
        elements.avatarModal.style.display = 'flex';
        
        // Reset avatar selection state
        AppState.selectedAvatar = null;
        AppState.avatar = null;
        
        // Reset enter button state
        if (elements.enterRoomBtn) {
            elements.enterRoomBtn.disabled = true;
        }
        
        // Update room name display
        if (elements.roomName) {
            elements.roomName.textContent = roomId.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        console.log('[DEBUG] Room selected successfully:', roomId);
    } catch (error) {
        console.error('[ERROR] Failed to select room:', error);
        showErrorNotification('Failed to select room. Please try again.');
    }
}

// Animation and physics variables
const animations = {
    mixer: null,
    walk: null,
    idle: null
};

// Input state
const inputState = {
    keys: {},
    mouseX: 0,
    mouseY: 0
};

// Communication state
const communicationState = {
    mediaStream: null,
    peerConnection: null,
    isMicMuted: false,
    isScreenSharing: false,
    chatMessages: []
};

// Physics and collision detection state
const physics = {
    collidableObjects: [],
    raycaster: new THREE.Raycaster()
};

// Avatar selection function
function selectPreset(presetId) {
    console.log('[DEBUG] Selecting preset avatar:', presetId);
    
    try {
        // Validate preset
        if (!presetId || !AVATAR_ASSETS[presetId]) {
            throw new Error('Invalid avatar preset');
        }
        
        // Update selected avatar
        AppState.selectedAvatar = {
            type: 'preset',
            id: presetId,
            url: AVATAR_ASSETS[presetId]
        };
        
        // Update UI
        const enterRoomBtn = document.getElementById('enter-room-btn');
        const presets = document.querySelectorAll('.avatar-preset');
        
        // Update selection visuals
        presets.forEach(preset => {
            preset.classList.toggle('selected', preset.getAttribute('data-preset') === presetId);
        });
        
        // Enable enter button and set handler
        if (enterRoomBtn) {
            enterRoomBtn.disabled = false;
            console.log('[DEBUG] Enabled enter room button');
        }
        
        console.log('[DEBUG] Avatar selected successfully:', presetId);
    } catch (error) {
        console.error('[ERROR] Failed to select avatar:', error);
        showErrorNotification('Failed to select avatar. Please try again.');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update avatar position based on input
    updateAvatarPosition();
    
    // Render the scene
    if (AppState.renderer && AppState.scene && AppState.camera) {
        AppState.renderer.render(AppState.scene, AppState.camera);
    }
}

// Input handlers
function onKeyDown(event) {
    inputState.keys[event.code] = true;
}

function onKeyUp(event) {
    inputState.keys[event.code] = false;
}

function onMouseMove(event) {
    if (AppState.isPointerLocked) {
        inputState.mouseX = event.movementX || 0;
        inputState.mouseY = event.movementY || 0;
    } else {
        inputState.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        inputState.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
}

// Update avatar position
function updateAvatarPosition() {
    if (!AppState.avatar) return;
    
    const moveSpeed = 0.1;
    
    if (inputState.keys['KeyW']) AppState.avatar.position.z -= moveSpeed;
    if (inputState.keys['KeyS']) AppState.avatar.position.z += moveSpeed;
    if (inputState.keys['KeyA']) AppState.avatar.position.x -= moveSpeed;
    if (inputState.keys['KeyD']) AppState.avatar.position.x += moveSpeed;
    
    // Update camera to follow avatar
    if (AppState.camera) {
        AppState.camera.position.x = AppState.avatar.position.x;
        AppState.camera.position.z = AppState.avatar.position.z + 5;
        AppState.camera.lookAt(AppState.avatar.position);
    }
}