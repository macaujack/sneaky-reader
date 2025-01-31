import { listen } from "@tauri-apps/api/event";

let contentContainer: HTMLDivElement | null = null;

document.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  contentContainer = document.getElementById(
    "content-container"
  ) as HTMLDivElement;
});

listen("start-changing-styles", startChangingStyles);
listen("end-changing-styles", endChangingStyles);

function startChangingStyles() {
  contentContainer!.style.outlineWidth = "3px";
}

function endChangingStyles() {
  contentContainer!.style.outlineWidth = "0px";
}
