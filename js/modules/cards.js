export async function init(){
  const scene = document.getElementById("scene");
  if (!scene) return;
  for (let i=0;i<5;i++){
    const c = document.createElement("a-plane");
    c.setAttribute("width","0.22");
    c.setAttribute("height","0.32");
    c.setAttribute("position", `${-0.55 + i*0.275} 1.02 0`);
    c.setAttribute("rotation","-90 0 0");
    c.setAttribute("material","color:#ffffff; opacity:0.95");
    scene.appendChild(c);
  }
}
