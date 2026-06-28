# Udaan Scholarship Finder

A full-stack web application designed to streamline the process of discovering and applying for educational scholarships. 

## Project Structure

This repository is organized into a standard monorepo format with distinct client and server directories:

*   **`backend/`**: Contains the server-side logic and API configurations.
    *   `server.js`: The main entry point for the backend server.
    *   `package.json` / `package-lock.json`: Backend dependencies and scripts.
*   **`frontend/`**: Contains the user interface, built with React.
    *   `src/App.jsx`: The root React component.
    *   `src/assets/fonts/`: Houses custom typography utilized in the UI, including Clash Display, McQueen, and Pangea.
    *   `public/`: Contains static assets like `favicon.svg` and `icons.svg`.
    *   `eslint.config.js`: Linting configuration for maintaining code quality.

## Tech Stack

*   **Frontend**: React.js
*   **Backend**: Node.js
*   **Package Manager**: npm

## Getting Started

Follow these instructions to set up the project on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed:

*   Node.js (v14 or higher recommended)
*   npm (Node Package Manager)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/sanskriti49/udaan-scholarship-finder.git
    cd udaan-scholarship-finder
    ```

2.  **Set up the backend:**
    ```bash
    cd backend
    npm install
    ```

3.  **Set up the frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

To run the application locally, you need to start both the backend server and the frontend development server concurrently.

1.  **Start the backend server:**
    Open a terminal, navigate to the backend directory, and run:
    ```bash
    cd backend
    npm start
    ```

2.  **Start the frontend development server:**
    Open a new terminal window, navigate to the frontend directory, and run:
    ```bash
    cd frontend
    npm run dev
    ```

## Typography and Licensing

This project utilizes specific premium or custom fonts located in `frontend/src/assets/fonts/`. Please review the included license files (such as `FFL.txt` found within the font directories) to ensure compliance with their specific usage rights and restrictions before deploying to production.
