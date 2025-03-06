import {
  Alert,
  AlertColor,
  AlertPropsColorOverrides,
  Box,
  Button,
  Dialog,
  DialogContent,
  Grid2,
  Snackbar,
  TextField,
} from "@mui/material";
import { OverridableStringUnion } from "@mui/types";
import { open } from "@tauri-apps/plugin-dialog";
import { Book, invokeCommand, NewBooksResult, ReaderBookInfo } from "../util";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BookCard from "./components/BookCard";
import { readFile } from "@tauri-apps/plugin-fs";
import * as jschardet from "jschardet";

type Severity = OverridableStringUnion<AlertColor, AlertPropsColorOverrides>;

interface SnackbarInfo {
  open: boolean;
  message: string;
  severity?: Severity;
}

export default function Library() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState([] as Book[]);
  const [showingContextMenuBookTitle, setShowingContextMenuBookTitle] =
    useState("");
  const [snackbarInfo, setSnackbarInfo] = useState<SnackbarInfo>({
    open: false,
    message: "",
    severity: "warning",
  });
  const [dialogNewBookOpen, setDialogNewBookOpen] = useState(false);
  const [dialogRenameBookOpen, setDialogRenameBookOpen] = useState(false);
  const [originalTitle, setOriginalTitle] = useState("");
  const [renameTitle, setRenameTitle] = useState("");

  useEffect(() => {
    invokeCommand<Book[]>("get_books").then((books) => {
      if (typeof books === "undefined") {
        console.error("Not received books after calling 'get_books'");
        return;
      }
      setBooks(books);
      setReady(true);
    });
  }, []);

  const bookTitles = useMemo(() => new Set(books.map((b) => b.title)), [books]);

  const onNewBook = async () => {
    setDialogNewBookOpen(true);
  };

  const onSelectFiles = async () => {
    setShowingContextMenuBookTitle("");

    const selectedBookPaths = await open({
      title: t("importTxtBooks"),
      multiple: true,
      directory: false,
      filters: [
        {
          name: t("plainTextFiles"),
          extensions: ["txt"],
        },
      ],
    });

    if (selectedBookPaths === null || selectedBookPaths.length === 0) {
      return;
    }

    const failedPaths: string[] = [];
    const readerBookInfos: ReaderBookInfo[] = [];

    for (const selectedPath of selectedBookPaths) {
      if (bookTitles.has(selectedPath)) {
        failedPaths.push(selectedPath);
        continue;
      }

      const rawContentBytes = await readFile(selectedPath);
      const binaryString = Array.from(rawContentBytes)
        .map((b) => String.fromCharCode(b))
        .join("");
      const detectResult = jschardet.detect(binaryString);
      const decoder = new TextDecoder(detectResult.encoding);
      let content;
      try {
        content = decoder.decode(rawContentBytes);
      } catch {
        failedPaths.push(selectedPath);
        continue;
      }

      const lastDot = selectedPath.lastIndexOf(".");
      const lastSlash = Math.max(
        selectedPath.lastIndexOf("/", lastDot - 1),
        selectedPath.lastIndexOf("\\", lastDot - 1)
      );
      readerBookInfos.push({
        title: selectedPath.substring(lastSlash + 1, lastDot),
        content,
        progress: 0,
      });
    }

    const newBooksResult = await invokeCommand<NewBooksResult>("new_books", {
      bookInfos: readerBookInfos,
    });
    if (typeof newBooksResult === "undefined") {
      console.error("Not received import books result");
      return;
    }

    setBooks((books) => {
      if (newBooksResult.successful.length === 0) {
        return books;
      }
      if (books.length === 0) {
        return newBooksResult.successful;
      }
      return [books[0], ...newBooksResult.successful, ...books.slice(1)];
    });

    const counts = {
      countSuccess: newBooksResult.successful.length,
      countFail: newBooksResult.failed.length + failedPaths.length,
    };
    let i18nKey, severity: Severity;
    if (counts.countSuccess > 0 && counts.countFail > 0) {
      i18nKey = "importedSomeBooks";
      severity = "info";
    } else if (counts.countSuccess > 0) {
      i18nKey = "importedAllBooks";
      severity = "success";
    } else {
      i18nKey = "importedNoneBook";
      severity = "error";
    }

    setSnackbarInfo({
      open: true,
      message: t(i18nKey, counts),
      severity,
    });
  };

  const createOnBookSelect = (bookTitle: string) => async () => {
    const books = await invokeCommand<Book[]>("change_book", {
      title: bookTitle,
    });
    if (typeof books === "undefined") {
      console.error("Not received books after calling 'change_book'");
      return;
    }
    setBooks(books);
    setShowingContextMenuBookTitle("");
  };

  const createOnBookContextMenu = (bookTitle: string) => () => {
    setShowingContextMenuBookTitle(bookTitle);
  };

  const createOnBookRename = (bookTitle: string) => async () => {
    setOriginalTitle(bookTitle);
    setRenameTitle(bookTitle);
    setDialogRenameBookOpen(true);
  };

  const createOnBookRemove = (bookTitle: string) => async () => {
    if (books.length === 1) {
      setSnackbarInfo({
        open: true,
        message: t("cannotRemoveLastBook"),
        severity: "warning",
      });
      return;
    }
    await invokeCommand("remove_book", { title: bookTitle });
    for (let i = 0; i < books.length; i++) {
      if (books[i].title === bookTitle) {
        setBooks((books) => books.slice(0, i).concat(books.slice(i + 1)));
        break;
      }
    }
  };

  const onSnackbarClose = () => {
    setSnackbarInfo({ ...snackbarInfo, open: false });
  };

  if (!ready) {
    return <></>;
  }

  return (
    <Box
      onClick={() => setShowingContextMenuBookTitle("")}
      sx={{ width: "100%", height: "95vh" }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "right",
          mt: "10px",
          px: "20px",
        }}
      >
        <Button variant="contained" onClick={onNewBook}>
          {t("new")}
        </Button>
        <Button variant="contained" onClick={onSelectFiles} sx={{ ml: "10px" }}>
          {t("import")}
        </Button>
      </Box>

      <Grid2
        container
        spacing={{ xs: 2, md: 3 }}
        sx={{ px: "20px", mt: "20px" }}
      >
        {books.map((book) => (
          <Grid2 key={book.title} size={{ xs: 2, sm: 4, md: 4 }}>
            <BookCard
              title={book.title}
              summary={book.summary}
              showContextMenu={showingContextMenuBookTitle === book.title}
              onSelect={createOnBookSelect(book.title)}
              onContextMenu={createOnBookContextMenu(book.title)}
              onRename={createOnBookRename(book.title)}
              onRemove={createOnBookRemove(book.title)}
            />
          </Grid2>
        ))}
      </Grid2>

      <DialogNewBook
        open={dialogNewBookOpen}
        setOpen={setDialogNewBookOpen}
        setSnackbarInfo={setSnackbarInfo}
        bookTitles={bookTitles}
        setBooks={setBooks}
      />

      <DialogRenameBook
        open={dialogRenameBookOpen}
        setOpen={setDialogRenameBookOpen}
        setSnackbarInfo={setSnackbarInfo}
        bookTitles={bookTitles}
        setBooks={setBooks}
        originalTitle={originalTitle}
        renameTitle={renameTitle}
        setRenameTitle={setRenameTitle}
      />

      <Snackbar
        open={snackbarInfo.open}
        autoHideDuration={3000}
        onClose={onSnackbarClose}
      >
        <Alert
          onClose={onSnackbarClose}
          severity={snackbarInfo?.severity}
          sx={{ width: "100%" }}
        >
          {snackbarInfo?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

interface DialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setSnackbarInfo: Dispatch<SetStateAction<SnackbarInfo>>;
  bookTitles: Set<string>;
  setBooks: Dispatch<SetStateAction<Book[]>>;
}

function DialogNewBook({
  open,
  setOpen,
  setSnackbarInfo,
  bookTitles,
  setBooks,
}: DialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const onClose = async () => {
    setTimeout(() => setOpen(false), 0);

    if (title === "" && content === "") {
      return;
    }

    if (title === "" || content === "") {
      setSnackbarInfo({
        open: true,
        message: t("titleAndContentRequired"),
        severity: "error",
      });
      return;
    }

    if (bookTitles.has(title)) {
      setSnackbarInfo({
        open: true,
        message: t("bookWithSameTitleExists"),
        severity: "error",
      });
      return;
    }

    const bookInfos: ReaderBookInfo[] = [{ title, content, progress: 0 }];
    const newBooksResult = await invokeCommand<NewBooksResult>("new_books", {
      bookInfos,
    });
    if (
      typeof newBooksResult === "undefined" ||
      newBooksResult.successful.length === 0
    ) {
      setSnackbarInfo({
        open: true,
        message: t("bookNotCreated"),
        severity: "error",
      });
      return;
    }
    const book = newBooksResult.successful[0];
    setBooks((books) =>
      books.length === 0 ? [book] : [books[0], book, ...books.slice(1)]
    );
    setSnackbarInfo({
      open: true,
      message: t("newBookCreated"),
      severity: "success",
    });
    setTitle("");
    setContent("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogContent sx={{ display: "flex", flexDirection: "column" }}>
        <TextField
          label={t("title")}
          value={title}
          size="small"
          fullWidth
          variant="outlined"
          autoComplete="off"
          error={bookTitles.has(title)}
          helperText={bookTitles.has(title) ? t("bookWithSameTitleExists") : ""}
          onChange={(event) => setTitle(event.target.value)}
        />

        <TextField
          label={t("content")}
          value={content}
          fullWidth
          variant="outlined"
          autoComplete="off"
          multiline
          rows={10}
          sx={{ mt: "20px", flex: 1 }}
          onChange={(event) => setContent(event.target.value)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface DialogRenameBookProps extends DialogProps {
  originalTitle: string;
  renameTitle: string;
  setRenameTitle: Dispatch<SetStateAction<string>>;
}

function DialogRenameBook({
  open,
  setOpen,
  setSnackbarInfo,
  bookTitles,
  setBooks,
  originalTitle,
  renameTitle,
  setRenameTitle,
}: DialogRenameBookProps) {
  const { t } = useTranslation();

  const onClose = async () => {
    setTimeout(() => setOpen(false), 0);

    if (renameTitle === "") {
      return;
    }

    if (originalTitle === renameTitle) {
      setSnackbarInfo({
        open: true,
        message: t("titleNotChanged"),
        severity: "info",
      });
      return;
    }

    if (bookTitles.has(renameTitle)) {
      setSnackbarInfo({
        open: true,
        message: t("bookWithSameTitleExists"),
        severity: "error",
      });
      return;
    }

    const res = await invokeCommand<null>("rename_book", {
      originalTitle,
      newTitle: renameTitle,
    });
    if (typeof res === "undefined") {
      setSnackbarInfo({
        open: true,
        message: t("titleNotChanged"),
        severity: "error",
      });
      return;
    }

    setBooks((books) => {
      const newBooks = [...books];
      const originalIndex = newBooks.findIndex(
        (book) => book.title === originalTitle
      );
      newBooks[originalIndex].title = renameTitle;
      return newBooks;
    });
    setSnackbarInfo({
      open: true,
      message: t("titleChanged"),
      severity: "success",
    });
  };

  const isErrorShown =
    bookTitles.has(renameTitle) && renameTitle !== originalTitle;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogContent sx={{ display: "flex", flexDirection: "column" }}>
        <TextField
          label={t("title")}
          value={renameTitle}
          size="small"
          fullWidth
          variant="outlined"
          autoComplete="off"
          error={isErrorShown}
          helperText={isErrorShown ? t("bookWithSameTitleExists") : ""}
          onChange={(event) => setRenameTitle(event.target.value)}
        />
      </DialogContent>
    </Dialog>
  );
}
