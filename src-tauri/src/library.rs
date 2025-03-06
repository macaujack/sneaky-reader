use std::{
    collections::{HashMap, HashSet},
    io::Write,
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
        let books = vec![
            write_book_with_title_content(
                String::from("Lorem Ipsum"),
                include_str!("texts/sample_lorem_ipsum.txt"),
            )
            .unwrap(),
            write_book_with_title_content(
                String::from("中国劳动法"),
                include_str!("texts/sample_chinese.txt"),
            )
            .unwrap(),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewBooksResult {
    pub successful: Vec<Book>,
    pub failed: Vec<String>,
}

pub fn new_and_standardize_books(
    book_infos: &[ReaderBookInfo],
    title_to_index: &HashMap<String, usize>,
) -> NewBooksResult {
    let mut successful = Vec::new();
    let mut failed = Vec::new();
    let mut successful_titles = HashSet::new();

    for book_info in book_infos {
        let ReaderBookInfo { title, content, .. } = book_info;

        if title_to_index.get(title).is_some() {
            failed.push(title.clone());
            continue;
        }

        let standardized_text = standardize_text(content);
        match write_book_with_title_content(title.clone(), &standardized_text) {
            Ok(book) if !successful_titles.contains(&book.title) => {
                successful_titles.insert(book.title.clone());
                successful.push(book);
            }
            _ => {
                failed.push(title.clone());
            }
        }
    }

    NewBooksResult { successful, failed }
}

fn standardize_text(text: &str) -> String {
    let mut ret = String::with_capacity(1_000_000);

    let mut valid_line_count = 0;
    let mut prev_empty_line_count = 0;
    let mut space_separated_word_count = 0;
    let mut char_count = 0;
    let mut prev_line = "";
    let mut lines_iter = text.lines().map(|line| line.trim());
    let lines_iter_clone = lines_iter.clone();

    for line in lines_iter.by_ref() {
        if !line.is_empty() {
            prev_line = line;
            break;
        }
    }

    for line in lines_iter {
        if !line.is_empty() {
            valid_line_count += 1;
            if prev_line.is_empty() {
                prev_empty_line_count += 1;
            }
            space_separated_word_count += line.split_whitespace().count();
            char_count += line.chars().count();
        }

        prev_line = line;
    }

    // We only consider 3 popular formats of external TXT files:
    // 1. One line per paragraph without empty lines (standard).
    // 2. One line per paragraph with empty lines.
    // 3. Multiple lines per paragraph with empty lines.
    // TODO: Support multiple lines per paragraph WITHOUT empty lines.

    let is_multiple_lines_per_paragraph = {
        let proportion = (prev_empty_line_count as f64) / (valid_line_count as f64);
        proportion > 0.05 && proportion < 0.95
    };

    // We consider 2 types of human languages:
    // 1. Languages that use spaces to separate words.
    // 2. Languages that don't.
    // TODO: Support languages like Thai, that use spaces, but to separate
    // sentences instead of words.
    let language_uses_spaces_to_separate = space_separated_word_count > valid_line_count * 4
        && char_count < space_separated_word_count * 12;

    if is_multiple_lines_per_paragraph {
        #[derive(Debug, PartialEq, Eq)]
        enum Mode {
            Content,
            EmptyLine,
        }
        let mut mode = Mode::EmptyLine;
        for line in lines_iter_clone {
            if !line.is_empty() {
                if mode == Mode::Content && language_uses_spaces_to_separate {
                    ret.push(' ');
                }
                ret.push_str(line);
                mode = Mode::Content;
            } else if mode == Mode::Content {
                ret.push('\n');
                mode = Mode::EmptyLine;
            }
        }
        if mode != Mode::EmptyLine {
            ret.push('\n');
        }
    } else {
        for line in lines_iter_clone {
            if !line.is_empty() {
                ret.push_str(line);
                ret.push('\n');
            }
        }
    }

    ret
}

fn write_book_with_title_content(title: String, standardized_text: &str) -> std::io::Result<Book> {
    let standardized_file = dirs::data_dir()
        .unwrap()
        .join(DATA_ROOT_DIR)
        .join(LIBRARY_DIR_NAME)
        .join(format!("{title}.txt"));
    let mut standardized_file = std::fs::File::create(standardized_file)?;

    standardized_file.write_all(standardized_text.as_bytes())?;

    Ok(Book {
        title,
        summary: standardized_text
            .chars()
            .take(Book::SUMMARY_LENGTH)
            .collect(),
        total_character_count: standardized_text.chars().count(),
        progress: 0,
        last_read_time: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    })
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

    fn test_with_input_output(input: &str, expected_output: &str) {
        let actual_output = standardize_text(&input);
        assert_eq!(actual_output, expected_output);
    }

    #[test]
    fn test_standardize_first_format() {
        test_with_input_output(
            include_str!("texts/test1_input.txt"),
            include_str!("texts/test1_output.txt"),
        );
    }

    #[test]
    fn test_standardize_second_format() {
        test_with_input_output(
            include_str!("texts/test2_input.txt"),
            include_str!("texts/test2_output.txt"),
        );
    }

    #[test]
    fn test_standardize_third_format() {
        test_with_input_output(
            include_str!("texts/test3_input.txt"),
            include_str!("texts/test3_output.txt"),
        );
    }

    #[test]
    fn test_standardize_chinese_with_leading_non_ascii_white_spaces() {
        test_with_input_output(
            include_str!("texts/test4_input.txt"),
            include_str!("texts/test4_output.txt"),
        );
    }
}
