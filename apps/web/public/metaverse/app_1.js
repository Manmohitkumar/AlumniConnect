// Global variables
let scene, camera, renderer, avatar, currentRoom = null;
let isMoving = false;
let keys = {};
let mouseX = 0, mouseY = 0;
let avatarMixer = null;
let walkAnimation = null;
let idleAnimation = null;
let mediaStream = null;
let peerConnection = null;
let isMicMuted = false;
let isScreenSharing = false;
let chatMessages = [];

// Room data
const roomData = {
    'mentor-room': {
        name: 'Mentor Room',
        position: { x: 0, y: 0, z: 0 },
        color: 0x2C3E50,
        description: 'Interactive meeting space for mentorship sessions'
    },
    'innovation-lab': {
        name: 'Innovation Lab', 
        position: { x: 20, y: 0, z: 0 },
        color: 0x8E44AD,
        description: 'Modern tech space for showcasing projects'
    },
    'career-hall': {
        name: 'Career Hall',
        position: { x: -20, y: 0, z: 0 },
        color: 0x27AE60,
        description: 'Professional space for career guidance'
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Metaverse Hub initialized');
    setupEventListeners();
    setupRoomButtons();
    addSystemMessage('Welcome to Metaverse Hub! Select a room to begin.');
});

// Setup room selection buttons
function setupRoomButtons() {
    const enterButtons = document.querySelectorAll('button[onclick*="selectRoom"]');
    enterButtons.forEach(button => {
        button.removeAttribute('onclick');
        const roomId = button.closest('.room-card').getAttribute('data-room');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectRoom(roomId);
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Movement controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    
    // UI controls setup - will be activated when in 3D mode
    const micToggle = document.getElementById('mic-toggle');
    const screenShare = document.getElementById('screen-share');
    const chatToggle = document.getElementById('chat-toggle');
    
    if(micToggle) micToggle.addEventListener('click', toggleMicrophone);
    if(screenShare) screenShare.addEventListener('click', toggleScreenShare);
    if(chatToggle) chatToggle.addEventListener('click', toggleChat);
    
    // Chat input
    const chatInput = document.getElementById('chat-input');
    if(chatInput) chatInput.addEventListener('keypress', handleChatInput);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// Room selection - Fixed function
function selectRoom(roomId) {
    console.log('Selecting room:', roomId);
    currentRoom = roomId;
    showAvatarModal();
}

// Global functions for HTML onclick handlers
window.selectRoom = selectRoom;
window.closeAvatarModal = closeAvatarModal;
window.enterRoom = enterRoom;
window.exitRoom = exitRoom;
window.switchRoom = switchRoom;
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;
window.handleChatInput = handleChatInput;
window.stopScreenShare = stopScreenShare;

function showAvatarModal() {
    console.log('Showing avatar modal');
    const modal = document.getElementById('avatar-modal');
    if(modal) {
        modal.classList.remove('hidden');
        // Initialize avatar preview
        setTimeout(() => initAvatarPreview(), 100);
    } else {
        console.error('Avatar modal not found');
    }
}

function closeAvatarModal() {
    console.log('Closing avatar modal');
    const modal = document.getElementById('avatar-modal');
    if(modal) {
        modal.classList.add('hidden');
    }
}

function initAvatarPreview() {
    const previewContainer = document.getElementById('avatar-preview-canvas');
    if(!previewContainer) return;
    
    // Clear any existing content
    previewContainer.innerHTML = '';
    
    try {
        // Simple preview setup
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(75, 200/300, 0.1, 1000);
        const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        previewRenderer.setSize(200, 300);
        previewRenderer.setClearColor(0x000000, 0);
        previewContainer.appendChild(previewRenderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        previewScene.add(directionalLight);
        
        // Create simple avatar representation for preview
        const avatarGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
        const avatarMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        const previewAvatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
        previewAvatar.position.set(0, -0.5, 0);
        previewScene.add(previewAvatar);
        
        previewCamera.position.set(0, 0, 2.5);
        previewCamera.lookAt(0, 0, 0);
        
        // Render loop for preview
        function renderPreview() {
            if(previewContainer.parentNode) {
                requestAnimationFrame(renderPreview);
                previewAvatar.rotation.y += 0.02;
                previewRenderer.render(previewScene, previewCamera);
            }
        }
        renderPreview();
        
        console.log('Avatar preview initialized');
    } catch(error) {
        console.error('Avatar preview error:', error);
        previewContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Avatar Preview</div>';
    }
}

// Enter room - Fixed function
function enterRoom() {
    console.log('Entering room:', currentRoom);
    
    if(!currentRoom) {
        console.error('No room selected');
        return;
    }
    
    closeAvatarModal();
    
    const dashboard = document.getElementById('dashboard');
    const metaverse = document.getElementById('metaverse-space');
    
    if(dashboard && metaverse) {
        dashboard.classList.add('hidden');
        metaverse.classList.remove('hidden');
        
        // Update room info
        const roomName = document.getElementById('current-room-name');
        if(roomName) {
            roomName.textContent = roomData[currentRoom].name;
        }
        
        // Show loading initially
        showLoading();
        
        // Initialize 3D environment with delay to ensure UI is ready
        setTimeout(() => {
            init3DEnvironment();
            initializeCommunication();
            addSystemMessage(`Welcome to ${roomData[currentRoom].name}!`);
            addSystemMessage('Use WASD keys to move around, mouse to look around.');
        }, 500);
    }
}

// 3D Environment Setup - Fixed
function init3DEnvironment() {
    try {
        const canvas = document.getElementById('three-canvas');
        if(!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        // Scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(roomData[currentRoom].color);
        
        // Camera setup
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 5);
        
        // Renderer setup
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        setupLighting();
        
        // Create room environment
        createRoomEnvironment();
        
        // Load avatar
        loadAvatar();
        
        // Start render loop
        animate();
        
        console.log('3D environment initialized');
    } catch(error) {
        console.error('3D initialization error:', error);
        hideLoading();
        addSystemMessage('Error initializing 3D environment. Please try again.');
    }
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Point lights for ambiance
    const pointLight1 = new THREE.PointLight(0x00ff88, 0.3);
    pointLight1.position.set(-5, 3, -5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff8800, 0.3);
    pointLight2.position.set(5, 3, 5);
    scene.add(pointLight2);
}

function createRoomEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Room-specific objects
    switch(currentRoom) {
        case 'mentor-room':
            createMentorRoom();
            break;
        case 'innovation-lab':
            createInnovationLab();
            break;
        case 'career-hall':
            createCareerHall();
            break;
    }
    
    // Walls
    createWalls();
}

function createMentorRoom() {
    // Conference table
    const tableGeometry = new THREE.BoxGeometry(6, 0.1, 3);
    const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0.75, 0);
    table.castShadow = true;
    scene.add(table);
    
    // Chairs around table
    for(let i = 0; i < 6; i++) {
        const chairGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
        
        const angle = (i / 6) * Math.PI * 2;
        chair.position.set(Math.cos(angle) * 4, 0.5, Math.sin(angle) * 2.5);
        chair.castShadow = true;
        scene.add(chair);
    }
    
    // Whiteboard
    const boardGeometry = new THREE.PlaneGeometry(4, 2);
    const boardMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(0, 2, -7);
    scene.add(board);
}

function createInnovationLab() {
    // Digital screens
    for(let i = 0; i < 3; i++) {
        const screenGeometry = new THREE.PlaneGeometry(3, 2);
        const screenMaterial = new THREE.MeshLambertMaterial({ color: 0x001133 });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(-6 + i * 6, 2, -7);
        scene.add(screen);
        
        // Screen glow effect
        const glowGeometry = new THREE.PlaneGeometry(3.2, 2.2);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0066ff, 
            transparent: true, 
            opacity: 0.2 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(-6 + i * 6, 2, -6.9);
        scene.add(glow);
    }
    
    // Lab tables
    for(let i = 0; i < 4; i++) {
        const labTableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const labTableMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const labTable = new THREE.Mesh(labTableGeometry, labTableMaterial);
        labTable.position.set(-3 + i * 2, 0.75, 2);
        labTable.castShadow = true;
        scene.add(labTable);
    }
}

function createCareerHall() {
    // Information kiosks
    for(let i = 0; i < 4; i++) {
        const kioskGeometry = new THREE.BoxGeometry(1, 2, 0.2);
        const kioskMaterial = new THREE.MeshLambertMaterial({ color: 0x2E8B57 });
        const kiosk = new THREE.Mesh(kioskGeometry, kioskMaterial);
        kiosk.position.set(-6 + i * 4, 1, -6);
        kiosk.castShadow = true;
        scene.add(kiosk);
    }
    
    // Consultation desks
    for(let i = 0; i < 2; i++) {
        const deskGeometry = new THREE.BoxGeometry(3, 0.1, 1.5);
        const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(-2 + i * 4, 0.75, 3);
        desk.castShadow = true;
        scene.add(desk);
    }
}

function createWalls() {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(30, 8);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 4, -15);
    scene.add(backWall);
    
    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(30, 8);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-15, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(15, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
}

function loadAvatar() {
    try {
        // Create simple avatar representation (fallback first)
        const avatarGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
        const avatarMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
        avatar.position.set(0, 0.75, 3);
        avatar.castShadow = true;
        scene.add(avatar);
        
        hideLoading();
        console.log('Avatar loaded (simple version)');
        
        // Try to load ReadyPlayer.me avatar as enhancement
        if(window.THREE && THREE.GLTFLoader) {
            const loader = new THREE.GLTFLoader();
            loader.load(
                'https://models.readyplayer.me/68cd434654deef71c5e3b11f.glb',
                function(gltf) {
                    // Remove simple avatar
                    scene.remove(avatar);
                    
                    // Add loaded avatar
                    avatar = gltf.scene;
                    avatar.scale.set(1, 1, 1);
                    avatar.position.set(0, 0, 3);
                    avatar.castShadow = true;
                    scene.add(avatar);
                    
                    console.log('ReadyPlayer.me avatar loaded successfully');
                    addSystemMessage('High-quality avatar loaded!');
                },
                function(progress) {
                    console.log('Avatar loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                function(error) {
                    console.warn('ReadyPlayer.me avatar failed to load, using simple avatar:', error);
                }
            );
        }
    } catch(error) {
        console.error('Avatar loading error:', error);
        hideLoading();
    }
}

// Animation and render loop
function animate() {
    if(!renderer || !scene || !camera) return;
    
    requestAnimationFrame(animate);
    
    // Update avatar mixer
    if(avatarMixer) {
        avatarMixer.update(0.016);
    }
    
    // Handle movement
    handleMovement();
    
    // Update camera
    updateCamera();
    
    // Render
    renderer.render(scene, camera);
}

// Movement handling
function handleMovement() {
    if(!avatar) return;
    
    const moveSpeed = 0.1;
    let moved = false;
    
    if(keys['KeyW'] || keys['ArrowUp']) {
        avatar.position.z -= moveSpeed;
        moved = true;
    }
    if(keys['KeyS'] || keys['ArrowDown']) {
        avatar.position.z += moveSpeed;
        moved = true;
    }
    if(keys['KeyA'] || keys['ArrowLeft']) {
        avatar.position.x -= moveSpeed;
        moved = true;
    }
    if(keys['KeyD'] || keys['ArrowRight']) {
        avatar.position.x += moveSpeed;
        moved = true;
    }
    
    // Constrain movement to room bounds
    if(avatar.position) {
        avatar.position.x = Math.max(-12, Math.min(12, avatar.position.x));
        avatar.position.z = Math.max(-12, Math.min(12, avatar.position.z));
    }
}

function updateCamera() {
    if(!avatar || !camera) return;
    
    // Third-person camera
    const cameraOffset = new THREE.Vector3(0, 3, 8);
    if(avatar.position) {
        camera.position.copy(avatar.position).add(cameraOffset);
        camera.lookAt(avatar.position);
    }
}

// Event handlers
function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    if(!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Communication functions
function initializeCommunication() {
    console.log('Initializing communication...');
    addSystemMessage('Communication system ready. Click buttons to activate features.');
}

function toggleMicrophone() {
    const button = document.getElementById('mic-toggle');
    const status = document.getElementById('mic-status');
    
    if(!button || !status) return;
    
    isMicMuted = !isMicMuted;
    
    if(isMicMuted) {
        status.textContent = '🔇 Mic Off';
        button.classList.add('muted');
        addSystemMessage('Microphone muted.');
    } else {
        status.textContent = '🎤 Mic On';
        button.classList.remove('muted');
        addSystemMessage('Microphone unmuted.');
    }
}

function toggleScreenShare() {
    const button = document.getElementById('screen-share');
    if(!button) return;
    
    if(!isScreenSharing) {
        startScreenShare();
    } else {
        stopScreenShare();
    }
}

function startScreenShare() {
    if(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(stream => {
                isScreenSharing = true;
                const video = document.getElementById('shared-screen-video');
                const sharedScreen = document.getElementById('shared-screen');
                
                if(video && sharedScreen) {
                    video.srcObject = stream;
                    sharedScreen.classList.remove('hidden');
                }
                
                const button = document.getElementById('screen-share');
                if(button) button.classList.add('active');
                addSystemMessage('Screen sharing started.');
                
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopScreenShare();
                });
            })
            .catch(error => {
                console.error('Error starting screen share:', error);
                addSystemMessage('Screen sharing not available in this browser.');
            });
    } else {
        addSystemMessage('Screen sharing not supported in this browser.');
    }
}

function stopScreenShare() {
    const video = document.getElementById('shared-screen-video');
    const sharedScreen = document.getElementById('shared-screen');
    const button = document.getElementById('screen-share');
    
    if(video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    if(sharedScreen) sharedScreen.classList.add('hidden');
    if(button) button.classList.remove('active');
    
    isScreenSharing = false;
    addSystemMessage('Screen sharing stopped.');
}

// Chat functions
function toggleChat() {
    const chatPanel = document.getElementById('chat-panel');
    const button = document.getElementById('chat-toggle');
    
    if(!chatPanel || !button) return;
    
    if(chatPanel.classList.contains('hidden')) {
        chatPanel.classList.remove('hidden');
        button.classList.add('active');
        const chatInput = document.getElementById('chat-input');
        if(chatInput) chatInput.focus();
    } else {
        chatPanel.classList.add('hidden');
        button.classList.remove('active');
    }
}

function handleChatInput(event) {
    if(event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    if(!input) return;
    
    const message = input.value.trim();
    
    if(message) {
        const avatarName = document.getElementById('avatar-name');
        const senderName = (avatarName && avatarName.value) || 'Student';
        addMessage(senderName, message);
        input.value = '';
        input.focus();
    }
}

function addMessage(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    if(!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    messageDiv.innerHTML = `
        <div class="chat-message-sender">${sender}:</div>
        <div class="chat-message-text">${text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatMessages.push({ sender, text, timestamp: new Date() });
}

function addSystemMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');
    if(!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.style.opacity = '0.7';
    
    messageDiv.innerHTML = `
        <div class="chat-message-sender">System:</div>
        <div class="chat-message-text">${text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Room switching
function switchRoom(roomId) {
    if(roomId === currentRoom || !scene) return;
    
    console.log('Switching to room:', roomId);
    showLoading();
    addSystemMessage(`Switching to ${roomData[roomId].name}...`);
    
    // Update current room
    currentRoom = roomId;
    const roomName = document.getElementById('current-room-name');
    if(roomName) {
        roomName.textContent = roomData[currentRoom].name;
    }
    
    // Clear room objects but keep avatar and basic scene
    const objectsToRemove = [];
    scene.traverse(object => {
        if(object !== avatar && object.type === 'Mesh' && object.parent === scene) {
            objectsToRemove.push(object);
        }
    });
    
    objectsToRemove.forEach(object => {
        if(object !== avatar) {
            scene.remove(object);
        }
    });
    
    // Update background color
    scene.background = new THREE.Color(roomData[currentRoom].color);
    
    // Recreate room environment
    createRoomEnvironment();
    
    // Reset avatar position
    if(avatar && avatar.position) {
        avatar.position.set(0, 0.75, 3);
    }
    
    hideLoading();
    addSystemMessage(`Welcome to ${roomData[currentRoom].name}!`);
}

// UI helpers
function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if(loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if(loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function exitRoom() {
    console.log('Exiting room...');
    
    // Clean up media streams
    if(mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if(isScreenSharing) {
        stopScreenShare();
    }
    
    // Show dashboard, hide 3D space
    const dashboard = document.getElementById('dashboard');
    const metaverse = document.getElementById('metaverse-space');
    
    if(dashboard && metaverse) {
        metaverse.classList.add('hidden');
        dashboard.classList.remove('hidden');
    }
    
    // Clean up 3D objects
    if(renderer) {
        renderer.dispose();
        renderer = null;
    }
    
    if(scene) {
        scene.clear();
        scene = null;
    }
    
    // Reset variables
    currentRoom = null;
    avatar = null;
    camera = null;
    keys = {};
    
    console.log('Returned to dashboard');
}