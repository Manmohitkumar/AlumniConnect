# 3D Environment Models

This directory contains GLB environment models for each room:

## Expected Files:
- `mentor-room.glb` - 3D environment for the Mentor Room
- `career-hall.glb` - 3D environment for the Career Hall  
- `innovation-lab.glb` - 3D environment for the Innovation Lab

## Model Requirements:
- Format: GLB (binary GLTF)
- Lighting: Baked into the model or set up for Three.js lighting
- Scale: Appropriate for a virtual meeting space
- Collision objects: Named with "collision" prefix for physics

## How to Add:
1. Export your 3D environment as GLB format
2. Place the file in this directory with the exact name listed above
3. The system will automatically load the appropriate environment when entering each room