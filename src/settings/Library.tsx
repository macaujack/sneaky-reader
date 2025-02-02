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
import { Book, invokeCommand } from "../util";
import { useEffect, useState } from "react";

export default function Library() {
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
    const files = await open({
      title: "Choose TXT books to upload",
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Only .txt files",
          extensions: ["txt"],
        },
      ],
    });
    console.log(files);
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
          Import
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
