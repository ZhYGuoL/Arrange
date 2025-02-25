import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

class ARViewer extends ARFurnitureViewer {
  constructor() {
    super();
    this.setupAR();
  }

  setupAR() {
    this.renderer.xr.enabled = true;

    // Add AR button to enter AR mode
    const arButton = ARButton.createButton(this.renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.getElementById("ar-overlay") },
    });
    document.body.appendChild(arButton);

    // Update animation loop for AR
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    });
  }

  // Override animate method for AR
  animate() {
    // Animation handled by setAnimationLoop in AR mode
  }
}
