// 3D Environment Setup
function init3DEnvironment(avatarData) {
    console.log('Initializing 3D environment with avatar:', avatarData);
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    console.log('Scene created:', scene);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
    console.log('Camera created:', camera.position);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    console.log('Renderer created:', renderer);

    // Add renderer to container
    const container = document.getElementById('metaverse-space');
    if (container) {
        // Remove any previous canvas
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(renderer.domElement);
        container.style.display = 'block';
        console.log('Renderer canvas attached to container.');
    } else {
        console.error('No metaverse-space container found!');
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    console.log('Lights added.');

    // Create debug cube at origin
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const debugCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    debugCube.position.set(0, 0.5, 0);
    scene.add(debugCube);

    // Create bright floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffff00,
        roughness: 0.5,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    console.log('Floor added.');

    // Load room based on selection
    let selectedRoom = window.AppState && window.AppState.currentRoom ? window.AppState.currentRoom : (window.currentRoom || 'mentor-room');
    console.log('Loading room:', selectedRoom);
    loadRoom(selectedRoom);
    
    // Load avatar
    loadAvatar(avatarData);
    console.log('Avatar loading called.');

    // Initialize controls
    initializeControls();
    console.log('Controls initialized.');

    // Start animation loop
    animate();
    console.log('Animation loop started.');
}

function loadRoom(roomId) {
    if (!roomData[roomId]) {
        console.error('Room not found:', roomId);
        return;
    }
    
    const room = roomData[roomId];
    
    // Set room info
    const roomNameEl = document.getElementById('current-room-name');
    if (roomNameEl) {
        roomNameEl.textContent = room.name;
    }
    
    // Create room geometry
    const walls = createRoomWalls(room);
    scene.add(walls);
    
    // Add room-specific furniture
    addRoomFurniture(room);
    
    // Initialize collision system
    initializeCollisions();
}

function createRoomWalls(room) {
    const wallsGroup = new THREE.Group();
    
    // Room dimensions
    const width = 20;
    const height = 8;
    const depth = 20;
    
    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: room.color || 0xcccccc,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Create walls
    const wallGeometry = new THREE.BoxGeometry(0.2, height, depth);
    
    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-width/2, height/2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    wallsGroup.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(width/2, height/2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    wallsGroup.add(rightWall);
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(width, height, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height/2, -depth/2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    wallsGroup.add(backWall);
    
    return wallsGroup;
}

function addRoomFurniture(room) {
    // Add basic furniture based on room type
    switch(currentRoom) {
        case 'mentor-room':
            addMentorRoomFurniture();
            break;
        case 'innovation-lab':
            addInnovationLabFurniture();
            break;
        case 'career-hall':
            addCareerHallFurniture();
            break;
    }
}

function loadAvatar(avatarData) {
    const loader = new THREE.GLTFLoader();
    
    // Show loading indicator
    showLoadingProgress(20);
    
    let avatarUrl;
    if (avatarData.type === 'preset') {
        avatarUrl = AVATAR_ASSETS[avatarData.data];
    } else if (avatarData.type === 'readyplayer') {
        avatarUrl = avatarData.data;
    } else {
        // For uploaded photos, use default avatar for now
        avatarUrl = AVATAR_ASSETS['male1'];
    }
    
    loader.load(avatarUrl, (gltf) => {
        avatar = gltf.scene;
        avatar.scale.set(0.5, 0.5, 0.5);
        avatar.position.set(0, 0, 0);
        scene.add(avatar);
        
        // Setup animations
        if (gltf.animations.length > 0) {
            avatarMixer = new THREE.AnimationMixer(avatar);
            
            // Find walk and idle animations
            gltf.animations.forEach((clip) => {
                if (clip.name.toLowerCase().includes('walk')) {
                    walkAnimation = avatarMixer.clipAction(clip);
                } else if (clip.name.toLowerCase().includes('idle')) {
                    idleAnimation = avatarMixer.clipAction(clip);
                }
            });
            
            // Start with idle animation
            if (idleAnimation) {
                idleAnimation.play();
            }
        }
        
        showLoadingProgress(60);
        initializePhysics();
        
    }, (progress) => {
        // Update loading progress
        const percent = (progress.loaded / progress.total) * 40 + 20;
        showLoadingProgress(percent);
        
    }, (error) => {
        console.error('Error loading avatar:', error);
        showNotification('Error loading avatar. Please try again.', 'error');
    });
}

function initializeControls() {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Show game UI
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.style.display = 'flex';
    }
    
    // Show metaverse space
    const metaverseSpace = document.getElementById('metaverse-space');
    if (metaverseSpace) {
        metaverseSpace.classList.remove('hidden');
    }
    
    // Setup keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Setup mouse controls
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onMouseClick);
    
    // Setup resize handler
    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update avatar position and animations
    if (avatarMixer) {
        avatarMixer.update(0.016);
    }
    
    if (avatar && isMoving) {
        updateAvatarMovement();
    }
    
    // Update camera
    updateCamera();
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Initialize physics system
function initializePhysics() {
    // Initialize collision objects
    initializeCollisions();
    
    // Hide loading screen
    showLoadingProgress(100);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}