// Avatar Selection System
class AvatarSystem {
    constructor() {
        this.selectedAvatar = null;
        this.activeTab = 'preset';
        this.initializeEventListeners();
        this.initAvaturnUpload();
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.switchTab(tabId);
                
                // Clear preview when switching tabs
                if (tabId === 'avaturn-tab') {
                    const preview = document.getElementById('avaturn-preview');
                    if (preview) {
                        preview.innerHTML = '<p>Load your Avaturn model to see preview</p>';
                    }
                }
            });
        });

        // File upload handling
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('photo-upload');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // Ready Player Me iframe messaging
        window.addEventListener('message', this.handleRPMMessage.bind(this));

        // Preset avatar selection
        document.querySelectorAll('.avatar-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const presetId = preset.getAttribute('data-preset');
                const modelUrl = preset.getAttribute('data-model');
                if (modelUrl) {
                    // Handle 3D preset
                    this.loadAvatarModel(modelUrl);
                } else {
                    // Handle 2D preset
                    const avatarPath = `assets/avatars/${presetId}.svg`;
                    this.selectedAvatar = {
                        type: 'preset',
                        data: avatarPath
                    };
                    // Enable the enter button and show success
                    const enterButton = document.getElementById('enter-room-btn');
                    if (enterButton) {
                        enterButton.disabled = false;
                    }
                    showNotification('Avatar selected successfully!', 'success');
                }
            });
        });
    }

    switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });

        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);

        if (selectedTab) selectedTab.style.display = 'block';
        if (selectedBtn) selectedBtn.classList.add('active');

        this.activeTab = tabId;
        this.updateEnterButton();
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.target.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files: files } });
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size must be less than 5MB', 'error');
            return;
        }

        // Read and preview file
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadedPhoto = document.getElementById('uploaded-photo');
            const photoPreview = document.getElementById('photo-preview');
            const uploadArea = document.getElementById('upload-area');

            if (photoPreview) {
                photoPreview.src = e.target.result;
                photoPreview.onload = () => {
                    if (uploadedPhoto) uploadedPhoto.classList.remove('hidden');
                    if (uploadArea) uploadArea.classList.add('hidden');
                };
            }

            this.selectedAvatar = {
                type: 'custom',
                data: e.target.result
            };
            this.updateEnterButton();
            showNotification('Photo uploaded successfully', 'success');
        };

        reader.onerror = () => {
            showNotification('Error reading file', 'error');
        };

        reader.readAsDataURL(file);
    }

    // Unified method for loading 3D models
    initAvaturnUpload() {
        const uploadArea = document.getElementById('avaturn-upload-area');
        const fileInput = document.getElementById('avaturn-file');

        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop handling
        uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragging');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragging');
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragging');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleAvaturnFile(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleAvaturnFile(e.target.files[0]);
            }
        });
    }

    handleAvaturnFile(file) {
        if (!file.name.toLowerCase().endsWith('.glb')) {
            showNotification('Please upload a GLB file from Avaturn', 'error');
            return;
        }
        // Avoid loading unexpectedly large local models into the browser.
        if (file.size > 25 * 1024 * 1024) {
            showNotification('Please choose an Avaturn GLB under 25 MB', 'error');
            return;
        }

        const preview = document.getElementById('avaturn-preview');
        if (preview) {
            preview.classList.add('loading');
        }

        // Create object URL for the file
        const modelUrl = URL.createObjectURL(file);
        
        // Get selected room from dropdown
        const roomSelect = document.getElementById('avaturn-room');
        let selectedRoom = 'innovation-lab';
        if (roomSelect) {
            selectedRoom = roomSelect.value;
        }
        // Set the room
        if (window.selectRoom) {
            window.selectRoom(selectedRoom);
        } else if (window.AppState) {
            window.AppState.currentRoom = selectedRoom;
        }

        // Load the model
        // Keep this object URL alive until the room loads the model. Revoking
        // it here breaks the selected avatar when Enter Room runs afterwards.
        this.loadAvatarModel(modelUrl, file.name);
    }

    loadAvatarModel(modelUrl, displayName = '3D avatar') {
        showNotification('Loading 3D avatar model...', 'info');

        // Check if THREE and GLTFLoader are available
        if (!window.THREE || !THREE.GLTFLoader) {
            console.error('THREE.js or GLTFLoader not loaded');
            showNotification('Error: 3D system not initialized properly', 'error');
            return;
        }

        // Create the loader
        const testLoader = new THREE.GLTFLoader();

        // First check if the file exists
        fetch(modelUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Model file not found');
                }
                // File exists, proceed with loading
                testLoader.load(
                    modelUrl,
                    (gltf) => {
                        // Update the avatar system with the working link
                        this.selectedAvatar = {
                            type: 'readyplayer',
                            data: modelUrl,
                            modelPath: modelUrl,
                            name: displayName,
                            model: gltf
                        };

                        // Show success in the preview
                        this.updateModelPreview(displayName);
                        showNotification('3D avatar model loaded successfully!', 'success');
                        
                        // Enable the enter button
                        const enterButton = document.getElementById('enter-room-btn');
                        if (enterButton) {
                            enterButton.disabled = false;
                        }
                    },
                    (xhr) => {
                        // Loading progress
                        const percent = (xhr.loaded / xhr.total) * 100;
                        showNotification(`Loading 3D model: ${Math.round(percent)}%`, 'info');
                    },
                    (error) => {
                        console.error('Error loading 3D model:', error);
                        showNotification('Error loading 3D model. Please check if the file exists in assets/3d-avatars/.', 'error');
                    }
                );
            })
            .catch(error => {
                console.error('Error checking model file:', error);
                showNotification('Error: Could not find the 3D model file. Please check assets/3d-avatars/.', 'error');
            });
    }

    handleRPMMessage(event) {
        const { source, eventName, data } = event.data;
        
        // Only handle events from Ready Player Me
        if (source !== 'readyplayerme') {
            return;
        }

        // Handle the avatar URL
        if (eventName === 'v1.avatar.exported') {
            const avatarUrl = data.url;
            // Update the link input field with the new avatar URL
            const linkInput = document.getElementById('rpm-avatar-link');
            if (linkInput) {
                linkInput.value = avatarUrl;
            }
            this.selectedAvatar = {
                type: 'readyplayer',
                data: avatarUrl
            };

            // Store avatar data
            window.selectedAvatar = this.selectedAvatar;
            localStorage.setItem('lastAvatarUrl', avatarUrl);

            // Show the continue button in the navigation bar
            if (window.rpmContinueButton) {
                window.rpmContinueButton.style.display = 'block';
                window.rpmContinueButton.style.animation = 'pulse 2s infinite';
            }
            
            showNotification('Avatar created! Click "Continue to Room" to proceed', 'success');
        }
    }

    selectPresetAvatar(presetId) {
        if (!AVATAR_ASSETS[presetId]) {
            showNotification('Invalid preset avatar', 'error');
            return;
        }

        document.querySelectorAll('.avatar-preset').forEach(preset => {
            preset.classList.remove('selected');
        });

        const selectedPreset = document.querySelector(`[data-preset="${presetId}"]`);
        if (selectedPreset) {
            selectedPreset.classList.add('selected');
        }

        this.selectedAvatar = {
            type: 'preset',
            data: presetId
        };
        this.updateEnterButton();
        showNotification(`Selected ${presetId} avatar`, 'success');
    }

    // Helper to get selected room from UI
    getSelectedRoom() {
        // Try Avaturn tab dropdown first
        const roomSelect = document.getElementById('avaturn-room');
        if (roomSelect && roomSelect.value) {
            return roomSelect.value;
        }
        // Fallback to AppState or default
        if (window.AppState && window.AppState.currentRoom) {
            return window.AppState.currentRoom;
        }
        return 'mentor-room'; // Default
    }

    // Update enter room logic for all avatar types
    updateEnterButton() {
        const enterButton = document.getElementById('enter-room-btn');
        if (!enterButton) return;
        enterButton.disabled = !this.selectedAvatar;
        enterButton.onclick = () => {
            // Always set the room before entering
            const selectedRoom = this.getSelectedRoom();
            if (window.selectRoom) {
                window.selectRoom(selectedRoom);
            } else if (window.AppState) {
                window.AppState.currentRoom = selectedRoom;
            }
            // Keep the active app state in sync so the live enterRoom
            // implementation sees the selected room and avatar.
            if (window.AppState) {
                window.AppState.selectedRoom = selectedRoom;
                window.AppState.selectedAvatar = this.selectedAvatar;
            }
            // Enter room with selected avatar
            if (window.enterRoom) {
                window.enterRoom();
            }
        };
    }

    updateRPMPreview(avatarUrl) {
        const previewContainer = document.getElementById('readyplayer-preview');
        if (previewContainer) {
            // Display loading state
            previewContainer.innerHTML = `
                <div style="background: #f0f0f0; padding: 20px; border-radius: 12px; text-align: center;">
                    <div class="preview-content">
                        <img src="${avatarUrl.replace('.glb', '.png')}" alt="Ready Player Me Avatar" 
                             style="width: 250px; height: 250px; border-radius: 12px; object-fit: cover; margin-bottom: 15px;">
                        <p style="color: #2c3e50; margin: 0; font-size: 16px;">3D Avatar Model URL:</p>
                        <input type="text" value="${avatarUrl}" 
                               style="width: 100%; padding: 8px; margin: 10px 0; border-radius: 4px; border: 1px solid #ccc;"
                               readonly>
                        <p style="color: #2c3e50; margin: 5px 0; font-size: 14px;">✓ .glb 3D model ready for use</p>
                    </div>
                </div>
            `;
        }
    }

    updateModelPreview(displayName) {
        const previewContainer = document.getElementById('avaturn-preview');
        if (!previewContainer) return;
        previewContainer.innerHTML = `
            <div class="preview-placeholder" role="status">
                <i class="fas fa-check-circle" aria-hidden="true"></i>
                <p><strong>3D avatar ready</strong></p>
                <p>${displayName.replace(/[<>&"']/g, '')}</p>
                <p>Select a room and choose <em>Enter Room with Selected Avatar</em>.</p>
            </div>`;
    }

    getSelectedAvatar() {
        return this.selectedAvatar;
    }
}

// Initialize avatar system
const avatarSystem = new AvatarSystem();

// Export for global use
window.avatarSystem = avatarSystem;

// Functions for HTML onclick handlers
window.selectPreset = (presetId) => avatarSystem.selectPresetAvatar(presetId);
window.loadAvatarFromLink = () => {
    const linkInput = document.getElementById('rpm-avatar-link');
    if (!linkInput || !linkInput.value) {
        showNotification('Please enter an avatar link', 'error');
        return;
    }

    const avatarUrl = linkInput.value.trim();
    
    // Validate the URL format
    if (!avatarUrl.includes('readyplayer.me') || !avatarUrl.toLowerCase().endsWith('.glb')) {
        showNotification('Please enter a valid Ready Player Me .glb model link', 'error');
        return;
    }

    // Test if the 3D model is accessible
    const testLoader = new THREE.GLTFLoader();
    showNotification('Loading avatar model...', 'info');

    testLoader.load(avatarUrl, 
        (gltf) => {
            // Update the avatar system with the working link
            avatarSystem.selectedAvatar = {
                type: 'readyplayer',
                data: avatarUrl,
                model: gltf
            };

            // Show success in the preview
            avatarSystem.updateRPMPreview(avatarUrl);
            showNotification('Avatar model loaded successfully!', 'success');
            
            // Enable the enter button
            const enterButton = document.getElementById('enter-room-btn');
            if (enterButton) {
                enterButton.disabled = false;
                enterButton.classList.add('btn--primary');
            }

            // Store avatar data globally
            window.selectedAvatar = avatarSystem.selectedAvatar;
            localStorage.setItem('lastAvatarUrl', avatarUrl);
            
            showNotification('3D Avatar loaded successfully!', 'success');
        },
        (progress) => {
            // Loading progress
            const percent = Math.round((progress.loaded / progress.total) * 100);
            if (percent === 100) {
                showNotification('Processing avatar...', 'info');
            }
        },
        (error) => {
            console.error('Error loading avatar:', error);
            showNotification('Error loading 3D model. Please check the link and try again.', 'error');
        }
    );
};

window.openReadyPlayerMe = () => {
    // Create container for iframe and navigation
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        flex-direction: column;
    `;

    // Add navigation bar
    const navBar = document.createElement('div');
    navBar.style.cssText = `
        background: #1a1a2e;
        padding: 10px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    // Add back button
    const backButton = document.createElement('button');
    backButton.innerHTML = '← Back to Avatar Selection';
    backButton.style.cssText = `
        padding: 8px 16px;
        background: #00b894;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    backButton.onmouseover = () => backButton.style.background = '#00a785';
    backButton.onmouseout = () => backButton.style.background = '#00b894';
    backButton.onclick = () => {
        container.remove();
        const avatarModal = document.getElementById('avatar-modal');
        if (avatarModal) {
            avatarModal.style.display = 'flex';
        }
    };

    // Add continue button
    const continueButton = document.createElement('button');
    continueButton.innerHTML = 'Continue to Room →';
    continueButton.style.cssText = `
        padding: 8px 16px;
        background: #0984e3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: none;
    `;
    continueButton.onclick = () => {
        container.remove();
        if (window.selectedAvatar) {
            window.enterRoom();
        }
    };

    navBar.appendChild(backButton);
    navBar.appendChild(continueButton);
    container.appendChild(navBar);

    // Create and add the RPM iframe
    const rpmFrame = document.createElement('iframe');
    rpmFrame.src = 'https://demo.readyplayer.me/avatar?frameApi';
    rpmFrame.style.cssText = `
        border: none;
        width: 100%;
        height: calc(100% - 50px);
    `;
    container.appendChild(rpmFrame);

    // Add the container to the body
    document.body.appendChild(container);

    // Store reference to continue button for later use
    window.rpmContinueButton = continueButton;
};

window.enterRoom = () => {
    try {
        const avatar = avatarSystem.getSelectedAvatar();
        if (!avatar) {
            showNotification('Please select an avatar first', 'error');
            return;
        }

        // Validate the avatar model. Ready Player Me links end in .glb; Avaturn
        // uploads arrive as blob: object URLs of .glb files and must be accepted.
        if (avatar.type === 'readyplayer') {
            const avatarUrl = avatar.data;
            const isAvaturnBlob = typeof avatarUrl === 'string' && avatarUrl.startsWith('blob:');
            const isValidModel = avatarUrl && (isAvaturnBlob || avatarUrl.toLowerCase().endsWith('.glb'));
            if (!isValidModel) {
                showNotification('Please select a valid 3D avatar model (.glb file)', 'error');
                return;
            }
        }

        showNotification('Loading your avatar...', 'info');

        // Hide all initial UI elements
        const uiElements = {
            dashboard: document.getElementById('dashboard'),
            avatarModal: document.getElementById('avatar-modal'),
            gameContainer: document.getElementById('game-container'),
            metaverseSpace: document.getElementById('metaverse-space')
        };

        // Hide initial screens
        if (uiElements.dashboard) uiElements.dashboard.style.display = 'none';
        if (uiElements.avatarModal) uiElements.avatarModal.style.display = 'none';

        // Show 3D environment
        if (uiElements.gameContainer) {
            uiElements.gameContainer.style.display = 'block';
        }
        if (uiElements.metaverseSpace) {
            uiElements.metaverseSpace.classList.remove('hidden');
            uiElements.metaverseSpace.style.display = 'block';
        }

        // Set global state
        window.CURRENT_AVATAR = avatar;
        window.ENVIRONMENT_READY = true;

        // Initialize 3D environment
        init3DEnvironment(avatar);

        // Show welcome message
        showNotification('Welcome to the Metaverse!', 'success');

    } catch (error) {
        console.error('Error entering room:', error);
        showNotification('Error entering room. Please try again.', 'error');
    }
};
