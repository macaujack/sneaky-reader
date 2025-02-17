export interface PageContent {
  startIndex: number;
  contentLength: number;
}

export class Pager {
  nonNegativePages: PageContent[];
  negativePages: PageContent[];
  pageIndex: number;
  nextPageCalculator: (curPageContent: PageContent) => PageContent | null;
  prevPageCalculator: (curPageContent: PageContent) => PageContent | null;

  constructor(
    startIndex: number,
    contentLength: number,
    nextPageCalculator: (curPageContent: PageContent) => PageContent | null,
    prevPageCalculator: (curPageContent: PageContent) => PageContent | null
  ) {
    this.nonNegativePages = [{ startIndex, contentLength }];
    this.negativePages = [];
    this.pageIndex = 0;
    this.nextPageCalculator = nextPageCalculator;
    this.prevPageCalculator = prevPageCalculator;
  }

  nextPage(): PageContent | null {
    this.pageIndex++;
    if (this.pageIndex < 0) {
      return this.negativePages[-this.pageIndex - 1];
    }
    if (this.pageIndex >= this.nonNegativePages.length) {
      const nextPageContent = this.nextPageCalculator(
        this.nonNegativePages[this.nonNegativePages.length - 1]
      );
      if (nextPageContent === null) {
        this.pageIndex--;
        return null;
      }
      this.nonNegativePages.push(nextPageContent);
    }
    return this.nonNegativePages[this.pageIndex];
  }

  prevPage(): PageContent | null {
    this.pageIndex--;
    if (this.pageIndex >= 0) {
      return this.nonNegativePages[this.pageIndex];
    }
    const negativeIndex = -this.pageIndex - 1;
    if (negativeIndex >= this.negativePages.length) {
      const prevPage = this.prevPageCalculator(
        negativeIndex === 0
          ? this.nonNegativePages[0]
          : this.negativePages[this.negativePages.length - 1]
      );
      if (prevPage === null) {
        this.pageIndex++;
        return null;
      }
      this.negativePages.push(prevPage);
    }
    return this.negativePages[negativeIndex];
  }
}
