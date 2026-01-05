// ===== Room Management (SAFE STUBS) =====

let _currentRoom = "lobby";

export function setCurrentRoom(roomName) {
  _currentRoom = roomName || "lobby";
  console.log("[State] Current room set to:", _currentRoom);
}

export function getCurrentRoom() {
  return _currentRoom;
}
