export async function init(){
  const scene = document.getElementById("scene");
  if (!scene) return;
  for (let i=0;i<6;i++){
    const chip = document.createElement("a-cylinder");
    chip.setAttribute("radius","0.06");
    chip.setAttribute("height","0.012");
    chip.setAttribute("position", `0 ${1.005 + i*0.0125} -0.7`);
    chip.setAttribute("color", i%2===0 ? "#ff4d4d" : "#2b7cff");
    scene.appendChild(chip);
  }
}
