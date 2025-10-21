# String Analysis API

This project is a simple Node.js and Express-based API that allows you to store and analyze strings. You can add new strings, retrieve them, and filter them based on various properties. The API also provides a natural language endpoint for more intuitive filtering.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/task-002.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd task-002
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

## Usage

To start the server, run the following command:

```bash
npm start
```

The server will start on port 3000 by default. You can change the port by setting the `PORT` environment variable.

## API Endpoints

### POST /strings

Adds a new string to the store.

**Request Body:**

```json
{
  "value": "your string"
}
```

**Response:**

Returns a JSON object with the stored string's information, including its properties.

### GET /strings/:value

Retrieves a specific string from the store.

**URL Parameters:**

*   `value`: The string to retrieve.

**Response:**

Returns the JSON object for the requested string.

### GET /strings

Filters the strings in the store based on query parameters.

**Query Parameters:**

*   `is_palidrome`: (true/false) Filter by whether the string is a palindrome.
*   `min_length`: (integer) Filter by minimum string length.
*   `max_length`: (integer) Filter by maximum string length.
*   `word_count`: (integer) Filter by the number of words in the string.
*   `contains_character`: (character) Filter by strings containing a specific character.

**Response:**

Returns a JSON object containing an array of strings that match the filters.

### GET /strings/filter-by-natural-language

Filters strings using a natural language query.

**Query Parameters:**

*   `query`: The natural language query (e.g., "palindromic strings longer than 10 characters").

**Response:**

Returns a JSON object with the strings that match the interpreted query.

### DELETE /strings/:value

Deletes a string from the store.

**URL Parameters:**

*   `value`: The string to delete.

**Response:**

Returns a 204 No Content status on successful deletion.

## Dependencies

*   [express](https://expressjs.com/): Fast, unopinionated, minimalist web framework for Node.js.
*   [better-sqlite3](https://github.com/WiseLibs/better-sqlite3): The fastest and simplest library for SQLite3 in Node.js.
*   [dotenv](https://github.com/motdotla/dotenv): Loads environment variables from a .env file.
*   [mongoose](https://mongoosejs.com/): Elegant mongodb object modeling for node.js.
*   [morgan](https://github.com/expressjs/morgan): HTTP request logger middleware for node.js.
