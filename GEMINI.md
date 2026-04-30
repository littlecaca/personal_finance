# GEMINI.md - Personal Finance & Asset Tracker

This project is a lightweight, local-first Personal Finance and Asset Tracker built with Python and Flask. It allows users to track their assets (stocks, crypto, etc.) and manage monthly budgets with expense logging.

## Project Overview

-   **Purpose:** Provide a private, offline way to track personal net worth and monthly spending.
-   **Tech Stack:** Python 3, Flask, HTML, Vanilla CSS.
-   **Architecture:** Simple Flask server serving a single-page-like experience with HTML templates. Data is persisted in local JSON files.

## Directory Structure

-   `app.py`: Main Flask application containing routes and data management logic.
-   `data/`: Directory containing all JSON data files (ignored by Git).
    -   `config.json`: Global settings, asset categories, and budget category definitions.
    -   `metadata.json`: Tracks record counts and budget rollover history.
    -   `history.json`: Stores historical snapshots of total assets for the line chart.
    -   `YYYY-MM.json`: Monthly records for expenses and budget snapshots.
-   `templates/`: HTML templates for the UI.
    -   `index.html`: Main dashboard for asset tracking and expense logging.
    -   `settings.html`: Configuration page for categories and targets.
-   `install_*.sh/ps1`: Scripts to install the application as a background service.

## Building and Running

### Prerequisites

-   Python 3.7+
-   `pip install flask`

### Running Locally

```bash
python app.py
```
The application will be available at `http://localhost:5000`.

### Running as a Service

-   **Linux:** Run `sudo ./install_linux.sh`. Manages via `systemctl status finance-tracker.service`.
-   **Windows:** Run `.\install_windows.ps1` in an elevated PowerShell. Manages via Task Scheduler.

## Data Model & Conventions

### Budget Rollover Logic
The application implements a "Surplus Rollover" feature:
-   Each category can optionally have `rollover: true`.
-   If enabled, any remaining budget at the end of the month is added to that category's limit for the next month.
-   If disabled, the surplus can be rolled over to a "Global Surplus Target" category if configured.
-   `check_and_process_surplus()` in `app.py` handles this logic when the index or settings page is loaded.

### Local-First Persistence
-   All data stays in the `data/` folder.
-   `load_json` and `save_json` are the primary utilities for I/O.
-   Monthly files ensure that historical data is segmented and easier to manage.

## Development Guidelines

-   **Styling:** Use Vanilla CSS within the templates. Avoid adding heavy CSS frameworks to keep it lightweight.
-   **Routes:** API routes are prefixed with `/api/` (mostly) and usually redirect back to the main views.
-   **Data Integrity:** Be careful when modifying `app.py` logic related to `check_and_process_surplus`, as it iterates through historical months to ensure consistency.
