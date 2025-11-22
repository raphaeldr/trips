# Hero Image Animation Guide

## Overview
Your travel blog now supports animated hero images with subtle movements like flowing water, drifting clouds, swaying branches, or shimmering reflections.

## How It Works
1. Upload a static photo and mark it as the hero image
2. Generate an animated version using AI tools
3. Upload the animated version to replace the static background

## Recommended AI Tools for Animation

### 1. **Runway ML** (Recommended)
- Website: https://runwayml.com
- Features: Image-to-video with motion brushes
- Perfect for: Water movement, cloud drift, subtle atmospheric effects
- Pricing: Free trial available, paid plans from $12/month
- How to use:
  1. Upload your hero image
  2. Use "Gen-3 Alpha" for image-to-video
  3. Prompt: "Subtle movement in water/clouds/trees, slow motion, seamless loop"
  4. Generate 5-10 second loop
  5. Download as MP4

### 2. **Pika Labs**
- Website: https://pika.art
- Features: AI video generation with camera controls
- Perfect for: Adding cinematic movement to landscapes
- Pricing: Free credits available
- How to use:
  1. Upload your image
  2. Describe the motion: "gentle waves", "drifting clouds", "swaying branches"
  3. Use negative prompt: "no camera movement, locked frame"
  4. Generate and download MP4

### 3. **Luma AI Dream Machine**
- Website: https://lumalabs.ai/dream-machine
- Features: High-quality image-to-video generation
- Perfect for: Realistic natural movements
- Pricing: Free generations available
- Prompt examples:
  - "Water gently flowing, subtle ripples, static frame"
  - "Clouds slowly drifting across sky, locked camera"
  - "Tree branches swaying gently in breeze, no camera movement"

### 4. **Kling AI**
- Website: https://klingai.com
- Features: Advanced motion control
- Perfect for: Precise control over animated elements
- Pricing: Credit-based system

## Best Practices

### Animation Style
- **Subtle is key**: Movements should be barely noticeable
- **Loop seamlessly**: Use 5-10 second clips that loop perfectly
- **Maintain focal point**: Camera should stay static
- **Natural speed**: Slow motion works best (0.5x to 0.75x speed)

### Technical Specs
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1920x1080 minimum (Full HD)
- **File size**: Under 50MB for optimal loading
- **Duration**: 5-15 seconds (will loop automatically)
- **Frame rate**: 24-30 fps

### Good Prompts for AI Tools
✅ "Gentle water ripples, subtle movement, static camera, seamless loop"
✅ "Clouds drifting slowly across sky, no camera movement, natural lighting"
✅ "Tree branches swaying softly in breeze, locked frame, smooth motion"
✅ "Reflections shimmering on water surface, minimal movement, cinematic"

❌ Avoid: "dramatic movement", "camera pan", "fast motion", "zoom"

## Upload Process

### Step 1: Set Hero Image
1. Go to Admin → Photos
2. Upload your base photo
3. Click "Set as Hero" on the photo

### Step 2: Generate Animation
1. Download the hero image
2. Use one of the AI tools above
3. Generate animated version (5-15 seconds, MP4)
4. Download the animated file

### Step 3: Upload Animated Version
1. In Admin panel, find your hero photo
2. Upload the animated MP4 file
3. The animated version will automatically display on the homepage

## Examples of What Works Well

### Water Scenes
- Ocean waves gently lapping
- River flowing smoothly
- Rain droplets on water
- Reflections on lake surface

### Sky/Atmosphere
- Clouds drifting slowly
- Fog rolling in
- Steam rising
- Light rays shifting

### Nature
- Tree branches swaying
- Grass blowing gently
- Leaves rustling
- Flowers bobbing

### Urban
- Flags waving
- Smoke rising
- Reflections in windows
- Light changing on buildings

## Troubleshooting

**Animation too fast?**
- Use slow motion in your AI tool
- Try 0.5x or 0.75x speed settings

**File too large?**
- Compress video using HandBrake or similar
- Target 10-30MB for best performance
- Use H.264 codec with medium quality

**Loop not seamless?**
- Request "seamless loop" in AI prompt
- Use video editing to trim to perfect loop point
- Some AI tools have built-in loop detection

**Animation too obvious?**
- Reduce motion intensity in AI tool
- Use shorter duration (5-7 seconds)
- Request "minimal movement" in prompt

## Notes
- The static image remains as fallback for browsers that don't support video
- Video plays automatically, loops continuously, and is muted
- Optimized for performance with lazy loading
- Works on mobile devices with `playsInline` attribute
