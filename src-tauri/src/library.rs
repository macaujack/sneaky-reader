use std::{
    collections::HashMap,
    io::Write,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::DATA_ROOT_DIR;
use serde::{Deserialize, Serialize};

pub const LIBRARY_DIR_NAME: &str = "library";
pub const LIBRARY_METADATA_FILENAME: &str = "_metadata.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub title: String,
    pub summary: String,
    pub total_character_count: usize,
    pub progress: usize,
    pub last_read_time: u64,
}

impl Book {
    pub const SUMMARY_LENGTH: usize = 200;
}

#[derive(Debug, Clone)]
pub struct BooksAux {
    pub books: Vec<Book>,
    pub title_to_index: HashMap<String, usize>,
    pub old_progress: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReaderBookInfo {
    pub title: String,
    pub content: String,
    pub progress: usize,
}

impl ReaderBookInfo {
    pub fn new(book: &Book) -> Self {
        Self {
            title: book.title.clone(),
            content: get_book_content_from_disk(&book.title),
            progress: book.progress,
        }
    }
}

/// Get all books in the library directory. If no library directory, will first
/// create one and add a default book.
pub fn get_books_from_disk() -> Vec<Book> {
    let library_dir = dirs::data_dir()
        .unwrap()
        .join(DATA_ROOT_DIR)
        .join(LIBRARY_DIR_NAME);
    if !library_dir.exists() {
        std::fs::create_dir_all(&library_dir).unwrap();
    }

    let metadata = library_dir.join(LIBRARY_METADATA_FILENAME);
    if metadata.exists() {
        let metadata = std::fs::File::open(metadata).expect("Cannot read metadata file");
        serde_json::from_reader(metadata).expect("Cannot deserialize from metadata file")
    } else {
        fn write_book_content(library_dir: &Path, title: &str, content: &str) -> Book {
            let sample_book = library_dir.join(format!("{title}.txt"));
            let mut sample_book =
                std::fs::File::create(sample_book).expect("Cannot create sample book");
            sample_book
                .write_all(content.as_bytes())
                .expect("Cannot write sample book contents");

            Book {
                title: String::from(title),
                summary: content.chars().take(Book::SUMMARY_LENGTH).collect(),
                total_character_count: content.chars().count(),
                progress: 0,
                last_read_time: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            }
        }

        let sample_book_title = "Sample Book";
        let sample_book = library_dir.join(format!("{sample_book_title}.txt"));
        let mut sample_book =
            std::fs::File::create(sample_book).expect("Cannot create sample book");
        let sample_book_content = include_str!("sample_book.txt");
        sample_book
            .write_all(sample_book_content.as_bytes())
            .expect("Cannot write sample book contents");

        let books = vec![
            write_book_content(&library_dir, "Sample Book", include_str!("sample_book.txt")),
            write_book_content(
                &library_dir,
                "中国劳动法",
                include_str!("sample_chinese.txt"),
            ),
        ];

        write_books_to_disk(&books);

        books
    }
}

pub fn write_books_to_disk(books: &[Book]) {
    let metadata = dirs::data_dir()
        .unwrap()
        .join(DATA_ROOT_DIR)
        .join(LIBRARY_DIR_NAME)
        .join(LIBRARY_METADATA_FILENAME);

    let metadata = std::fs::File::create(metadata).expect("Cannot create metadata file");
    serde_json::to_writer(metadata, books).expect("Error serializing metadata to file");
}

pub fn get_book_content_from_disk(title: &str) -> String {
    let book_content = dirs::data_dir()
        .unwrap()
        .join(DATA_ROOT_DIR)
        .join(LIBRARY_DIR_NAME)
        .join(format!("{title}.txt"));
    std::fs::read_to_string(book_content).expect("Cannot read book content to string")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn run_get_books() {
        let books = get_books_from_disk();
        dbg!(books);
    }
}
