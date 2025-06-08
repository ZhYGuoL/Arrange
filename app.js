import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Add this new class to manage furniture data
class FurnitureItem {
  constructor(
    name,
    modelPath,
    thumbnailPath,
    defaultPosition = { x: 0, y: 0, z: 0 }
  ) {
    this.name = name;
    this.modelPath = modelPath;
    this.thumbnailPath = thumbnailPath;
    this.defaultPosition = defaultPosition;
  }
}

// Add new Comment class
class Comment {
  constructor(id, position, text, timestamp = Date.now()) {
    this.id = id;
    this.position = position; // THREE.Vector3
    this.text = text;
    this.timestamp = timestamp;
  }
}

class ARFurnitureViewer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.loader = new GLTFLoader();

    this.furnitureItems = [
      new FurnitureItem(
        "Modern Bookshelf",
        "./models/bookshelf.glb",
        "./thumbnails/bookshelf.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Dark Coffee Table",
        "./models/table.glb",
        "./thumbnails/table.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Dark Chair",
        "./models/chair.glb",
        "./thumbnails/chair.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Modern Chair",
        "./models/diningChair.glb",
        "./thumbnails/diningChair.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Flowers",
        "./models/flowers.glb",
        "./thumbnails/flowers.jpg",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Big Flowers",
        "./models/bigFlowers.glb",
        "./thumbnails/bigFlowers.png",
        { x: 0, y: 0, z: 0 }
      ),
    ];

    this.placedFurniture = [];
    this.selectedFurniture = null;

    // Add comment system properties
    this.comments = [];
    this.commentMarkers = [];
    this.isAddingComment = false;
    this.nextCommentId = 1;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

    this.isShiftDown = false; // Add this to track shift key state

    this.selectionBox = null; // Add this to track the selection outline
    this.outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // Green outline
      linewidth: 2,
    });

    // Add rotation amount in radians
    this.rotationAmount = Math.PI / 32; // 11.25 degrees

    // Add keyboard handler for rotation
    window.addEventListener("keydown", (event) => {
      if (this.selectedFurniture) {
        switch (event.key) {
          case "ArrowLeft":
            this.selectedFurniture.rotation.y += this.rotationAmount;
            // Update selection box rotation
            if (this.selectionBox) {
              this.selectionBox.quaternion.copy(
                this.selectedFurniture.quaternion
              );
            }
            break;
          case "ArrowRight":
            this.selectedFurniture.rotation.y -= this.rotationAmount;
            // Update selection box rotation
            if (this.selectionBox) {
              this.selectionBox.quaternion.copy(
                this.selectedFurniture.quaternion
              );
            }
            break;
        }
      }
    });

    // Add shift key listeners
    window.addEventListener("keydown", (event) => {
      if (event.key === "Shift") {
        this.isShiftDown = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "Shift") {
        this.isShiftDown = false;
      }
    });

    this.init();

    // Add save button handler
    document
      .getElementById("save-button")
      .addEventListener("click", () => this.saveAndExit());

    // Add comment system event listeners
    this.setupCommentEventListeners();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("ar-overlay").appendChild(this.renderer.domElement);

    // Add background color to make scene visible
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity

    // Main directional light (sun-like)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;

    // Fill light from opposite direction
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 3, -5);

    // Add some point lights for more dynamic lighting
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(0, 4, 0);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3);
    pointLight2.position.set(5, 2, -5);

    const pointLight3 = new THREE.PointLight(0xffffff, 0.3);
    pointLight3.position.set(-5, 2, 5);

    // Optional: Add environment map for better reflections
    const envMapTexture = new THREE.CubeTextureLoader().load([
      "textures/env/px.jpg",
      "textures/env/nx.jpg",
      "textures/env/py.jpg",
      "textures/env/ny.jpg",
      "textures/env/pz.jpg",
      "textures/env/nz.jpg",
    ]);
    this.scene.environment = envMapTexture;

    // Add all lights to the scene
    this.scene.add(
      ambientLight,
      mainLight,
      fillLight,
      pointLight1,
      pointLight2,
      pointLight3
    );

    // Adjust renderer settings for better lighting
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2; // Increased exposure

    // Setup camera - move it back further
    this.camera.position.set(0, 2, 10);
    this.camera.lookAt(0, 0, 0);

    // Add controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Load room scan
    this.loadRoomScan();

    this.setupFurnitureGallery();

    // Add drag and drop event listeners
    this.setupDragAndDrop();

    // Load existing comments for this room
    this.loadComments();

    // Start animation loop
    this.animate();
  }

  loadRoomScan() {
    const roomFile =
      "./models/" + (localStorage.getItem("currentRoom") || "room1.glb");

    this.loader.load(
      roomFile,
      (gltf) => {
        const room = gltf.scene;

        // Scale room based on which room it is
        const bbox = new THREE.Box3().setFromObject(room);
        const roomSize = bbox.getSize(new THREE.Vector3());
        const desiredWidth = roomFile.includes("room2.glb") ? 2.5 : 5; // Half size for room2
        const scale = desiredWidth / roomSize.x;
        room.scale.set(scale, scale, scale);

        this.scene.add(room);
        this.roomModel = room; // Store reference for comment placement
        console.log("Room loaded successfully");

        // Show appropriate hint based on room
        if (roomFile.includes("room2.glb")) {
          this.showRoom2Hint();
        } else if (roomFile.includes("room1.glb")) {
          this.showRoom1Hint();
        }

        // Store room dimensions for future reference
        this.roomDimensions = roomSize.multiplyScalar(scale);

        // Update the drag plane to match the room's floor
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      },
      (progress) => {
        console.log(
          "Loading room:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading room:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          url: roomFile,
        });

        // Fallback to a ground plane if room loading fails
        console.log("Creating fallback ground plane...");
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshPhongMaterial({
          color: 0x999999,
          side: THREE.DoubleSide,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
      }
    );
  }

  showRoom1Hint() {
    const hint = document.createElement("div");
    hint.style.cssText = `
      position: fixed;
      left: 20px;
      top: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      max-width: 300px;
      z-index: 1000;
      animation: fadeIn 0.5s ease-out;
    `;

    hint.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #333;">💡 Style Suggestion</h3>
      <p style="margin: 0; line-height: 1.5; color: #666;">
        I notice this room has a classic, traditional feel. Let me suggest some pieces that would complement this style:
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>A dark coffee table for elegance</li>
          <li>A matching dark chair to complete the set</li>
        </ul>
      </p>
      <div style="display: flex; justify-content: space-between; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: #4CAF50;
          cursor: pointer;
          padding: 5px 0;
          font-family: inherit;
          font-size: 12px;
          text-decoration: underline;
        ">Got it!</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #4CAF50;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px 15px;
          border-radius: 4px;
          font-family: inherit;
          font-size: 12px;
        ">Do it for me!</button>
      </div>
    `;

    document.body.appendChild(hint);

    // Add fade-in animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  showRoom2Hint() {
    const hint = document.createElement("div");
    hint.style.cssText = `
      position: fixed;
      left: 20px;
      top: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      max-width: 300px;
      z-index: 1000;
      animation: fadeIn 0.5s ease-out;
    `;

    hint.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #333;">💡 Design Suggestion</h3>
      <p style="margin: 0; line-height: 1.5; color: #666;">
        This table looks a bit lonely! Try:
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Adding a chair underneath</li>
          <li>Placing some flowers on top for decoration</li>
        </ul>
      </p>
      <div style="display: flex; justify-content: space-between; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: #4CAF50;
          cursor: pointer;
          padding: 5px 0;
          font-family: inherit;
          font-size: 12px;
          text-decoration: underline;
        ">Got it!</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #4CAF50;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px 15px;
          border-radius: 4px;
          font-family: inherit;
          font-size: 12px;
        ">Do it for me!</button>
      </div>
    `;

    document.body.appendChild(hint);

    // Add fade-in animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  autoPlaceRoom1Furniture() {
    // Place coffee table
    this.loadFurniture("./models/table.glb", {
      position: new THREE.Vector3(0, 0, 0),
      normal: new THREE.Vector3(0, 1, 0),
      isWall: false,
    });

    // Place dark chair
    this.loadFurniture("./models/chair.glb", {
      position: new THREE.Vector3(0.8, 0, 0.5),
      normal: new THREE.Vector3(0, 1, 0),
      isWall: false,
    });
  }

  autoPlaceFurniture() {
    // Find the table in the scene
    const table = this.scene.children.find(
      (child) =>
        child.userData.modelPath &&
        child.userData.modelPath.includes("table.glb")
    );

    if (table) {
      const tablePosition = table.position.clone();

      // Place chair slightly behind the table
      this.loadFurniture("./models/chair.glb", {
        position: new THREE.Vector3(tablePosition.x, 0, tablePosition.z + 0.7),
        normal: new THREE.Vector3(0, 1, 0),
        isWall: false,
      });

      // Place flowers on the table
      this.loadFurniture("./models/flowers.glb", {
        position: new THREE.Vector3(
          tablePosition.x,
          tablePosition.y + 0.75, // Adjust height based on table height
          tablePosition.z
        ),
        normal: new THREE.Vector3(0, 1, 0),
        isWall: false,
      });
    }
  }

  setupDragAndDrop() {
    const overlay = document.getElementById("ar-overlay");

    overlay.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    overlay.addEventListener("drop", (event) => {
      event.preventDefault();
      const modelPath = event.dataTransfer.getData("model");

      // Calculate drop position in 3D space
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Get all objects in the scene including placed furniture
      const objects = [
        ...this.placedFurniture,
        ...this.scene.children.filter(
          (obj) => obj.type === "Group" && !this.placedFurniture.includes(obj)
        ),
      ];

      const intersects = this.raycaster.intersectObjects(objects, true);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const normal = intersection.face.normal.clone();
        normal.transformDirection(intersection.object.matrixWorld);

        // Calculate position including height of the intersected object
        const position = intersection.point.clone();

        // If it's a horizontal surface (like a table top)
        const isHorizontal = Math.abs(normal.y) > 0.5;

        this.loadFurniture(modelPath, {
          position: position,
          normal: normal,
          isWall: !isHorizontal,
        });
      }
    });
  }

  setupFurnitureGallery() {
    const gallery = document.getElementById("furniture-gallery");
    const container = gallery.querySelector(".furniture-container");
    const searchInput = document.getElementById("search-furniture");

    // Create all furniture items
    const createFurnitureElements = () => {
      container.innerHTML = ""; // Clear existing items

      this.furnitureItems.forEach((item) => {
        const itemElement = document.createElement("div");
        itemElement.className = "furniture-item";
        itemElement.draggable = true;

        itemElement.innerHTML = `
          <img src="${item.thumbnailPath}" alt="${item.name}">
          <h3>${item.name}</h3>
        `;

        // Add drag start event
        itemElement.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("model", item.modelPath);
          event.dataTransfer.effectAllowed = "move";
          itemElement.classList.add("dragging");
        });

        // Add drag end event
        itemElement.addEventListener("dragend", () => {
          itemElement.classList.remove("dragging");
        });

        // Keep the click event for backward compatibility
        itemElement.addEventListener("click", () => {
          this.loadFurniture(item.modelPath, item.defaultPosition);
        });

        container.appendChild(itemElement);
      });
    };

    // Initial creation of furniture items
    createFurnitureElements();

    // Add search functionality
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();

      // Filter and show/hide furniture items
      container.querySelectorAll(".furniture-item").forEach((item) => {
        const itemName = item.querySelector("h3").textContent.toLowerCase();
        if (itemName.includes(searchTerm)) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    });
  }

  loadFurniture(
    furniturePath,
    dropInfo = {
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      isWall: false,
    }
  ) {
    this.loader.load(
      furniturePath,
      (gltf) => {
        const furniture = gltf.scene;
        const filename = furniturePath.split("/").pop();

        // Add material modification
        furniture.traverse((child) => {
          if (child.isMesh) {
            // Clone the material to avoid affecting other instances
            child.material = child.material.clone();

            if (filename === "bookshelf.glb") {
              // Special handling for bookshelf
              child.material.roughness = 0.7; // More realistic wood texture
              child.material.metalness = 0.1; // Slight metallic for varnished look
              child.material.envMapIntensity = 0.8; // Subtle reflections

              // Darken the color for more realistic wood
              if (child.material.color) {
                const currentColor = child.material.color;
                currentColor.multiplyScalar(0.7); // Darken by 30%
              }

              // Enhance shadow properties
              child.castShadow = true;
              child.receiveShadow = true;
              child.material.shadowBias = -0.001;
              child.material.dithering = true;
            } else {
              // Default handling for other furniture
              if (child.material.color) {
                const currentColor = child.material.color;
                currentColor.lerp(new THREE.Color(1, 1, 1), 0.3);
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        });

        // Scale furniture as before
        const bbox = new THREE.Box3().setFromObject(furniture);
        const size = bbox.getSize(new THREE.Vector3());

        const standardSizes = {
          "bookshelf.glb": { width: 0.8, height: 2.0, depth: 2 },
          "table.glb": { width: 1.6, height: 1, depth: 1.2 },
          "chair.glb": { width: 1.8, height: 1, depth: 0.7 },
          "diningChair.glb": { width: 0.6, height: 0.9, depth: 0.6 },
          "flowers.glb": { width: 0.3, height: 0.4, depth: 0.3 },
          "bigFlowers.glb": { width: 0.5, height: 0.6, depth: 0.5 },
        };

        const standardSize = standardSizes[filename] || {
          width: 1,
          height: 1,
          depth: 1,
        };

        const scaleX = standardSize.width / size.x;
        const scaleY = standardSize.height / size.y;
        const scaleZ = standardSize.depth / size.z;
        const scale = Math.min(scaleX, scaleY, scaleZ);
        furniture.scale.set(scale, scale, scale);

        // Center the pivot point
        bbox.setFromObject(furniture);
        const center = bbox.getCenter(new THREE.Vector3());
        furniture.position.sub(center);

        // Position the furniture
        if (dropInfo.isWall) {
          // Wall placement logic remains the same
          const rotationMatrix = new THREE.Matrix4();
          rotationMatrix.lookAt(
            new THREE.Vector3(),
            dropInfo.normal,
            new THREE.Vector3(0, 1, 0)
          );
          furniture.quaternion.setFromRotationMatrix(rotationMatrix);

          const offset = 0.01;
          furniture.position
            .copy(dropInfo.position)
            .add(dropInfo.normal.multiplyScalar(offset));
        } else {
          // Place directly at intersection point for stacking
          furniture.position.copy(dropInfo.position);
        }

        // Store the model path for reference
        furniture.userData.modelPath = furniturePath;

        this.scene.add(furniture);
        this.placedFurniture.push(furniture);
        this.selectedFurniture = furniture;
        this.setupFurnitureDrag(furniture);
      },
      (progress) => {
        console.log(
          "Loading furniture:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading furniture:", error);
      }
    );
  }

  setupFurnitureDrag(furniture) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
    let intersectionPoint = new THREE.Vector3();

    const onMouseDown = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(furniture, true);

      if (intersects.length > 0) {
        isDragging = true;
        this.selectedFurniture = furniture;
        dragPlane.constant = -furniture.position.y;
        document.body.style.cursor = "grabbing";

        // Add selection box when furniture is clicked
        this.updateSelectionBox(furniture);

        // Disable orbit controls if shift is held
        if (this.isShiftDown) {
          this.controls.enabled = false;
        }
      }
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        furniture.position.x = intersectionPoint.x;
        furniture.position.z = intersectionPoint.z;

        // Update selection box position while dragging
        if (this.selectionBox) {
          const bbox = new THREE.Box3().setFromObject(furniture);
          const center = bbox.getCenter(new THREE.Vector3());
          this.selectionBox.position.copy(center);
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
      this.controls.enabled = true;
    };

    const onKeyDown = (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (this.selectedFurniture === furniture) {
          this.scene.remove(furniture);
          this.placedFurniture = this.placedFurniture.filter(
            (f) => f !== furniture
          );
          this.selectedFurniture = null;
          // Remove selection box when furniture is deleted
          this.updateSelectionBox(null);

          // Clean up all event listeners
          window.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("keydown", onKeyDown);
        }
      }
    };

    // Add click handler for deselection
    window.addEventListener("mousedown", (event) => {
      // Check if click is not on any furniture
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.placedFurniture, true);

      if (intersects.length === 0) {
        // Click was on empty space, remove selection
        this.selectedFurniture = null;
        this.updateSelectionBox(null);
      }
    });

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.updateCommentAnimation();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Add this new method to create/update selection outline
  updateSelectionBox(furniture) {
    // Remove existing selection box if it exists
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
    }

    if (furniture) {
      // Create a new bounding box
      const bbox = new THREE.Box3().setFromObject(furniture);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Create wireframe geometry
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const edges = new THREE.EdgesGeometry(geometry);
      this.selectionBox = new THREE.LineSegments(edges, this.outlineMaterial);

      // Position the box at the furniture's position
      this.selectionBox.position.copy(center);
      this.selectionBox.quaternion.copy(furniture.quaternion);

      this.scene.add(this.selectionBox);
    }
  }

  saveAndExit() {
    // Save comments before exiting
    this.saveComments();

    // Create a save object with room data
    const saveData = {
      roomFile: localStorage.getItem("currentRoom") || "room.glb", // Get current room file
      furniture: this.placedFurniture.map((furniture) => ({
        modelPath: this.getFurnitureModelPath(furniture),
        position: {
          x: furniture.position.x,
          y: furniture.position.y,
          z: furniture.position.z,
        },
        rotation: {
          y: furniture.rotation.y,
        },
        scale: {
          x: furniture.scale.x,
          y: furniture.scale.y,
          z: furniture.scale.z,
        },
      })),
    };

    // Save to localStorage
    const savedRooms = JSON.parse(localStorage.getItem("savedRooms") || "[]");
    savedRooms.push(saveData);
    localStorage.setItem("savedRooms", JSON.stringify(savedRooms));

    // Navigate back to gallery page (which is now index.html)
    window.location.href = "./index.html"; // Changed from gallery.html
  }

  getFurnitureModelPath(furniture) {
    // Find the original furniture item that matches this placed furniture
    for (const item of this.furnitureItems) {
      // Compare the geometry to find matching furniture
      const itemGeometry = new THREE.Box3().setFromObject(furniture);
      if (Math.abs(itemGeometry.max.x - itemGeometry.min.x) === item.width) {
        return item.modelPath;
      }
    }
    return null;
  }

  // Comment system methods
  enableCommentMode() {
    this.isAddingComment = true;
    document.body.style.cursor = "crosshair";
    // Show instructions
    this.showCommentInstructions();
  }

  disableCommentMode() {
    this.isAddingComment = false;
    document.body.style.cursor = "default";
    this.hideCommentInstructions();

    // Update button text
    const addCommentBtn = document.getElementById("add-comment");
    if (addCommentBtn) {
      addCommentBtn.textContent = "Add Comment";
    }
  }

  showCommentInstructions() {
    let instructions = document.getElementById("comment-instructions");
    if (!instructions) {
      instructions = document.createElement("div");
      instructions.id = "comment-instructions";
      instructions.innerHTML =
        "Click anywhere in the room to place a comment. Press ESC to cancel.";
      instructions.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        z-index: 1000;
      `;
      document.body.appendChild(instructions);
    }
    instructions.style.display = "block";
  }

  hideCommentInstructions() {
    const instructions = document.getElementById("comment-instructions");
    if (instructions) {
      instructions.style.display = "none";
    }
  }

  addComment(position, text) {
    const comment = new Comment(this.nextCommentId++, position, text);
    this.comments.push(comment);
    this.createCommentMarker(comment);
    this.saveComments();
    return comment;
  }

  createCommentMarker(comment) {
    // Create a smaller, more elegant sphere marker
    const markerGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const markerMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b35,
      emissive: 0x331100,
      transparent: true,
      opacity: 0.9,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(comment.position);
    marker.userData = { commentId: comment.id, isCommentMarker: true };

    // Add a subtle ring around the marker for better visibility
    const ringGeometry = new THREE.RingGeometry(0.05, 0.07, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(comment.position);
    ring.position.y += 0.001; // Slightly above the ground
    ring.rotation.x = -Math.PI / 2; // Lay flat on ground
    ring.userData = { commentId: comment.id, isCommentRing: true };

    this.scene.add(marker);
    this.scene.add(ring);
    this.commentMarkers.push(marker);
    this.commentMarkers.push(ring);

    // Create comment label that's initially hidden
    this.createCommentLabel(comment, marker);

    return marker;
  }

  createCommentLabel(comment, marker) {
    // Create a high-resolution canvas for crisp text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const devicePixelRatio = window.devicePixelRatio || 1;
    const padding = 12;
    const fontSize = 11;
    const lineHeight = 16;

    // Set font first to measure text - make it bold for better visibility
    context.font = `bold ${fontSize}px JetBrains Mono, monospace`;

    // Calculate text dimensions with word wrapping
    const words = comment.text.split(" ");
    const maxWidth = 220;
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Limit to 3 lines to keep it compact
    const displayLines = lines.slice(0, 3);
    if (lines.length > 3) {
      displayLines[2] =
        displayLines[2].substring(0, displayLines[2].length - 3) + "...";
    }

    // Calculate canvas size with minimum width for better appearance
    const textWidth = Math.max(
      ...displayLines.map((line) => context.measureText(line).width)
    );
    const minWidth = 160;
    const logicalWidth = Math.max(textWidth + padding * 2, minWidth);
    const logicalHeight = displayLines.length * lineHeight + padding * 2;

    // Set canvas size with device pixel ratio for crisp rendering
    canvas.width = logicalWidth * devicePixelRatio;
    canvas.height = logicalHeight * devicePixelRatio;
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";

    // Scale the context to match device pixel ratio
    context.scale(devicePixelRatio, devicePixelRatio);

    // Redraw with correct font (canvas gets reset) - bold for readability
    context.font = `bold ${fontSize}px JetBrains Mono, monospace`;

    // Draw shadow for better depth
    context.shadowColor = "rgba(0, 0, 0, 0.15)";
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 2;

    // Draw solid white background with no transparency
    const cornerRadius = 6;
    context.fillStyle = "#ffffff";
    this.drawRoundedRect(
      context,
      0,
      0,
      logicalWidth,
      logicalHeight,
      cornerRadius
    );
    context.fill();

    // Add a subtle inner background for extra opacity
    context.fillStyle = "#ffffff";
    this.drawRoundedRect(
      context,
      1,
      1,
      logicalWidth - 2,
      logicalHeight - 2,
      cornerRadius - 1
    );
    context.fill();

    // Reset shadow for border
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    // Draw strong border
    context.strokeStyle = "#ff6b35";
    context.lineWidth = 3;
    context.stroke();

    // Configure text rendering for maximum contrast and clarity
    context.fillStyle = "#000000"; // Pure black
    context.textAlign = "left";
    context.textBaseline = "top";
    context.imageSmoothingEnabled = true;
    context.textRenderingOptimization = "optimizeLegibility";

    // Add text stroke for extra definition
    context.strokeStyle = "#000000";
    context.lineWidth = 0.5;

    // Draw text with stroke for extra boldness
    displayLines.forEach((line, index) => {
      const x = padding;
      const y = padding + index * lineHeight;

      // Fill the text (solid black)
      context.fillText(line, x, y);
      // Stroke the text for extra definition
      context.strokeText(line, x, y);
    });

    // Create texture and sprite with smooth text rendering
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.generateMipmaps = true; // Enable mipmaps for smooth scaling
    texture.minFilter = THREE.LinearMipmapLinearFilter; // Smooth text scaling
    texture.magFilter = THREE.LinearFilter; // Smooth text rendering

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0, // Start hidden
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Use appropriate scale for good readability
    const scale = 1.0;
    sprite.scale.set(
      logicalWidth * scale * 0.01,
      logicalHeight * scale * 0.01,
      1
    );
    sprite.position.copy(comment.position);
    sprite.position.y += 0.2; // Position higher for better visibility
    sprite.userData = { commentId: comment.id, isCommentLabel: true };

    this.scene.add(sprite);
    marker.userData.label = sprite;
  }

  // Helper function to draw rounded rectangles
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  removeComment(commentId) {
    // Remove from comments array
    this.comments = this.comments.filter((c) => c.id !== commentId);

    // Remove marker and label from scene
    const markerIndex = this.commentMarkers.findIndex(
      (m) => m.userData.commentId === commentId
    );
    if (markerIndex !== -1) {
      const marker = this.commentMarkers[markerIndex];
      if (marker.userData.label) {
        this.scene.remove(marker.userData.label);
      }
      this.scene.remove(marker);
      this.commentMarkers.splice(markerIndex, 1);
    }

    this.saveComments();
  }

  updateCommentAnimation() {
    // Animate comment markers with a subtle pulsing effect
    const time = Date.now() * 0.003;
    this.commentMarkers.forEach((marker) => {
      if (marker.userData.isCommentMarker) {
        // Gentle pulsing for markers
        const scale = 1 + Math.sin(time + marker.userData.commentId) * 0.15;
        marker.scale.setScalar(scale);
      } else if (marker.userData.isCommentRing) {
        // Gentle breathing effect for rings
        const opacity =
          0.2 + Math.sin(time + marker.userData.commentId * 1.5) * 0.1;
        marker.material.opacity = opacity;
      }
    });

    // Handle hover effects for comment labels
    this.handleCommentHover();
  }

  handleCommentHover() {
    // Check if mouse is over any comment marker
    if (!this.mouse || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.commentMarkers.filter((m) => m.userData.isCommentMarker)
    );

    // Hide all labels first with faster transition
    this.commentMarkers.forEach((marker) => {
      if (marker.userData.isCommentMarker && marker.userData.label) {
        const label = marker.userData.label;
        if (intersects.length === 0 || intersects[0].object !== marker) {
          // Quickly hide non-hovered labels
          label.material.opacity = THREE.MathUtils.lerp(
            label.material.opacity,
            0,
            0.2
          );
        }
      }
    });

    // Show label for hovered marker with immediate full opacity
    if (intersects.length > 0) {
      const hoveredMarker = intersects[0].object;
      if (hoveredMarker.userData.label) {
        const label = hoveredMarker.userData.label;
        // Set to full opacity immediately for maximum readability
        label.material.opacity = 1.0;
      }
    }
  }

  handleCommentClick(event) {
    // Get click position in 3D space
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // First check if user clicked on an existing comment marker
    const commentIntersects = this.raycaster.intersectObjects(
      this.commentMarkers
    );
    if (commentIntersects.length > 0) {
      const clickedMarker = commentIntersects[0].object;
      const commentId = clickedMarker.userData.commentId;
      const comment = this.comments.find((c) => c.id === commentId);
      if (comment) {
        this.showCommentViewDialog(comment);
        return;
      }
    }

    // If not adding comment, don't proceed
    if (!this.isAddingComment) return;

    // Try to intersect with room first, then with a ground plane
    let intersects = [];
    if (this.roomModel) {
      intersects = this.raycaster.intersectObject(this.roomModel, true);
    }

    // If no room intersection, use ground plane
    let intersectionPoint = new THREE.Vector3();
    if (intersects.length > 0) {
      intersectionPoint = intersects[0].point;
    } else {
      // Use a ground plane at y=0
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint);
    }

    // Show comment input dialog
    this.showCommentDialog(intersectionPoint);
  }

  showCommentDialog(position) {
    const modal = document.createElement("div");
    modal.id = "comment-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      font-family: 'JetBrains Mono', monospace;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;

    dialog.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 12px; height: 12px; background: #ff6b35; border-radius: 50%; margin-right: 10px;"></div>
        <h3 style="margin: 0; color: #333; font-size: 18px;">Add Comment</h3>
      </div>
      <textarea id="comment-text" placeholder="Enter your design feedback or suggestions..." style="
        width: 100%;
        height: 120px;
        padding: 16px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
        background: #fafafa;
        transition: border-color 0.3s, background-color 0.3s;
      "></textarea>
      <div style="margin-top: 20px; text-align: right;">
        <button id="cancel-comment" style="
          background: #f5f5f5;
          color: #666;
          padding: 12px 24px;
          border: 1px solid #ddd;
          border-radius: 6px;
          margin-right: 12px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          transition: all 0.3s;
        ">Cancel</button>
        <button id="save-comment" style="
          background: #ff6b35;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          transition: all 0.3s;
          font-weight: 500;
        ">Save Comment</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const textArea = document.getElementById("comment-text");
    textArea.focus();

    // Add focus styling
    textArea.addEventListener("focus", () => {
      textArea.style.borderColor = "#ff6b35";
      textArea.style.backgroundColor = "#ffffff";
    });

    textArea.addEventListener("blur", () => {
      textArea.style.borderColor = "#e0e0e0";
      textArea.style.backgroundColor = "#fafafa";
    });

    // Handle save comment
    document.getElementById("save-comment").onclick = () => {
      const text = textArea.value.trim();
      if (text) {
        this.addComment(position, text);
        this.disableCommentMode();
      }
      document.body.removeChild(modal);
    };

    // Handle cancel
    document.getElementById("cancel-comment").onclick = () => {
      document.body.removeChild(modal);
      this.disableCommentMode();
    };

    // Handle escape key
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        this.disableCommentMode();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  showCommentViewDialog(comment) {
    const modal = document.createElement("div");
    modal.id = "comment-view-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      font-family: 'JetBrains Mono', monospace;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;

    const date = new Date(comment.timestamp).toLocaleString();
    dialog.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 12px; height: 12px; background: #ff6b35; border-radius: 50%; margin-right: 10px;"></div>
        <h3 style="margin: 0; color: #333; font-size: 18px;">Comment</h3>
      </div>
      <div style="
        background: #f8f8f8;
        padding: 15px;
        border-radius: 8px;
        border-left: 3px solid #ff6b35;
        margin-bottom: 15px;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
      ">${comment.text}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 20px;">
        Created: ${date}
      </div>
      <div style="text-align: right;">
        <button id="delete-comment" style="
          background: #dc3545;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          margin-right: 10px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        ">Delete</button>
        <button id="close-comment" style="
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        ">Close</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // Handle delete comment
    document.getElementById("delete-comment").onclick = () => {
      this.removeComment(comment.id);
      document.body.removeChild(modal);
    };

    // Handle close
    document.getElementById("close-comment").onclick = () => {
      document.body.removeChild(modal);
    };

    // Handle escape key
    const escapeHandler = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  saveComments() {
    const roomKey = localStorage.getItem("currentRoom") || "default";
    const commentsData = this.comments.map((comment) => ({
      id: comment.id,
      position: {
        x: comment.position.x,
        y: comment.position.y,
        z: comment.position.z,
      },
      text: comment.text,
      timestamp: comment.timestamp,
    }));
    localStorage.setItem(`comments_${roomKey}`, JSON.stringify(commentsData));
  }

  loadComments() {
    const roomKey = localStorage.getItem("currentRoom") || "default";
    const savedComments = localStorage.getItem(`comments_${roomKey}`);
    if (savedComments) {
      const commentsData = JSON.parse(savedComments);
      commentsData.forEach((data) => {
        const position = new THREE.Vector3(
          data.position.x,
          data.position.y,
          data.position.z
        );
        const comment = new Comment(
          data.id,
          position,
          data.text,
          data.timestamp
        );
        this.comments.push(comment);
        this.createCommentMarker(comment);
        if (data.id >= this.nextCommentId) {
          this.nextCommentId = data.id + 1;
        }
      });
    }
  }

  setupCommentEventListeners() {
    // Add click event listener for comment placement
    this.renderer.domElement.addEventListener("click", (event) => {
      this.handleCommentClick(event);
    });

    // Add mouse move listener for hover effects
    this.renderer.domElement.addEventListener("mousemove", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Add escape key listener to cancel comment mode
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isAddingComment) {
        this.disableCommentMode();
      }
    });
  }
}

// Initialize the viewer
const viewer = new ARFurnitureViewer();
window.viewer = viewer; // Make viewer globally accessible

// Handle window resizing
window.addEventListener("resize", () => viewer.handleResize());
