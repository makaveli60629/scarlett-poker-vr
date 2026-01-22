export async function init(){
  const scene = document.getElementById("scene");
  if (!scene) return;
  const names = ["BOT_A", "BOT_B", "BOT_C", "BOT_D"];
  const spots = [{x:-1.6,z:0},{x:1.6,z:0},{x:0,z:-1.7},{x:0,z:1.7}];
  names.forEach((n,i)=>{
    const e = document.createElement("a-text");
    e.setAttribute("value", n);
    e.setAttribute("align","center");
    e.setAttribute("color","#d9e6ff");
    e.setAttribute("width","3");
    e.setAttribute("position", `${spots[i].x} 1.25 ${spots[i].z}`);
    scene.appendChild(e);
  });
}
