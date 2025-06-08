# ARrange - Interior Design Consulting App

A 3D AR furniture viewer and interior design consulting tool built with Three.js. Clients can place furniture in virtual rooms and add comments for design feedback.

## Features

- 🏠 **3D Room Visualization** - View and navigate through different room layouts
- 🪑 **Furniture Placement** - Drag and drop furniture items into the room
- 💬 **Design Comments** - Add location-specific comments for design feedback
- 🎯 **Interactive Markers** - Hover over comment markers to view feedback
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Live Demo

Visit the live app: [https://zhiyuanguo.github.io/ARrange_App/](https://zhiyuanguo.github.io/ARrange_App/)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/zhiyuanguo/ARrange_App.git
cd ARrange_App
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Building for Production

```bash
npm run build
```

## Deployment

This app is automatically deployed to GitHub Pages using GitHub Actions. Any push to the main branch will trigger a new deployment.

## Technology Stack

- **Three.js** - 3D graphics and rendering
- **Vite** - Build tool and development server
- **JavaScript ES6+** - Modern JavaScript features
- **HTML5 Canvas** - Text rendering for comments
- **CSS3** - Styling and animations

## Usage

1. **Room Selection**: Choose from available room layouts on the home page
2. **Furniture Placement**: Drag furniture items from the side panel into the room
3. **Adding Comments**: Click "Add Comment" and then click anywhere in the room to place feedback
4. **Viewing Comments**: Hover over orange comment markers to read feedback
5. **Navigation**: Use mouse/touch to orbit around the room

## License

ISC