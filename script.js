let dragControls;
let draggableObjects = []; // Array to store draggable objects

// Add these variables at the top
let isDragging = false;
let currentDragObject = null;
let mousePosition = new THREE.Vector2();
let raycaster = new THREE.Raycaster();

// Add this near the top with other variables
let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let planeIntersectPoint = new THREE.Vector3();

function init() {
  // ... existing init code ...

  // Create OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 50;

  // Create DragControls
  dragControls = new THREE.DragControls(
    draggableObjects,
    camera,
    renderer.domElement
  );

  // Add drag event listeners
  dragControls.addEventListener("dragstart", function (event) {
    controls.enabled = false; // Disable orbit controls while dragging
    event.object.material.opacity = 0.7; // Optional: show feedback during drag
  });

  dragControls.addEventListener("dragend", function (event) {
    controls.enabled = true; // Re-enable orbit controls
    event.object.material.opacity = 1; // Reset opacity
  });

  dragControls.addEventListener("drag", function (event) {
    // Optional: Constrain movement to a plane or add snap-to-grid
    event.object.position.y = 0; // Keep objects on the ground
  });

  // Create a ground plane for raycasting
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshBasicMaterial({
    visible: false,
  });
  floor = new THREE.Mesh(groundGeometry, groundMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Update gallery items event listeners
  const galleryItems = document.querySelectorAll(".furniture-item");
  galleryItems.forEach((item) => {
    item.addEventListener("mousedown", function (event) {
      event.preventDefault(); // Prevent default drag behavior
      const modelPath = this.dataset.model;
      if (modelPath) {
        startDrag(modelPath, event);
      }
    });
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", endDrag);
}

function startDrag(modelPath, event) {
  isDragging = true;

  // Get mouse position for initial placement
  mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Load the 3D model
  const loader = new THREE.GLTFLoader();
  loader.load(modelPath, function (gltf) {
    currentDragObject = gltf.scene;

    // Get intersection point with ground
    const intersectionPoint = getMouseIntersection();
    if (intersectionPoint) {
      currentDragObject.position.copy(intersectionPoint);
    }

    scene.add(currentDragObject);
  });
}

function getMouseIntersection() {
  raycaster.setFromCamera(mousePosition, camera);
  const intersects = raycaster.intersectObject(floor);

  if (intersects.length > 0) {
    return intersects[0].point;
  }
  return null;
}

function onMouseMove(event) {
  if (!isDragging || !currentDragObject) return;

  // Update mouse position
  mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update object position
  const intersectionPoint = getMouseIntersection();
  if (intersectionPoint) {
    currentDragObject.position.copy(intersectionPoint);
  }
}

function endDrag(event) {
  if (isDragging && currentDragObject) {
    // Get final position
    const intersectionPoint = getMouseIntersection();
    if (intersectionPoint) {
      currentDragObject.position.copy(intersectionPoint);
      draggableObjects.push(currentDragObject);
    }
  }

  isDragging = false;
  currentDragObject = null;
}

// Modify your addFurniture function to make objects draggable
function addFurniture(modelPath, position) {
  const loader = new THREE.GLTFLoader();
  loader.load(modelPath, function (gltf) {
    const model = gltf.scene;
    model.position.copy(position);

    // Make the model draggable
    draggableObjects.push(model);

    scene.add(model);
  });
}

// Optional: Add this function to remove furniture
function removeFurniture(object) {
  const index = draggableObjects.indexOf(object);
  if (index > -1) {
    draggableObjects.splice(index, 1);
    scene.remove(object);
  }
}

// Make sure to call this in your animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update controls
  controls.update();

  // Render scene
  renderer.render(scene, camera);
}
