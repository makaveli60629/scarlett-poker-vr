// world.js - Scarlett 1.0 VR Poker Game World Initialization
(function() {
    "use strict";
    // Safe stub for Diagnostics module (for boot logging and diagnostics)
    if (typeof window.Diagnostics === "undefined") {
        window.Diagnostics = {
            isStub: true,
            log: function(msg) { console.log("[Diagnostics] " + msg); },
            warn: function(msg) { console.warn("[Diagnostics] " + msg); },
            error: function(msg) { console.error("[Diagnostics] " + msg); }
        };
    } else {
        window.Diagnostics.isStub = false;
    }
    // Safe stub for HUD module (for in-game heads-up display)
    if (typeof window.HUD === "undefined") {
        window.HUD = {
            isStub: true,
            show: function() {},
            hide: function() {},
            toggle: function() {}
        };
    } else {
        window.HUD.isStub = false;
    }
    // Safe stub for Teleport module (VR teleportation)
    if (typeof window.Teleport === "undefined") {
        window.Teleport = {
            isStub: true,
            init: function(scene, rig, renderer) {},
            teleportTo: function(target) {}
        };
    } else {
        window.Teleport.isStub = false;
    }
    // Safe stub for Movement/Controls module (player movement control)
    if (typeof window.Movement === "undefined") {
        window.Movement = {
            isStub: true,
            init: function(params) {},
            update: function() {}
        };
    } else {
        window.Movement.isStub = false;
    }
    // Logging utility uses Diagnostics if available, otherwise console
    function log(msg) {
        if (window.Diagnostics && typeof window.Diagnostics.log === "function") {
            window.Diagnostics.log(msg);
        } else {
            console.log(msg);
        }
    }
    log("Scarlett VR World: Starting initialization...");
    // Load Three.js from CDN if not already present, then initialize world
    function loadThreeAndInit() {
        if (typeof window.THREE !== "undefined") {
            log("Three.js already loaded.");
            initWorld();
        } else {
            log("Three.js not found, loading from CDN...");
            var script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r150/three.min.js";
            script.onload = function() {
                log("Three.js loaded from CDN.");
                initWorld();
            };
            script.onerror = function() {
                log("Error: Three.js failed to load.");
            };
            document.head.appendChild(script);
        }
    }
    // Main world initialization function (called after Three.js is ready)
    function initWorld() {
        log("Initializing Three.js scene...");
        // Create scene
        var scene = new THREE.Scene();
        // Basic lighting setup
        var ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        scene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);
        // Camera and player rig
        var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 0); // set camera at player eye height (~1.6m)
        var playerRig = new THREE.Group();
        playerRig.add(camera);
        scene.add(playerRig);
        log("Scene, camera, and player rig created.");
        // Renderer (WebGL) setup
        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.xr.enabled = true;
        document.body.appendChild(renderer.domElement);
        // Enable VR (WebXR) if supported and add VR button
        if (navigator.xr && navigator.xr.isSessionSupported) {
            navigator.xr.isSessionSupported('immersive-vr').then(function(supported) {
                if (supported) {
                    document.body.appendChild(THREE.VRButton.createButton(renderer));
                    log("WebXR supported: VR mode enabled.");
                } else {
                    log("WebXR not supported: Running in non-VR mode.");
                }
            });
        } else {
            log("WebXR not available: Running in non-VR (debug) mode.");
        }
        // Handle optional modules initialization (Movement, Teleport, etc.)
        if (!window.Movement.isStub && typeof window.Movement.init === "function") {
            try {
                window.Movement.init({ scene: scene, rig: playerRig, camera: camera, renderer: renderer });
                log("Custom Movement module initialized.");
            } catch (e) {
                log("Movement module initialization error: " + e);
            }
        } else {
            // Basic WASD controls for movement as fallback (desktop or debug use)
            window.addEventListener("keydown", function(event) {
                var step = 0.2;
                switch (event.key) {
                    case "ArrowUp":
                    case "w":
                        playerRig.translateZ(-step);
                        break;
                    case "ArrowDown":
                    case "s":
                        playerRig.translateZ(step);
                        break;
                    case "ArrowLeft":
                    case "a":
                        playerRig.translateX(-step);
                        break;
                    case "ArrowRight":
                    case "d":
                        playerRig.translateX(step);
                        break;
                    case "q":
                        playerRig.rotation.y += Math.PI / 18; // rotate left (~10°)
                        break;
                    case "e":
                        playerRig.rotation.y -= Math.PI / 18; // rotate right (~10°)
                        break;
                }
            });
            log("Fallback keyboard controls (WASD + QE) enabled for movement.");
        }
        if (!window.Teleport.isStub && typeof window.Teleport.init === "function") {
            try {
                window.Teleport.init(scene, playerRig, renderer);
                log("Custom Teleport module initialized.");
            } catch (e) {
                log("Teleport module initialization error: " + e);
            }
        }
        // VR controllers and input setup
        var controller1, controller2;
        if (renderer.xr.enabled) {
            controller1 = renderer.xr.getController(0);
            controller2 = renderer.xr.getController(1);
            // Mark controller handedness when connected
            controller1.addEventListener('connected', function(event) {
                controller1.userData.handedness = event.data.handedness;
            });
            controller2.addEventListener('connected', function(event) {
                controller2.userData.handedness = event.data.handedness;
            });
            // Teleport on controller select (trigger press) - use right hand by default
            var onSelect = function() {
                var hand = this.userData.handedness || "unknown";
                if (hand === "right" || hand === "unknown") {
                    if (!window.Teleport.isStub && typeof window.Teleport.teleportTo === "function") {
                        // If Teleport module present, delegate to it
                        window.Teleport.teleportTo(playerRig);
                        log("Teleport module invoked for teleport.");
                    } else {
                        // Fallback: simple teleport forward
                        var forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                        forwardDir.y = 0;
                        forwardDir.normalize();
                        playerRig.position.add(forwardDir.multiplyScalar(3));
                        log("Fallback teleport: moved player rig forward.");
                    }
                }
            };
            controller1.addEventListener('select', onSelect);
            controller2.addEventListener('select', onSelect);
            scene.add(controller1);
            scene.add(controller2);
            // Add controller models (optional, if XRControllerModelFactory is available)
            if (THREE.XRControllerModelFactory) {
                var controllerModelFactory = new THREE.XRControllerModelFactory();
                var grip1 = renderer.xr.getControllerGrip(0);
                grip1.add(controllerModelFactory.createControllerModel(grip1));
                scene.add(grip1);
                var grip2 = renderer.xr.getControllerGrip(1);
                grip2.add(controllerModelFactory.createControllerModel(grip2));
                scene.add(grip2);
            }
            log("VR controllers initialized.");
        }
        // HUD toggle (using 'H' key) for diagnostics or debugging
        window.addEventListener("keydown", function(event) {
            if (event.key === "h" || event.key === "H") {
                if (!window.HUD.isStub && typeof window.HUD.toggle === "function") {
                    window.HUD.toggle();
                    log("HUD toggle triggered.");
                } else {
                    // If no HUD module, toggle the debug overlay (if exists)
                    var debugPanel = document.getElementById("debugHUD");
                    if (debugPanel) {
                        var isVisible = debugPanel.style.display !== "none";
                        debugPanel.style.display = isVisible ? "none" : "block";
                        log("Debug HUD overlay " + (isVisible ? "hidden" : "shown") + ".");
                    }
                }
            }
        });
        // On-screen debug message element (to confirm boot)
        var debugMsg = document.createElement("div");
        debugMsg.id = "debugHUD";
        debugMsg.style.position = "absolute";
        debugMsg.style.bottom = "10px";
        debugMsg.style.left = "10px";
        debugMsg.style.padding = "5px 10px";
        debugMsg.style.backgroundColor = "rgba(0,0,0,0.5)";
        debugMsg.style.color = "#0f0";
        debugMsg.style.font = "12px monospace";
        debugMsg.textContent = "Scarlett VR World booted successfully.";
        // Append debug message overlay only if no custom HUD is present
        if (window.HUD.isStub) {
            document.body.appendChild(debugMsg);
        }
        log("World initialization complete. Entering render loop...");
        // Animation loop (renderer.setAnimationLoop handles VR and desktop rendering)
        function renderLoop() {
            // If VR is active and no custom movement module, handle controller thumbstick movement
            if (renderer.xr.isPresenting && window.Movement.isStub) {
                var session = renderer.xr.getSession();
                if (session) {
                    session.inputSources.forEach(function(input) {
                        if (input.gamepad && input.handedness === "left") {
                            var gp = input.gamepad;
                            var axes = gp.axes;
                            if (axes.length >= 2) {
                                var ax = 0, ay = 0;
                                if (axes.length >= 4) {
                                    // Oculus Quest (axes: [padX, padY, thumbX, thumbY])
                                    ax = axes[2];
                                    ay = axes[3];
                                } else {
                                    // Only two axes (e.g., single joystick or touchpad)
                                    ax = axes[0];
                                    ay = axes[1];
                                }
                                // Determine movement vector from axes
                                var moveSpeed = 0.1;
                                var forward = -ay * moveSpeed;
                                var strafe = ax * moveSpeed;
                                // Move relative to camera orientation (on horizontal plane)
                                var dir = new THREE.Vector3();
                                camera.getWorldDirection(dir);
                                dir.y = 0;
                                dir.normalize();
                                var right = new THREE.Vector3();
                                right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
                                playerRig.position.addScaledVector(dir, forward);
                                playerRig.position.addScaledVector(right, strafe);
                            }
                        }
                        // (Optional) Could handle right stick for rotation here
                    });
                }
            }
            // Update custom movement module each frame if present
            if (!window.Movement.isStub && typeof window.Movement.update === "function") {
                try {
                    window.Movement.update();
                } catch (err) {
                    console.error("Movement module update error:", err);
                }
            }
            renderer.render(scene, camera);
        }
        renderer.setAnimationLoop(renderLoop);
    }
    // Start loading and initialization process
    loadThreeAndInit();
})();
