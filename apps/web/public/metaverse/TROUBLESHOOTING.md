# 🔧 Metaverse Hub Troubleshooting Guide

## 🚀 Quick Start

1. **Double-click `start.bat`** to automatically start the server and open the application
2. **Or manually run**: `python -m http.server 8000` in the project folder
3. **Open browser**: Go to `http://localhost:8000`

## 🧪 Testing Your Setup

1. **Run Test Suite**: Go to `http://localhost:8000/test.html`
2. **Click "Run All Tests"** to check compatibility
3. **All tests should show green checkmarks** ✅

## 🐛 Common Issues & Solutions

### Issue 1: "THREE.js not loaded" Error
**Symptoms**: Console shows "THREE.js not loaded" or 3D environment fails to initialize
**Solutions**:
- Check internet connection (THREE.js loads from CDN)
- Try refreshing the page
- Check browser console for network errors
- Try a different browser

### Issue 2: Avatar Generation Not Working
**Symptoms**: Photo upload works but avatar generation fails
**Solutions**:
- Ensure you have a stable internet connection
- Try a smaller image file (< 5MB)
- Check browser console for errors
- Try different image formats (JPG, PNG)

### Issue 3: Voice Chat Not Working
**Symptoms**: Microphone button doesn't respond or shows "not supported"
**Solutions**:
- Allow microphone permissions when prompted
- Use HTTPS (required for microphone access)
- Try Chrome or Firefox (best WebRTC support)
- Check if microphone is working in other applications

### Issue 4: 3D Environment Not Loading
**Symptoms**: Black screen or "Loading 3D environment..." never finishes
**Solutions**:
- Check if WebGL is supported: Go to `http://localhost:8000/test.html`
- Update graphics drivers
- Try disabling browser extensions
- Check browser console for WebGL errors

### Issue 5: Movement Controls Not Working
**Symptoms**: WASD keys don't move the avatar
**Solutions**:
- Click on the 3D canvas first to focus it
- Try different camera modes (First Person, Third Person, Free Look)
- Check if pointer lock is working (for Free Look mode)
- Refresh the page and try again

### Issue 6: Leaderboard/Scoring Not Working
**Symptoms**: Points don't increase or leaderboard doesn't update
**Solutions**:
- Check browser console for JavaScript errors
- Try refreshing the page
- Ensure you're interacting with objects (clicking chairs, tables, etc.)
- Check if localStorage is enabled in your browser

## 🔍 Debugging Steps

### Step 1: Check Browser Console
1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Look for any red error messages
4. Take a screenshot of any errors

### Step 2: Check Network Tab
1. In Developer Tools, click **Network** tab
2. Refresh the page
3. Look for any failed requests (red entries)
4. Check if THREE.js and other resources load successfully

### Step 3: Test Individual Features
1. **Avatar Creation**: Try uploading a photo and generating an avatar
2. **Room Selection**: Click on different rooms (Mentor Room, Innovation Lab, Career Hall)
3. **Movement**: Use WASD keys to move around
4. **Voice Chat**: Click microphone button and allow permissions
5. **Interactions**: Click on chairs, table, and whiteboard

### Step 4: Browser Compatibility
**Recommended Browsers** (in order of compatibility):
1. **Chrome** (best support)
2. **Firefox** (good support)
3. **Edge** (good support)
4. **Safari** (limited support)

## 🛠️ Advanced Troubleshooting

### If THREE.js Fails to Load
```html
<!-- Add this to index.html head section as backup -->
<script>
if (typeof THREE === 'undefined') {
    console.error('THREE.js failed to load from CDN');
    // You can download THREE.js locally and reference it
}
</script>
```

### If WebGL is Not Supported
1. Update graphics drivers
2. Enable hardware acceleration in browser
3. Try different browser
4. Check if WebGL is disabled in browser settings

### If Microphone Access is Denied
1. Go to browser settings
2. Find site permissions
3. Allow microphone access for localhost
4. Try using HTTPS instead of HTTP

## 📞 Getting Help

If you're still having issues:

1. **Check the test page**: `http://localhost:8000/test.html`
2. **Take screenshots** of any error messages
3. **Note your browser** and version
4. **Check console errors** (F12 → Console tab)

## 🎯 Expected Behavior

### When Everything Works Correctly:
1. ✅ Test page shows all green checkmarks
2. ✅ Main page loads with room selection
3. ✅ Avatar creation modal opens when clicking "Enter Room"
4. ✅ Photo upload and avatar generation works
5. ✅ 3D environment loads with avatar
6. ✅ WASD movement works
7. ✅ Voice chat button responds
8. ✅ Clicking objects shows interaction messages
9. ✅ Points system works (check leaderboard)
10. ✅ Premium avatars unlock based on score

## 🔄 Reset Everything

If nothing works:
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Restart browser**
3. **Restart the server** (Ctrl+C, then run `python -m http.server 8000` again)
4. **Try incognito/private mode**
5. **Try different browser**

---

**Remember**: The application requires a modern browser with WebGL support and internet connection for THREE.js CDN resources.
