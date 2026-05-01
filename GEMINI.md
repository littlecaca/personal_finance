# GEMINI.md - Personal Finance & Asset Tracker (Electron App)

This project is a native, local-first Personal Finance and Asset Tracker built with **Electron** and **Node.js**. It provides a seamless desktop application experience, allowing users to track their assets and manage monthly budgets without relying on external servers or local Python environments.

## Project Overview

-   **Purpose:** Provide a private, offline, and zero-configuration desktop app to track personal net worth and monthly spending.
-   **Tech Stack:** Electron, Node.js, HTML, JavaScript (Vanilla), Bootstrap, Chart.js.
-   **Architecture:** 
    -   **Main Process (`main.js`):** Handles all file I/O operations (reading/writing local JSON files) and complex data processing logic (e.g., budget surplus rollover).
    -   **Preload Script (`preload.js`):** Acts as a secure bridge (IPC) exposing the `financeAPI` to the renderer.
    -   **Renderer Process (`src/`):** Purely client-side static HTML/JS. `renderer.js` fetches data via `financeAPI` and dynamically builds the DOM.

## Directory Structure

-   `package.json`: Node.js dependencies and Electron Builder build scripts.
-   `main.js`: The Electron main process (Backend logic).
-   `preload.js`: Secure IPC context bridge.
-   `src/`: Frontend UI files.
    -   `index.html` & `settings.html`: Static views.
    -   `renderer.js`: Client-side logic for dynamic rendering and API calls.
-   `data/`: Directory containing all JSON data files (ignored by Git).
    -   `config.json`: Global settings, asset categories, and budget category definitions.
    -   `metadata.json`: Tracks record counts and budget rollover history.
    -   `history.json`: Stores historical snapshots of total assets for the line chart.
    -   `YYYY-MM.json`: Monthly records for expenses and budget snapshots.

## Building and Running

### Prerequisites
-   Node.js (v18+)
-   `npm install`

### Development Mode
```bash
npm start
```
This launches the Electron app locally.

### Packaging for Distribution
```bash
npm run dist
```
This uses Electron Builder to compile the application and bundle it into a standalone Windows `.exe` located in the `dist/` directory. The generated installer handles everything.

### Publishing Updates
```bash
npm run publish
```
This builds the app and publishes the release to GitHub. The app will automatically check for updates on startup using `electron-updater`.

## Data Model & Conventions

### Budget Rollover Logic
The application implements a "Surplus Rollover" feature calculated entirely within `main.js`:
-   Each category can optionally have `rollover: true`.
-   If enabled, any remaining budget at the end of the month is added to that category's limit for the next month.
-   If disabled, the surplus can be rolled over to a "Global Surplus Target" category if configured.
-   `checkAndProcessSurplus()` in `main.js` handles this logic transparently when data is requested.

### Local-First Persistence
-   All data stays in the local `data/` folder, ensuring complete privacy.
-   The Node.js `fs` module is used synchronously for guaranteed data integrity during transactions.

## Development Guidelines

-   **Frontend:** Do not use server-side rendering (e.g., Jinja2). All UI updates must be done dynamically in `renderer.js`.
-   **Security:** Never enable `nodeIntegration` in the `BrowserWindow`. All interactions with the file system MUST go through the `ipcMain` / `ipcRenderer` bridge defined in `preload.js`.
-   **Data Migration:** If the data structure changes, ensure backward compatibility for users' existing JSON files in `main.js`.
