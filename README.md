# Development of a Configurable Web Dashboard for Industrial Sterilizer Process Monitoring


## Overview

This project is a near-real-time industrial monitoring dashboard system developed using React, Tailwind CSS, Node.js, Express, MySQL, and InfluxDB.

The system supports:

* Near-real-time sensor monitoring
* Dashboard template builder
* Dynamic widget system
* Industrial mimic/image widgets
* Live trend charts
* Gauge widgets
* Big number widgets
* Fullscreen dashboard mode
* Role-based authentication
* Authenticated REST polling every five seconds
* Image pin mapping editor

---

# Tech Stack

## Frontend

* React
* Tailwind CSS
* Recharts
* Lucide React

## Backend

* Node.js
* Express.js
* REST API

## Database

* MySQL
* InfluxDB

---

# Project Structure

gridlayout_ui/

├── client/
├── server/
├── database.sql
├── README.md
├── .env.example

---

# Installation Guide

## 1. Install Dependencies

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd server
npm install
```

---

# Database Setup

## 1. Create Database

Open MySQL and run:

```sql
CREATE DATABASE kanban_dashboard;
```

## 2. Import Database

Run:

```bash
mysql -u root -p kanban_dashboard < database.sql
```

---

# Environment Variables

Create `.env` inside server folder.

Example:

```env
PORT=5000

JWT_SECRET=your_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kanban_dashboard
```

---

# Running The Project

## Start Backend

```bash
cd server
node server.js
```

Backend runs on:

```text
http://localhost:5000
```

---

## Start Frontend

```bash
cd client
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# Features

## Dashboard

* Near-real-time monitoring
* Fullscreen mode
* Live updates using authenticated REST polling

## Template Builder

* Drag-and-drop layout system
* Widget configuration
* Template management

## Image Widget

* Industrial mimic diagram
* Pinpoint live data sensors
* Real-time status indicators
* Alarm visualization

## Widgets

* Gauge Widget
* Big Number Widget
* Trend Line Widget
* Image Widget

---

# User Roles

* Superadmin
* Admin
* Editor
* Viewer

---

# Notes

* Ensure MySQL service is running before starting backend.
* Ensure Node.js is installed.
* Recommended Node.js version: 18+
* Recommended MySQL version: 8+

---

# Developed By

Teh Kuan Yew

Final Year Project – Development of a Configurable Web Dashboard for Industrial Sterilizer Process Monitoring
