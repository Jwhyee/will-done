# Project Planning and Architecture

## Overview
This document outlines the planning and architecture of the **will-done** project, a desktop application for daily planning and retrospectives.

## Architecture
The project follows a modern full-stack desktop application architecture using **Tauri**, **Rust**, **React**, and **SQLite**.

### Frontend
- **React (TypeScript)**: Used for building a responsive and interactive user interface.
- **Vite**: Provides a fast development environment and build tool.
- **Tailwind CSS & shadcn/ui**: Ensures a consistent and modern aesthetic with modular UI components.
- **Framer Motion**: Adds smooth animations for a polished user experience.
- **dnd-kit**: Implements advanced drag-and-drop functionality for task reordering and management.

### Backend
- **Tauri**: Acts as the bridge between the frontend and the operating system, providing a secure and lightweight container.
- **Rust**: Handles performance-critical tasks, system-level interactions, and database management.
- **SQLite (sqlx)**: Provides a reliable and efficient local database for persistent storage.
- **Tokio**: Enables asynchronous operations in Rust for better performance and responsiveness.

### Core Features
- **Workspace Management**: Users can organize their tasks into different workspaces (e.g., Home, Work).
- **Time-Blocking**: A timeline-based approach for planning tasks throughout the logical day.
- **AI Retrospectives**: Integration with Google's Gemini API to analyze daily performance and provide insights.
- **Recurring Tasks**: Support for tasks that repeat on specific days of the week.
- **Notifications**: System-level notifications for task transitions and health-care reminders.

---

## Versioning
- **v1.0.0 - 2026-03-06**: Initial version of the project documentation and knowledge base. Project setup with Tauri, React, and SQLite. Core features including Workspace management, Timeline, and Retrospective are implemented and being refined.
