import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid2,
  Typography,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-dialog";
import { Book, ImportBooksResult, invokeCommand } from "../util";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Library() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState([] as Book[]);

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

  const onSelectFiles = async () => {
    const bookPaths = await open({
      title: t("importTxtBooks"),
      multiple: true,
      directory: false,
      filters: [
        {
          name: t("plainTxtFiles"),
          extensions: ["txt"],
        },
      ],
    });

    if (bookPaths === null || bookPaths.length === 0) {
      return;
    }

    const importBooksResult = await invokeCommand<ImportBooksResult>(
      "import_books",
      { bookPaths }
    );

    if (typeof importBooksResult === "undefined") {
      console.error("Not received import books result");
      return;
    }

    setBooks((books) => {
      if (importBooksResult.successful.length === 0) {
        return books;
      }
      if (books.length === 0) {
        return importBooksResult.successful;
      }
      return [books[0], ...importBooksResult.successful, ...books.slice(1)];
    });

    // TODO: Handle import error
  };

  const createOnBookClick = (bookTitle: string) => async () => {
    const books = await invokeCommand<Book[]>("change_book", {
      title: bookTitle,
    });
    if (typeof books === "undefined") {
      console.error("Not received books after calling 'change_book'");
      return;
    }
    setBooks(books);
  };

  if (!ready) {
    return <></>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "right",
          mt: "10px",
          px: "20px",
        }}
      >
        <Button variant="contained" onClick={onSelectFiles}>
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
            <Card
              sx={{
                userSelect: "none",
              }}
            >
              <CardActionArea onClick={createOnBookClick(book.title)}>
                <CardContent>
                  <Typography variant="caption">{book.title}</Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                      lineClamp: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                    }}
                  >
                    {book.summary}
                  </Typography>
                  {/* TODO: Add a bottom tool bar */}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid2>
        ))}
      </Grid2>
    </Box>
  );
}
