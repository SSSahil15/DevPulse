# DevPulse Backend

This directory contains the Node.js Express backend for the DevPulse platform.

## Features

- **Express.js API**: Handles GitHub OAuth, repository fetching, and triggers the analysis pipeline.
- **BullMQ Workers**: Asynchronous job queue backed by Redis to handle heavy tasks like cloning repositories and running Trivy scans.
- **WebSockets (Socket.io)**: Pushes real-time progress updates to the frontend during analysis.
- **PostgreSQL**: Primary database for storing user profiles, repository metadata, and scan results.
- **Redis**: Used for BullMQ queues and Express rate limiting.

## Local Setup

1. Install dependencies: `npm install`
2. Create a `.env` file based on `.env.example`.
3. Start the server: `npm run dev` (Runs on port 4000)
