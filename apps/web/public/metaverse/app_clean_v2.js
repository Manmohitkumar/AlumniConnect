// Three.js scene variables
let scene = null;
let renderer = null;
let camera = null;
let collidableObjects = [];

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
    isLoading: false, // Loading disabled
    initialized: false,
    setupInProgress: false,
    
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
        // Room entry is wired by avatar-system.js (see updateEnterButton).
        // Binding it here as well fired enterRoom twice per click, which
        // spawned a second room and a second avatar into the same scene.
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

// avatar-system.js loads first and uses this shared state only after the
// user chooses a room/avatar. Expose it explicitly rather than relying on a
// top-level `const` becoming a window property.
window.AppState = AppState;

// 3D Environment Setup
async function setup3DEnvironment() {
    console.log('[DEBUG] Setting up 3D environment');

    // loadRoomEnvironment awaits a GLB load and then adds to AppState.scene.
    // Two concurrent setups would both add a room and an avatar to the last
    // scene created, so only one setup may be in flight at a time.
    if (AppState.setupInProgress) {
        console.warn('[DEBUG] 3D environment setup already in progress');
        return false;
    }
    AppState.setupInProgress = true;

    try {
        // Create scene
        AppState.scene = new THREE.Scene();
        AppState.scene.background = new THREE.Color(0x202c39);
        AppState.scene.fog = new THREE.Fog(0x202c39, 18, 34);
        
        // Setup camera
        AppState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        AppState.camera.position.set(0, 2, 5);
        
        // Setup renderer (reuse across room entries: one WebGL context per canvas)
        const canvas = document.getElementById('three-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        if (!AppState.renderer) {
            AppState.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                alpha: true
            });
            AppState.renderer.shadowMap.enabled = true;
            AppState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        AppState.renderer.setSize(window.innerWidth, window.innerHeight);
        AppState.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        AppState.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xfff2d6, 1.1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        AppState.scene.add(directionalLight);

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(32, 32);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d5365,
            roughness: 0.85,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        AppState.scene.add(floor);

        // Load GLB environment for the selected room
        await loadRoomEnvironment();

        // Create avatar
        createSimpleAvatar();

        // Setup movement controls
        setupMovementControls();
        
        // Set initialization flag
        AppState.initialized = true;
        AppState.setupInProgress = false;
        
        console.log('[DEBUG] 3D environment setup complete');
        return true;
    } catch (error) {
        AppState.setupInProgress = false;
        console.error('[ERROR] Failed to setup 3D environment:', error);
        return false;
    }
}

// Load GLB room environment based on selected room
async function loadRoomEnvironment() {
    const roomFiles = {
        'mentor-room': 'assets/environments/mentor-room.glb',
        'career-hall': 'assets/environments/career-hall.glb',
        'innovation-lab': 'assets/environments/innovation-lab.glb'
    };

    const roomFile = roomFiles[AppState.selectedRoom];
    
    if (!roomFile) {
        console.warn('[DEBUG] No GLB file defined for room:', AppState.selectedRoom);
        createFallbackRoom();
        return;
    }

    console.log('[DEBUG] Loading GLB environment:', roomFile);
    
    try {
        // Use GLTFLoader to load the environment
        if (!THREE.GLTFLoader) {
            throw new Error('GLTFLoader not available');
        }
        const loader = new THREE.GLTFLoader();
        
        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                roomFile,
                (gltf) => resolve(gltf),
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100);
                    console.log('[DEBUG] Loading progress:', percent + '%');
                },
                (error) => reject(error)
            );
        });

        // Add the loaded model to the scene
        const roomModel = gltf.scene;
        roomModel.scale.setScalar(1); // Adjust scale if needed
        roomModel.position.set(0, 0, 0);
        
        // Enable shadows on all meshes
        roomModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Store collision objects
                if (child.name.toLowerCase().includes('collision') || 
                    child.name.toLowerCase().includes('wall') ||
                    child.name.toLowerCase().includes('furniture')) {
                    physics.collidableObjects.push(child);
                }
            }
        });

        AppState.scene.add(roomModel);
        console.log('[DEBUG] GLB environment loaded successfully:', roomFile);
        
    } catch (error) {
        console.error('[ERROR] Failed to load GLB environment:', error);
        console.log('[DEBUG] Falling back to basic room geometry');
        createFallbackRoom();
    }
}

// Create fallback room when GLB loading fails
function createFallbackRoom() {
    const roomColor = AppState.selectedRoom === 'mentor-room' ? 0x2d3f4f :
                     AppState.selectedRoom === 'innovation-lab' ? 0x3d5365 : 0x324555;

    // Create some basic furniture as fallback
    const tableGeometry = new THREE.BoxGeometry(3, 0.1, 1.5);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x324555 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 0.75, -2);
    table.castShadow = true;
    table.receiveShadow = true;
    AppState.scene.add(table);

    // Add chairs
    for (let i = 0; i < 4; i++) {
        const chairGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        const chairMaterial = new THREE.MeshStandardMaterial({ color: roomColor });
        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
        chair.position.set(-1 + i * 0.7, 0.4, -1);
        chair.castShadow = true;
        chair.receiveShadow = true;
        AppState.scene.add(chair);
        physics.collidableObjects.push(chair);
    }
    
    physics.collidableObjects.push(table);
    console.log('[DEBUG] Fallback room created');
}

// Create avatar based on selection
function createSimpleAvatar() {
    if (AppState.selectedAvatar) {
        if (AppState.selectedAvatar.type === '3d-model') {
            // Try to load 3D model avatar
            load3DAvatar(AppState.selectedAvatar.modelPath);
        } else if (AppState.selectedAvatar.type === 'readyplayer') {
            // Avaturn-uploaded GLB or Ready Player Me link: load the .glb model
            const url = AppState.selectedAvatar.data || AppState.selectedAvatar.url;
            if (url) {
                load3DAvatar(url);
            } else {
                // Create simple geometric avatar
                createGeometricAvatar();
            }
        } else if (AppState.selectedAvatar.type === 'ai-generated' || AppState.selectedAvatar.type === 'photo') {
            // Load AI-generated avatar that matches the photo
            loadAIGeneratedAvatar(AppState.selectedAvatar);
        } else if (AppState.selectedAvatar.type === 'preset' && AppState.selectedAvatar.url) {
            // Render the chosen 2D preset inside the 3D scene.
            createPresetAvatar(AppState.selectedAvatar.url);
        } else {
            // Create simple geometric avatar
            createGeometricAvatar();
        }
    } else {
        // Create simple geometric avatar
        createGeometricAvatar();
    }
}

// Render a 2D preset avatar as a texture-backed sprite in the 3D scene.
function createPresetAvatar(url) {
    if (typeof THREE === 'undefined') {
        createGeometricAvatar();
        return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(1.2, 2, 1);
        sprite.position.set(0, 1.1, 2);
        AppState.scene.add(sprite);
        AppState.avatar = sprite;
        console.log('[DEBUG] 2D preset avatar loaded into scene');
    }, undefined, () => {
        console.warn('[DEBUG] 2D preset failed to load; using geometric avatar');
        createGeometricAvatar();
    });
}

// 2D room entry: works without WebGL or the Three.js CDN so 2D avatars can
// always enter. Shows the selected avatar and room, with a way back out.
function enter2DRoom() {
    const avatar = AppState.selectedAvatar || {};
    const src = avatar.url || 'assets/avatars/male1.svg';
    const roomNames = { 'mentor-room': 'Mentor Room', 'innovation-lab': 'Innovation Lab', 'career-hall': 'Career Hall' };
    const roomName = roomNames[AppState.selectedRoom] || 'Metaverse Room';

    document.getElementById('avatar-modal')?.style.setProperty('display', 'none');
    document.getElementById('loading-screen')?.style.setProperty('display', 'none');
    const game = document.getElementById('game-container');
    if (!game) return;

    game.style.display = 'block';
    game.innerHTML = '';

    const scene = document.createElement('div');
    scene.setAttribute('data-2d-room', AppState.selectedRoom || 'mentor-room');
    scene.style.cssText = 'position:fixed;inset:0;background:linear-gradient(160deg,#202C39 0%,#283845 55%,#324555 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;color:#F2D492;font-family:Inter,sans-serif;';

    const heading = document.createElement('h1');
    heading.textContent = roomName;
    heading.style.cssText = 'margin:0;font-size:26px;color:#F2D492;';
    scene.appendChild(heading);

    const stage = document.createElement('div');
    stage.style.cssText = 'display:flex;align-items:center;gap:28px;padding:28px 36px;border-radius:20px;border:1px solid rgba(242,149,89,0.35);background:rgba(32,44,57,0.6);';
    const image = document.createElement('img');
    image.src = src;
    image.alt = 'Your selected 2D avatar';
    image.style.cssText = 'width:120px;height:170px;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.35));';
    const message = document.createElement('p');
    message.style.cssText = 'max-width:320px;margin:0;font-size:14px;line-height:1.6;color:#BDB68F;';
    message.textContent = 'You are in the room in 2D mode. The 3D engine is unavailable on this device or network right now; your avatar and live room presence still work.';
    stage.append(image, message);
    scene.appendChild(stage);

    const leave = document.createElement('button');
    leave.textContent = 'Leave room';
    leave.style.cssText = 'padding:10px 18px;border-radius:10px;border:1px solid rgba(242,149,89,0.5);background:#F29559;color:#202C39;font:600 14px/1 Inter,sans-serif;cursor:pointer;';
    leave.addEventListener('click', () => {
        game.style.display = 'none';
        game.innerHTML = '';
        document.getElementById('dashboard')?.style.setProperty('display', 'block');
    });
    scene.appendChild(leave);

    game.appendChild(scene);
    console.log('[DEBUG] Entered room in 2D mode');
}


// Load 3D GLB avatar model
function load3DAvatar(modelPath) {
    console.log('[DEBUG] Loading 3D avatar model:', modelPath);
    
    if (!THREE.GLTFLoader) {
        console.warn('[DEBUG] GLTFLoader not available, falling back to geometric avatar');
        createGeometricAvatar();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        modelPath,
        (gltf) => {
            // Success - add 3D model to scene
            const avatar = gltf.scene;
            avatar.scale.setScalar(1);
            avatar.position.set(0, 0, 2);
            
            // Enable shadows
            avatar.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            AppState.scene.add(avatar);
            AppState.avatar = avatar;
            
            console.log('[DEBUG] 3D avatar loaded successfully');
        },
        (progress) => {
            const percent = (progress.loaded / progress.total * 100);
            console.log('[DEBUG] Avatar loading progress:', percent + '%');
        },
        (error) => {
            console.error('[ERROR] Failed to load 3D avatar:', error);
            console.log('[DEBUG] Falling back to geometric avatar');
            createGeometricAvatar();
        }
    );
}

// Create geometric avatar as fallback
function createGeometricAvatar() {
    // Create a simple avatar representation
    const avatarGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf29559 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    avatarGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d492 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.4;
    head.castShadow = true;
    avatarGroup.add(head);

    avatarGroup.position.set(0, 0, 2);
    AppState.scene.add(avatarGroup);
    AppState.avatar = avatarGroup;

    console.log('[DEBUG] Geometric avatar created');
}

// 3D Avatar selection function
function selectPreset3D(modelPath) {
    console.log('[DEBUG] Selecting 3D preset avatar:', modelPath);
    
    try {
        if (!modelPath) {
            throw new Error('No model path provided');
        }
        
        // Update selected avatar with 3D model info
        AppState.selectedAvatar = {
            type: '3d-model',
            modelPath: modelPath,
            url: modelPath
        };
        
        // Update UI
        const enterRoomBtn = document.getElementById('enter-room-btn');
        const presets = document.querySelectorAll('.avatar-preset');
        
        // Update selection visuals
        presets.forEach(preset => {
            const isSelected = preset.getAttribute('data-model') === modelPath;
            preset.classList.toggle('selected', isSelected);
        });
        
        // Enable enter button
        if (enterRoomBtn) {
            enterRoomBtn.disabled = false;
            console.log('[DEBUG] Enabled enter room button for 3D avatar');
        }
        
        console.log('[DEBUG] 3D avatar selected successfully:', modelPath);
        
    } catch (error) {
        console.error('[ERROR] Failed to select 3D avatar:', error);
        
        // Fallback to 2D avatar
        console.log('[DEBUG] Falling back to 2D avatar selection');
        AppState.selectedAvatar = {
            type: 'preset',
            id: 'female1',
            url: AVATAR_ASSETS['female1']
        };
        
        // Enable enter button even with fallback
        const enterRoomBtn = document.getElementById('enter-room-btn');
        if (enterRoomBtn) {
            enterRoomBtn.disabled = false;
        }
        
        showErrorNotification('3D avatar not available. Using default avatar instead.');
    }
}

// Movement controls setup
function setupMovementControls() {
    // Add event listeners for keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    console.log('[DEBUG] Movement controls initialized');
}

// Avatar movement state
const movement = {
    keys: {},
    velocity: { x: 0, y: 0, z: 0 },
    speed: 0.12,
    runSpeed: 0.24,
    jumpSpeed: 0.3,
    gravity: 0.015,
    onGround: true,
    isSitting: false,
    originalY: 0
};

const MOVE_FORWARD = ['KeyW', 'ArrowUp'];
const MOVE_BACK = ['KeyS', 'ArrowDown'];
const MOVE_LEFT = ['KeyA', 'ArrowLeft'];
const MOVE_RIGHT = ['KeyD', 'ArrowRight'];
const MOVE_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

function isTypingTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true;
}

// Key input handlers
function onKeyDown(event) {
    if (isTypingTarget(event.target)) return;

    movement.keys[event.code] = true;
    inputState.keys[event.code] = true;

    if (MOVE_CODES.includes(event.code)) {
        event.preventDefault();
    }

    // Handle sitting (C key)
    if (event.code === 'KeyC') {
        if (!movement.isSitting) sitAvatar();
        else standAvatar();
    }
}

function onKeyUp(event) {
    movement.keys[event.code] = false;
    inputState.keys[event.code] = false;
}

// Sitting functions
function sitAvatar() {
    if (!AppState.avatar || movement.isSitting) return;
    
    movement.isSitting = true;
    movement.originalY = AppState.avatar.position.y;
    
    // Lower avatar to sitting position
    AppState.avatar.position.y -= 0.5;
    
    // Rotate avatar slightly for sitting pose
    AppState.avatar.rotation.x = -0.1;
    
    console.log('[DEBUG] Avatar sitting');
}

function standAvatar() {
    if (!AppState.avatar || !movement.isSitting) return;
    
    movement.isSitting = false;
    
    // Restore avatar to standing position
    AppState.avatar.position.y = movement.originalY;
    AppState.avatar.rotation.x = 0;
    
    console.log('[DEBUG] Avatar standing');
}

// Update avatar position based on input
function updateAvatarMovement() {
    if (!AppState.avatar || movement.isSitting) return;

    // Determine movement speed (running vs walking)
    const isRunning = movement.keys['ShiftLeft'] || movement.keys['ShiftRight'];
    const currentSpeed = isRunning ? movement.runSpeed : movement.speed;

    let directionX = 0;
    let directionZ = 0;

    if (MOVE_FORWARD.some((code) => movement.keys[code])) directionZ -= 1;
    if (MOVE_BACK.some((code) => movement.keys[code])) directionZ += 1;
    if (MOVE_LEFT.some((code) => movement.keys[code])) directionX -= 1;
    if (MOVE_RIGHT.some((code) => movement.keys[code])) directionX += 1;

    const length = Math.hypot(directionX, directionZ);
    if (length > 0) {
        directionX /= length;
        directionZ /= length;
    }

    const targetX = directionX * currentSpeed;
    const targetZ = directionZ * currentSpeed;

    // Smooth acceleration / deceleration
    movement.velocity.x += (targetX - movement.velocity.x) * 0.35;
    movement.velocity.z += (targetZ - movement.velocity.z) * 0.35;

    if (Math.abs(movement.velocity.x) < 0.0005) movement.velocity.x = 0;
    if (Math.abs(movement.velocity.z) < 0.0005) movement.velocity.z = 0;

    // Jump
    if (movement.keys['Space'] && movement.onGround) {
        movement.velocity.y = movement.jumpSpeed;
        movement.onGround = false;
    }

    if (!movement.onGround) {
        movement.velocity.y -= movement.gravity;
    }

    // Update avatar position
    AppState.avatar.position.x += movement.velocity.x;
    AppState.avatar.position.z += movement.velocity.z;
    AppState.avatar.position.y += movement.velocity.y;

    // Face the direction of travel
    if (length > 0) {
        const targetRotation = Math.atan2(directionX, directionZ);
        let delta = targetRotation - AppState.avatar.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        AppState.avatar.rotation.y += delta * 0.2;
    }

    // Ground collision (simple)
    if (AppState.avatar.position.y <= 0) {
        AppState.avatar.position.y = 0;
        movement.velocity.y = 0;
        movement.onGround = true;
    }

    // Boundary limits (keep avatar in scene)
    AppState.avatar.position.x = Math.max(-14, Math.min(14, AppState.avatar.position.x));
    AppState.avatar.position.z = Math.max(-14, Math.min(14, AppState.avatar.position.z));

    // Update camera to follow avatar
    updateCameraFollow();
}

// Camera follow system
function updateCameraFollow() {
    if (!AppState.avatar || !AppState.camera) return;
    
    // Third-person camera behind and above avatar
    const cameraOffset = new THREE.Vector3(0, 3.2, 8);
    const targetPosition = AppState.avatar.position.clone().add(cameraOffset);
    
    // Smooth camera movement
    AppState.camera.position.lerp(targetPosition, 0.12);
    AppState.camera.lookAt(AppState.avatar.position.x, AppState.avatar.position.y + 1, AppState.avatar.position.z);
}

// Loading screen management (disabled)
function showLoadingScreen(message = 'Loading...') {
    // Loading screen disabled
}

function hideLoadingScreen() {
    // Loading screen disabled
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
    
    // The enter-room button is rebound here to this app's enterRoom, which
    // understands the presets selected above and can fall back to 2D. The
    // avatar-system binding read its own separate selection state and refused
    // to enter when a preset was chosen here.
    if (elements.enterRoomBtn) {
        elements.enterRoomBtn.onclick = () => {
            if (!AppState.selectedAvatar) {
                showErrorNotification('Please select an avatar first');
                return;
            }
            if (!AppState.selectedRoom && window.selectRoom) {
                window.selectRoom('mentor-room');
            }
            enterRoom();
        };
    }
    console.log('[DEBUG] Enter room button bound to app enterRoom');
    
    // Initialize global functions
    window.selectRoom = selectRoom;
    window.closeAvatarModal = closeAvatarModal;
    window.selectPreset = selectPreset;
    window.selectPreset3D = selectPreset3D;
    
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
        
        // Store selected room in localStorage to persist it
        localStorage.setItem('selectedRoom', roomId);
        
        // Update application state
        AppState.selectedRoom = roomId;
        AppState.currentRoom = roomId;
        
        // Get UI elements
        const elements = {
            dashboard: document.getElementById('dashboard'),
            avatarModal: document.getElementById('avatar-modal'),
            roomName: document.getElementById('current-room-name')
        };
        
        // Show avatar selection modal
        if (elements.avatarModal) {
            elements.avatarModal.style.display = 'flex';
            // Ensure it's in front (above the live-rooms panel)
            elements.avatarModal.style.zIndex = '10000';
        } else {
            throw new Error('Avatar modal not found');
        }
        
        // Update room name if element exists
        if (elements.roomName) {
            elements.roomName.textContent = roomId.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
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
    raycaster: typeof THREE !== 'undefined' ? new THREE.Raycaster() : null
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
let animationFrameId = null;

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Update avatar movement
    updateAvatarMovement();

    // Render the scene
    if (AppState.renderer && AppState.scene && AppState.camera) {
        AppState.renderer.render(AppState.scene, AppState.camera);
    }
}

function startAnimationLoop() {
    if (animationFrameId !== null) return;
    animate();
}

function stopAnimationLoop() {
    if (animationFrameId === null) return;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

// Input handlers
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

// Room functions
function showMovePad() {
    if (document.getElementById('ac-move-pad')) return;

    const pad = document.createElement('div');
    pad.id = 'ac-move-pad';
    pad.className = 'ac-move-pad';

    [
        ['up', '↑', 'ArrowUp'],
        ['left', '←', 'ArrowLeft'],
        ['down', '↓', 'ArrowDown'],
        ['right', '→', 'ArrowRight'],
    ].forEach(([className, label, code]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.setAttribute('aria-label', `Move ${className}`);
        const press = (value) => (event) => {
            event.preventDefault();
            movement.keys[code] = value;
            inputState.keys[code] = value;
        };
        button.addEventListener('pointerdown', press(true));
        button.addEventListener('pointerup', press(false));
        button.addEventListener('pointerleave', press(false));
        button.addEventListener('pointercancel', press(false));
        pad.appendChild(button);
    });

    const hint = document.createElement('div');
    hint.id = 'ac-move-hint';
    hint.className = 'ac-move-hint';
    hint.textContent = 'Arrow keys or WASD to walk. Shift to run, Space to jump.';

    document.body.appendChild(pad);
    document.body.appendChild(hint);
}

function hideMovePad() {
    document.getElementById('ac-move-pad')?.remove();
    document.getElementById('ac-move-hint')?.remove();
}

function exitRoom() {
    stopAnimationLoop();
    hideMovePad();

    // Reset state
    AppState.currentRoom = null;
    AppState.avatar = null;
    AppState.initialized = false;
    AppState.scene = null;
    AppState.camera = null;

    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
    
    // Hide game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
}

function closeAvatarModal() {
    // Hide avatar modal
    const avatarModal = document.getElementById('avatar-modal');
    if (avatarModal) {
        avatarModal.style.display = 'none';
    }
    
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
    
    // Reset state
    AppState.selectedAvatar = null;
}

let roomEntryInFlight = false;

function enterRoom() {
    console.log('[DEBUG] Attempting to enter room');

    if (roomEntryInFlight) return;
    roomEntryInFlight = true;

    try {
        if (!AppState.selectedRoom) {
            throw new Error('No room selected');
        }
        
        if (!AppState.selectedAvatar) {
            throw new Error('No avatar selected');
        }
        
        // Without the 3D engine (offline CDN or unsupported device) a chosen
        // 2D avatar still enters the room in 2D mode instead of getting stuck.
        if (typeof THREE === 'undefined') {
            if (AppState.selectedAvatar.type === 'preset') {
                enter2DRoom();
                roomEntryInFlight = false;
                return;
            }
            throw new Error('The 3D engine could not load. Choose a 2D avatar to enter without 3D.');
        }
        
        // Hide modal and show loading screen
        const avatarModal = document.getElementById('avatar-modal');
        const loadingScreen = document.getElementById('loading-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (avatarModal) avatarModal.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'block';
        if (gameContainer) gameContainer.style.display = 'block';
        
        // Initialize 3D environment
        setup3DEnvironment().then((ready) => {
            roomEntryInFlight = false;
            if (!ready) {
                if (AppState.selectedAvatar && AppState.selectedAvatar.type === 'preset') {
                    enter2DRoom();
                    return;
                }
                showErrorNotification('Failed to enter room. Please try again.');
                if (avatarModal) avatarModal.style.display = 'block';
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (gameContainer) gameContainer.style.display = 'none';
                return;
            }
            // Hide loading screen and start animation
            if (loadingScreen) loadingScreen.style.display = 'none';
            startAnimationLoop();
            showMovePad();
            console.log('[DEBUG] Room entry complete');
        }).catch(error => {
            roomEntryInFlight = false;
            console.error('[ERROR] Failed to enter room:', error);
            // A 2D preset can always fall back to the 2D room view.
            if (AppState.selectedAvatar && AppState.selectedAvatar.type === 'preset') {
                enter2DRoom();
                return;
            }
            showErrorNotification('Failed to enter room. Please try again.');
            
            // Reset UI state
            if (avatarModal) avatarModal.style.display = 'block';
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'none';
        });
    } catch (error) {
        roomEntryInFlight = false;
        console.error('[ERROR] Failed to enter room:', error);
        showErrorNotification(error.message);
    }
}

// Debug logging function
function log(context, message, type = 'info') {
    if (!window.DEBUG) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}] [${context}]`;
    
    switch (type) {
        case 'error':
            console.error(prefix, message);
            break;
        case 'warn':
            console.warn(prefix, message);
            break;
        case 'debug':
            console.debug(prefix, message);
            break;
        default:
            console.log(prefix, message);
    }
}
