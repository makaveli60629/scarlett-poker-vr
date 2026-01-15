"use strict";
/**
 * Scarlett 1.0 - world.js
 * Initializes and manages the A-Frame 3D scene, dynamically loads enabled modules,
 * and sets up event hooks and diagnostics integration (XR, HUD, etc.).
 * Ensures compatibility with Oculus Quest and Android input via core integrations.
 * Resilient to load errors: modules failing to load will be skipped without stopping the app.
 */
(function(){
    // Start world initialization after DOM is ready
    function startWorld() {
        // Verify A-Frame is present
        if (typeof AFRAME === "undefined") {
            console.error("A-Frame not found. world.js aborted.");
            if (window.SpineDiag && typeof window.SpineDiag.error === "function") {
                window.SpineDiag.error("A-Frame not loaded - cannot initialize world.");
            }
            return;
        }
        // Get or create the A-Frame scene element
        var sceneEl = document.querySelector("a-scene");
        if (!sceneEl) {
            sceneEl = document.createElement("a-scene");
            // sceneEl.setAttribute("embedded", ""); // If needed, uncomment to embed scene in an overlay
            document.body.appendChild(sceneEl);
        }
        // Global World event hooks for modules
        window.World = window.World || {};
        World.onStart = World.onStart || [];
        World.onTick = World.onTick || [];
        World.onXRSessionStart = World.onXRSessionStart || [];
        World.onXRSessionEnd = World.onXRSessionEnd || [];
        World.addOnStart = function(fn) { if (typeof fn === "function") World.onStart.push(fn); };
        World.addOnTick = function(fn) { if (typeof fn === "function") World.onTick.push(fn); };
        World.addOnXRSessionStart = function(fn) { if (typeof fn === "function") World.onXRSessionStart.push(fn); };
        World.addOnXRSessionEnd = function(fn) { if (typeof fn === "function") World.onXRSessionEnd.push(fn); };
        // Integrate existing core systems if present
        if (window.SpineModules && typeof window.SpineModules.init === "function") {
            try { window.SpineModules.init(World); } catch(e) { console.error("SpineModules.init error:", e); }
        }
        if (window.SpineAndroid && typeof window.SpineAndroid.init === "function") {
            try { window.SpineAndroid.init(sceneEl); } catch(e) { console.error("SpineAndroid.init error:", e); }
        }
        if (window.SpineXR && typeof window.SpineXR.init === "function") {
            try { window.SpineXR.init(sceneEl); } catch(e) { console.error("SpineXR.init error:", e); }
        }
        if (window.SpineHUD && typeof window.SpineHUD.init === "function") {
            try { window.SpineHUD.init(sceneEl); } catch(e) { console.error("SpineHUD.init error:", e); }
        }
        if (window.SpineDiag && typeof window.SpineDiag.init === "function") {
            try { window.SpineDiag.init(sceneEl); } catch(e) { console.error("SpineDiag.init error:", e); }
        }
        // Register a component to dispatch tick events to modules each frame
        AFRAME.registerComponent("world-listener", {
            tick: function(time, timeDelta) {
                for (var i = 0; i < World.onTick.length; i++) {
                    try {
                        World.onTick[i](time, timeDelta);
                    } catch (err) {
                        console.error("Error in onTick handler:", err);
                    }
                }
            }
        });
        var tickEntity = document.createElement("a-entity");
        tickEntity.setAttribute("world-listener", "");
        // Track initialization status
        var sceneLoaded = false;
        var modulesLoaded = false;
        // Invoke all onStart listeners and update HUD status when initialization is complete
        function tryCallOnStart() {
            if (sceneLoaded && modulesLoaded) {
                for (var i = 0; i < World.onStart.length; i++) {
                    try {
                        World.onStart[i]();
                    } catch (err) {
                        console.error("Error in onStart handler:", err);
                    }
                }
                // Set diagnostics HUD status to "Booted"
                if (window.SpineDiag && typeof window.SpineDiag.setStatus === "function") {
                    window.SpineDiag.setStatus("Booted");
                } else if (window.SpineHUD && typeof window.SpineHUD.setStatus === "function") {
                    window.SpineHUD.setStatus("Booted");
                }
                console.log("World initialization complete. System Booted.");
            }
        }
        // Handle scene load event (or immediately if already loaded)
        if (sceneEl.hasLoaded) {
            sceneLoaded = true;
            sceneEl.appendChild(tickEntity);
            // No tryCallOnStart here; wait for modules to finish loading
        } else {
            sceneEl.addEventListener("loaded", function() {
                sceneLoaded = true;
                sceneEl.appendChild(tickEntity);
                tryCallOnStart();
            });
        }
        // Attach XR session event listeners for VR/AR enter and exit
        sceneEl.addEventListener("enter-vr", function(evt) {
            for (var i = 0; i < World.onXRSessionStart.length; i++) {
                try { World.onXRSessionStart[i](evt); } catch (err) {
                    console.error("Error in onXRSessionStart handler:", err);
                }
            }
        });
        sceneEl.addEventListener("exit-vr", function(evt) {
            for (var i = 0; i < World.onXRSessionEnd.length; i++) {
                try { World.onXRSessionEnd[i](evt); } catch (err) {
                    console.error("Error in onXRSessionEnd handler:", err);
                }
            }
        });
        // Load enabled modules from modules.json configuration
        var configUrl = "modules.json";
        var loadModulesPromise;
        if (window.fetch) {
            // Use Fetch API if available
            loadModulesPromise = fetch(configUrl).then(function(res) {
                if (!res.ok) throw new Error("HTTP " + res.status + " while fetching " + configUrl);
                return res.json();
            });
        } else {
            // Fallback to XHR for older browsers without fetch
            loadModulesPromise = new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", configUrl, true);
                xhr.onload = function() {
                    if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error("Invalid JSON in " + configUrl + ": " + e));
                        }
                    } else {
                        reject(new Error("HTTP " + xhr.status + " while fetching " + configUrl));
                    }
                };
                xhr.onerror = function() {
                    reject(new Error("Network error while fetching " + configUrl));
                };
                try {
                    xhr.send();
                } catch (err) {
                    reject(err);
                }
            });
        }
        // Once modules configuration is retrieved, load each enabled module script
        loadModulesPromise.then(function(modulesData) {
            var modulesList;
            if (Array.isArray(modulesData)) {
                modulesList = modulesData;
            } else if (modulesData && Array.isArray(modulesData.modules)) {
                modulesList = modulesData.modules;
            } else if (modulesData && typeof modulesData === "object") {
                modulesList = [];
                for (var key in modulesData) {
                    if (modulesData.hasOwnProperty(key)) {
                        var m = modulesData[key];
                        if (m && typeof m === "object") {
                            m.name = m.name || key;
                            modulesList.push(m);
                        }
                    }
                }
            } else {
                console.warn("No modules found in configuration.");
                modulesList = [];
            }
            // Helper to load modules sequentially (ensures order if needed)
            function loadModuleAt(index) {
                if (index >= modulesList.length) {
                    // All modules processed
                    modulesLoaded = true;
                    console.log("All modules loaded.");
                    tryCallOnStart();
                    return;
                }
                var mod = modulesList[index];
                var enabled = true;
                if (mod.enabled === false || mod.disabled === true) {
                    enabled = false;
                }
                var src = mod.src || mod.path || mod.url;
                if (enabled && src) {
                    var script = document.createElement("script");
                    script.src = src;
                    script.async = true;
                    script.onload = function() {
                        console.log("Loaded module:", mod.name || src);
                        if (window.SpineDiag && typeof window.SpineDiag.log === "function") {
                            window.SpineDiag.log("Module loaded: " + (mod.name || src));
                        }
                        loadModuleAt(index + 1);
                    };
                    script.onerror = function(err) {
                        console.error("Error loading module:", mod.name || src, err);
                        if (window.SpineDiag && typeof window.SpineDiag.warn === "function") {
                            window.SpineDiag.warn("Module failed: " + (mod.name || src));
                        }
                        // Continue loading next modules even if one fails
                        loadModuleAt(index + 1);
                    };
                    document.head.appendChild(script);
                } else {
                    // Skip this module if not enabled or no source
                    loadModuleAt(index + 1);
                }
            }
            loadModuleAt(0);
        }).catch(function(err) {
            console.error("Modules configuration load error:", err);
            if (window.SpineDiag && typeof window.SpineDiag.error === "function") {
                window.SpineDiag.error("Modules config failed to load.");
            }
            // No modules loaded (or config failed) - mark modules as loaded to finish startup
            modulesLoaded = true;
            tryCallOnStart();
        });
    }
    // Run startWorld when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startWorld);
    } else {
        startWorld();
    }
})();
