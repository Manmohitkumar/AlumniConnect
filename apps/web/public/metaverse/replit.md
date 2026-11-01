# Metaverse Hub - 3D Learning Platform

## Overview

The Metaverse Hub is a comprehensive 3D virtual learning environment built with Three.js and WebGL. It provides immersive virtual spaces for mentorship, innovation showcases, and career guidance. The platform features realistic 3D avatars using Ready Player Me integration, first-person gaming controls, voice chat capabilities, and multiple interactive virtual rooms. Users can create personalized avatars, navigate through 3D environments with WASD controls, participate in virtual meetings, and earn points through gamification features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **3D Rendering Engine**: Three.js (r128) with WebGL for high-performance 3D graphics
- **Camera System**: Multiple view modes (first-person, third-person, free-look) with pointer lock controls
- **Animation System**: Built-in avatar animations for walking, running, and idle states
- **UI Framework**: Vanilla JavaScript with CSS Grid and Flexbox for responsive layouts
- **Modal System**: Custom modal implementation for avatar creation and room selection

### Avatar System
- **Ready Player Me Integration**: Full API integration for professional 3D avatar creation
- **Photo Upload**: AI-powered avatar generation from user photos
- **Preset Avatars**: Collection of pre-made 3D models (male/female business and casual variants)
- **Avatar Animations**: Automatic body part detection and smooth animation transitions
- **Customization**: Hair color, eye color, skin tone, and special effects support

### 3D Environment
- **Room System**: Three distinct virtual environments (Mentor Room, Innovation Lab, Career Hall)
- **Physics Engine**: Custom collision detection and movement physics
- **Lighting System**: Multi-light setup with ambient, directional, fill, and rim lighting
- **Materials**: Phong materials with realistic textures and shadow mapping
- **Interactive Objects**: Clickable furniture, whiteboards, and conference tables

### Gaming Controls
- **First-Person Controls**: Mouse look and WASD movement similar to FPS games
- **Physics Movement**: Running (Shift), jumping (Space) with gravity simulation
- **Camera Modes**: Seamless switching between different viewing perspectives
- **Pointer Lock**: Full-screen gaming experience with browser pointer lock API

### Audio System
- **Voice Chat**: WebRTC-based real-time voice communication
- **Text-to-Speech**: Web Speech API integration for character voices
- **Audio Processing**: Advanced audio context with volume controls
- **Voice Activity Detection**: Visual indicators for speaking participants

### Gamification
- **Points System**: Reward system for user interactions (sitting, using whiteboard, meetings)
- **Leaderboard**: Score tracking and high score display
- **Avatar Unlocks**: Progressive avatar unlocking based on earned points
- **Achievement System**: Multiple ways to earn points and unlock content

## External Dependencies

### Core Libraries
- **Three.js (r128)**: 3D graphics library for WebGL rendering
- **GLTFLoader**: Three.js loader for importing 3D model files
- **PointerLockControls**: Three.js controls for first-person camera movement

### Avatar Services
- **Ready Player Me API**: Third-party service for creating realistic 3D avatars
- **Sample Avatar URLs**: Pre-configured high-quality avatar models from Ready Player Me

### Web APIs
- **WebRTC**: Browser API for peer-to-peer voice chat functionality
- **Web Speech API**: Browser API for text-to-speech character voices
- **MediaStream API**: Browser API for microphone access and audio processing
- **Pointer Lock API**: Browser API for full-screen gaming controls

### Asset Management
- **GLB/GLTF Models**: 3D avatar models stored in assets/3d-avatars/
- **Texture Assets**: PNG preview images and material textures
- **Font Awesome**: Icon library for UI elements

### Development Tools
- **Python HTTP Server**: Local development server (python -m http.server 8000)
- **ESLint**: Code linting and quality assurance
- **CSS Custom Properties**: Modern CSS variable system for theming