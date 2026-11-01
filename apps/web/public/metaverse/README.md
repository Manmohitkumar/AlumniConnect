# 3D Metaverse Learning Hub

A fully immersive 3D virtual learning environment with avatar customization, voice chat, and interactive spaces for mentorship, innovation, and career guidance.

## 🌟 Features

### 🎭 Avatar System
- **Photo Upload**: Upload your photo to generate a personalized avatar
- **Ready Player Me Integration**: Create high-quality 3D avatars using Ready Player Me API
- **Preset Avatars**: Choose from multiple preset avatar options
- **Real-time Avatar Loading**: Dynamic avatar switching and customization

### 🎮 3D Movement & Navigation
- **First-Person View**: Immersive first-person perspective like in games
- **Third-Person View**: Traditional third-person camera following your avatar
- **Free-Look Mode**: Independent camera control with pointer lock
- **Smooth Movement**: WASD controls with running (Shift) and jumping (Space)
- **Interactive Objects**: Click on furniture and objects to interact

### 🏢 Virtual Rooms

#### Mentor Room
- **Round Conference Table**: Interactive table with 8 chairs arranged in a circle
- **Voice Chat Ready**: Perfect for group discussions and mentorship sessions
- **Interactive Whiteboard**: Click to activate drawing mode
- **Ambient Lighting**: Professional meeting atmosphere

#### Innovation Lab
- **Digital Screens**: Multiple display screens for project presentations
- **Lab Tables**: Workspace areas for collaborative projects
- **Modern Tech Environment**: Futuristic design for innovation showcase

#### Career Hall
- **Information Kiosks**: Interactive career guidance stations
- **Consultation Desks**: Private spaces for career counseling
- **Professional Atmosphere**: Designed for career development activities

### 🎤 Voice Chat System
- **Real-time Audio**: WebRTC-based voice communication
- **Microphone Controls**: Toggle mic on/off with visual indicators
- **Voice Activity Detection**: Visual feedback when speaking
- **Audio Processing**: Advanced audio context for voice enhancement

### 👥 Multiplayer Support
- **Multiple Avatars**: See other users in the same room
- **Name Labels**: Floating name tags above other avatars
- **User Count Display**: Real-time user count in the room
- **Simulated Users**: Demo mode with AI-controlled avatars

### 🎨 User Interface
- **Modern Design**: Clean, professional interface with dark/light mode support
- **Responsive Layout**: Works on desktop and mobile devices
- **Interactive Controls**: Easy-to-use control panels
- **Real-time Chat**: Text chat system for communication

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Microphone access for voice chat features
- Internet connection for Ready Player Me integration

### Installation
1. Clone or download the project files
2. Open `index.html` in a web browser
3. Allow microphone access when prompted
4. Start exploring the 3D environment!

### Usage

#### Creating Your Avatar
1. Select a room (Mentor Room, Innovation Lab, or Career Hall)
2. Choose your avatar creation method:
   - **Upload Photo**: Upload your photo for AI-generated avatar
   - **Ready Player Me**: Create avatar using Ready Player Me service
   - **Preset Avatars**: Choose from predefined avatar options
3. Enter your name and click "Enter Room"

#### Navigation Controls
- **WASD**: Move around the 3D space
- **Mouse**: Look around (in free-look mode)
- **Shift**: Run faster
- **Space**: Jump
- **Click**: Interact with objects

#### Camera Views
- **First Person**: Click "👁️ First Person" for immersive view
- **Third Person**: Click "👤 Third Person" for traditional view
- **Free Look**: Click "🔄 Free Look" for independent camera control

#### Voice Chat
- Click the microphone button to toggle voice chat
- Green glow indicates when you're speaking
- Voice activity is monitored in real-time

## 🛠️ Technical Features

### 3D Graphics
- **Three.js**: Advanced 3D graphics rendering
- **WebGL**: Hardware-accelerated graphics
- **Shadows & Lighting**: Realistic lighting with shadow mapping
- **Interactive Objects**: Ray-casting for object interaction

### Audio System
- **Web Audio API**: Advanced audio processing
- **Voice Activity Detection**: Real-time audio analysis
- **WebRTC**: Peer-to-peer voice communication
- **Audio Context**: Professional audio handling

### Avatar Technology
- **Ready Player Me API**: High-quality 3D avatar generation
- **GLTF Loading**: Efficient 3D model loading
- **Dynamic Textures**: Real-time texture updates
- **Animation System**: Smooth avatar animations

## 🔧 Configuration

### Ready Player Me Setup
1. Get your API key from [Ready Player Me](https://readyplayer.me)
2. Replace `YOUR_API_KEY_HERE` in `app.js` with your actual API key
3. Configure the base URL if needed

### Customization
- Modify room layouts in the `createRoomEnvironment()` functions
- Add new avatar presets in the `loadPresetAvatar()` function
- Customize UI colors in the CSS variables
- Add new interactive objects by extending the `handleObjectInteraction()` function

## 🌐 Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## 📱 Mobile Support
- Responsive design for mobile devices
- Touch controls for movement
- Optimized performance for mobile GPUs

## 🔒 Privacy & Security
- All audio processing happens locally
- No data is stored on external servers
- Microphone access is optional
- Ready Player Me integration is secure

## 🎯 Future Enhancements
- Real-time multiplayer with WebSocket connections
- Advanced avatar animations and gestures
- Screen sharing integration
- Virtual whiteboard with drawing tools
- File sharing capabilities
- Room recording and playback
- Advanced lighting and weather effects

## 📄 License
This project is open source and available under the MIT License.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📞 Support
For support or questions, please open an issue in the project repository.

---

**Experience the future of virtual learning with our immersive 3D Metaverse Hub!** 🚀

