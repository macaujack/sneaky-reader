import { listen } from "@tauri-apps/api/event";
import { Config, invokeCommand, ReaderBookInfo } from "../util";
import { Pager } from "./pager";

const BINARY_SEARCH_START_LENGTH = 512;

let contentContainerReal: HTMLDivElement | null = null;
let contentContainerDryRun: HTMLDivElement | null = null;
let contentReal: HTMLDivElement | null = null;
let contentDryRun: HTMLDivElement | null = null;

let bookInfo: ReaderBookInfo | null = null;
let pager: Pager | null = null;

document.addEventListener("keydown", (event) => event.preventDefault());
document.addEventListener("keyup", (event) => event.preventDefault());
document.addEventListener("mousedown", (event) => event.preventDefault());
document.addEventListener("mouseup", (event) => event.preventDefault());
document.addEventListener("wheel", (event) => event.preventDefault());
document.addEventListener("contextmenu", (event) => event.preventDefault());

window.addEventListener("DOMContentLoaded", async () => {
  contentContainerReal = document.getElementById(
    "content-container-real"
  ) as HTMLDivElement;
  contentContainerDryRun = document.getElementById(
    "content-container-dry-run"
  ) as HTMLDivElement;
  contentReal = document.getElementById("content-real") as HTMLDivElement;
  contentDryRun = document.getElementById("content-dry-run") as HTMLDivElement;

  const temBookInfo = await invokeCommand<ReaderBookInfo | null>(
    "get_first_reader_book_info"
  );
  if (typeof temBookInfo === "undefined") {
    console.error("Error calling 'get_first_reader_book_info'");
    return;
  }
  bookInfo = temBookInfo;

  const config = await invokeCommand<Config>("get_config");
  if (typeof config === "undefined") {
    console.error("Error calling 'get_config'");
    return;
  }

  contentReal.style.fontSize = `${config.appearance.text_size}px`;
  contentDryRun.style.fontSize = `${config.appearance.text_size}px`;
  contentReal.style.color = config.appearance.text_color;
  contentDryRun.style.color = config.appearance.text_color;

  refreshContent();
});

listen("start-changing-styles", () => {
  if (!contentContainerReal) {
    console.warn("DOM content not loaded");
    return;
  }
  const style = contentContainerReal.style;
  style.outlineWidth = "3px";
  style.visibility = "visible";
});

listen("end-changing-styles", () => {
  if (!contentContainerReal) {
    console.warn("DOM content not loaded");
    return;
  }
  const style = contentContainerReal.style;
  style.outlineWidth = "0px";
  style.visibility = "hidden";
});

listen("show", () => {
  if (!contentContainerReal) {
    console.warn("DOM content not loaded");
    return;
  }
  contentContainerReal.style.visibility = "visible";
});

listen("hide", () => {
  if (!contentContainerReal) {
    console.warn("DOM content not loaded");
    return;
  }
  contentContainerReal.style.visibility = "hidden";
});

listen("next-page", () => {
  if (!bookInfo || !contentReal) {
    console.warn("Book content not initialized");
    return;
  }
  if (!pager) {
    console.warn("Pager not initialized");
    return;
  }
  const newPageContent = pager.nextPage();
  if (newPageContent === null) {
    return;
  }
  showContentInParagraphs(
    contentReal,
    bookInfo.content.substring(
      newPageContent.startIndex,
      newPageContent.startIndex + newPageContent.contentLength
    )
  );

  bookInfo.progress = newPageContent.startIndex;
  reportProgress();
});

listen("prev-page", () => {
  if (!bookInfo || !contentReal) {
    console.warn("Book content not initialized");
    return;
  }
  if (!pager) {
    console.warn("Pager not initialized");
    return;
  }
  const newPageContent = pager.prevPage();
  if (newPageContent === null) {
    return;
  }
  showContentInParagraphs(
    contentReal,
    bookInfo.content.substring(
      newPageContent.startIndex,
      newPageContent.startIndex + newPageContent.contentLength
    )
  );

  bookInfo.progress = newPageContent!.startIndex;
  reportProgress();
});

listen<ReaderBookInfo>("book-changed", (event) => {
  bookInfo = event.payload;
  refreshContent();
});

listen("refresh-content", refreshContent);

listen<number>("text-size-changed", (event) => {
  if (!contentReal || !contentDryRun) {
    console.warn("DOM content not loaded");
    return;
  }
  const textSize = `${event.payload}px`;
  contentReal.style.fontSize = textSize;
  contentDryRun.style.fontSize = textSize;
  refreshContent();
});

listen<string>("text-color-changed", (event) => {
  if (!contentReal || !contentDryRun) {
    console.warn("DOM content not loaded");
    return;
  }
  const textColor = event.payload;
  contentReal.style.color = textColor;
  contentDryRun.style.color = textColor;
});

function refreshContent(): void {
  const bestLength = binarySearchBestLength(
    (len) =>
      bookInfo!.content.substring(bookInfo!.progress, bookInfo!.progress + len),
    bookInfo!.content.length - bookInfo!.progress
  );

  pager = new Pager(
    bookInfo!.progress,
    bestLength,
    (pageContent) => {
      if (
        pageContent.startIndex + pageContent.contentLength >=
        bookInfo!.content.length
      ) {
        return null;
      }
      const nextBestLength = binarySearchBestLength(
        (len) =>
          bookInfo!.content.substring(
            pageContent.startIndex + pageContent.contentLength,
            pageContent.startIndex + pageContent.contentLength + len
          ),
        bookInfo!.content.length -
          pageContent.startIndex -
          pageContent.contentLength
      );
      return {
        startIndex: pageContent.startIndex + pageContent.contentLength,
        contentLength: nextBestLength,
      };
    },
    (pageContent) => {
      if (pageContent.startIndex <= 0) {
        return null;
      }
      const prevBestLength = binarySearchBestLength(
        (len) =>
          bookInfo!.content.substring(
            pageContent.startIndex - len,
            pageContent.startIndex
          ),
        pageContent.startIndex
      );
      return {
        startIndex: pageContent.startIndex - prevBestLength,
        contentLength: prevBestLength,
      };
    }
  );

  showContentInParagraphs(
    contentReal!,
    bookInfo!.content.substring(
      bookInfo!.progress,
      bookInfo!.progress + bestLength
    )
  );
}

async function reportProgress(): Promise<void> {
  if (!bookInfo) {
    console.warn("Not reading any book. Won't call update_progress");
    return;
  }
  await invokeCommand("update_progress", {
    title: bookInfo.title,
    progress: bookInfo.progress,
  });
}

function binarySearchBestLength(
  lenToStr: (len: number) => string,
  maxLen: number
): number {
  if (maxLen <= 0) {
    return -1;
  }

  let left = 0;
  let right = Math.min(BINARY_SEARCH_START_LENGTH, maxLen);

  while (canFit(lenToStr(right))) {
    if (right === maxLen) {
      return maxLen;
    }
    left = right;
    right = Math.min(right * 2, maxLen);
  }

  let mid = 0;
  while (left !== right) {
    mid = ~~((left + right + 1) / 2);
    if (canFit(lenToStr(mid))) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }

  return left;
}

function canFit(content: string): boolean {
  showContentInParagraphs(contentDryRun!, content);
  return (
    contentContainerDryRun!.scrollHeight <= contentContainerDryRun!.clientHeight
  );
}

function showContentInParagraphs(div: HTMLDivElement, content: string): void {
  const paragraphContents = content.split("\n").filter((s) => s.length > 0);
  const paragraphs = paragraphContents.map((content) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    return paragraph;
  });
  div.replaceChildren(...paragraphs);
}
