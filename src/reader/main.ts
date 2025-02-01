import { listen } from "@tauri-apps/api/event";

let contentContainer: HTMLDivElement | null = null;

document.addEventListener("keydown", (event) => event.preventDefault());
document.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("DOMContentLoaded", () => {
  contentContainer = document.getElementById(
    "content-container"
  ) as HTMLDivElement;
});

listen("start-changing-styles", () => {
  const style = contentContainer!.style;
  style.outlineWidth = "3px";
  style.visibility = "visible";
});

listen("end-changing-styles", () => {
  const style = contentContainer!.style;
  style.outlineWidth = "0px";
  style.visibility = "hidden";
});

listen("show", () => {
  contentContainer!.style.visibility = "visible";
});

listen("hide", () => {
  contentContainer!.style.visibility = "hidden";
});

listen("next-page", () => {
  // TODO: Complete this
  console.log("next-page received");
});

listen("prev-page", () => {
  // TODO: Complete this
  console.log("prev-page received");
});
