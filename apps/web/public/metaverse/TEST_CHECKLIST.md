# 3D Metaverse Hub - Test Checklist

## 🧪 Testing Instructions

### 1. **Initial Setup**
- [ ] Open http://localhost:8000 in your browser
- [ ] Verify the dashboard loads with 3 room cards
- [ ] Check that the page title shows "Metaverse Hub - 3D Learning Platform"

### 2. **Room Selection**
- [ ] Click on "Mentor Room" - should open avatar creation modal
- [ ] Click on "Innovation Lab" - should open avatar creation modal  
- [ ] Click on "Career Hall" - should open avatar creation modal

### 3. **Avatar Creation - Upload Photo Tab**
- [ ] Click on "Upload Photo" tab
- [ ] Try uploading an image file (JPG/PNG)
- [ ] Verify photo preview appears
- [ ] Click "Remove" button - photo should disappear
- [ ] Enter a name in the name field
- [ ] Click "Generate Avatar" - should enable "Enter Room" button

### 4. **Avatar Creation - Ready Player Me Tab**
- [ ] Click on "Ready Player Me" tab
- [ ] Click "Open Ready Player Me" - should open new window
- [ ] Enter a Ready Player Me URL (optional for testing)
- [ ] Enter a name
- [ ] Click "Load Avatar" - should enable "Enter Room" button

### 5. **Avatar Creation - Preset Avatars Tab**
- [ ] Click on "Preset Avatars" tab
- [ ] Click on different preset avatars (Male 1, Female 1, etc.)
- [ ] Verify selection highlighting works
- [ ] Enter a name
- [ ] Click "Use This Avatar" - should enable "Enter Room" button

### 6. **3D Environment - Basic Navigation**
- [ ] Click "Enter Room" button
- [ ] Verify 3D environment loads (should see 3D room)
- [ ] Test WASD movement (W=forward, A=left, S=backward, D=right)
- [ ] Test mouse look around (move mouse to look)
- [ ] Test Shift key for running (faster movement)
- [ ] Test Space key for jumping

### 7. **Camera Views**
- [ ] Click "👁️ First Person" - should switch to first-person view
- [ ] Click "👤 Third Person" - should switch to third-person view
- [ ] Click "🔄 Free Look" - should enable pointer lock and free camera

### 8. **Voice Chat**
- [ ] Click microphone button to toggle mic on/off
- [ ] Verify button text changes (🎤 Mic On / 🔇 Mic Off)
- [ ] Allow microphone access when prompted
- [ ] Speak into microphone - button should glow green when speaking

### 9. **Interactive Objects**
- [ ] Move near the round table in Mentor Room
- [ ] Click on the table - should show interaction message
- [ ] Click on chairs around the table - should show chair interaction
- [ ] Click on whiteboard - should show whiteboard interaction

### 10. **Multiplayer Features**
- [ ] Wait for other users to join (simulated after 3, 6, 9 seconds)
- [ ] Verify user count updates in top-left corner
- [ ] See other avatars with name labels above them
- [ ] Verify other avatars have gentle animation (bobbing/rotation)

### 11. **Chat System**
- [ ] Click "💬 Chat" button to open chat panel
- [ ] Type a message and press Enter
- [ ] Verify message appears in chat
- [ ] Click "×" to close chat panel

### 12. **Screen Sharing**
- [ ] Click "📺 Share Screen" button
- [ ] Allow screen sharing when prompted
- [ ] Verify screen share display appears
- [ ] Click "Stop Sharing" to end screen share

### 13. **Room Switching**
- [ ] Click "Mentor" button in room switch panel
- [ ] Verify room changes to Mentor Room
- [ ] Click "Innovation" button
- [ ] Verify room changes to Innovation Lab
- [ ] Click "Career" button
- [ ] Verify room changes to Career Hall

### 14. **Exit and Return**
- [ ] Click "Exit Room" button
- [ ] Verify return to dashboard
- [ ] Try entering a different room
- [ ] Verify everything works consistently

## 🐛 Common Issues and Solutions

### Issue: "THREE is not defined" error
**Solution**: Check browser console for Three.js loading errors. Ensure internet connection for CDN.

### Issue: Microphone not working
**Solution**: Check browser permissions, ensure HTTPS or localhost, try different browser.

### Issue: 3D environment not loading
**Solution**: Check WebGL support, try different browser, check console for errors.

### Issue: Avatar not loading
**Solution**: Check Ready Player Me URL format, ensure internet connection.

### Issue: Movement not working
**Solution**: Click on the 3D canvas first to focus, then try WASD keys.

## ✅ Success Criteria

The project is working properly if:
- [ ] All 3 rooms can be entered
- [ ] Avatar creation works for all 3 methods
- [ ] 3D movement and camera controls work smoothly
- [ ] Voice chat microphone toggle works
- [ ] Interactive objects respond to clicks
- [ ] Other users appear in the room
- [ ] Chat system functions properly
- [ ] Room switching works
- [ ] No console errors (except expected warnings)

## 🚀 Performance Notes

- First load may take a few seconds due to Three.js loading
- Avatar loading from Ready Player Me may take 5-10 seconds
- Voice chat requires microphone permission
- Screen sharing requires additional browser permissions

---

**Test completed successfully if all major features work without critical errors!** 🎉
