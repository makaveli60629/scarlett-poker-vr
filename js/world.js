(function(){
  const world = document.getElementById("world");

  function el(tag, attrs){
    const e = document.createElement(tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function buildWorld(){
    world.innerHTML = "";

    /* FLOOR */
    world.appendChild(el("a-circle",{
      rotation:"-90 0 0",
      radius:"26",
      material:"color:#0c1118; roughness:1"
    }));

    /* LOBBY WALL */
    world.appendChild(el("a-cylinder",{
      radius:"23.6",
      height:"10",
      position:"0 5 0",
      material:"color:#070c12; side:double"
    }));

    /* CEILING RING */
    world.appendChild(el("a-torus",{
      rotation:"90 0 0",
      position:"0 9.8 0",
      radius:"18",
      radiusTubular:"0.18",
      material:"color:#4aa6ff; emissive:#4aa6ff; emissiveIntensity:1"
    }));

    /* DIVOT (SUNK INTO FLOOR) */
    world.appendChild(el("a-ring",{
      rotation:"-90 0 0",
      radiusInner:"4.5",
      radiusOuter:"8.5",
      material:"color:#0a0f18"
    }));

    /* TABLE (LOWERED) */
    world.appendChild(el("a-cylinder",{
      radius:"3.4",
      height:"0.45",
      position:"0 0.23 0",
      material:"color:#0f7a60"
    }));

    /* SPAWN PAD (SAFE + VISIBLE) */
    world.appendChild(el("a-ring",{
      rotation:"-90 0 0",
      position:"0 0 18",
      radiusInner:"0.6",
      radiusOuter:"1.0",
      material:"color:#4aa6ff; emissive:#4aa6ff; emissiveIntensity:1"
    }));

    console.log("[world] build complete");
  }

  buildWorld();
})();
