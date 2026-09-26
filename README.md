# SmartMill365 UI

SmartMill365 UI is a configurable web dashboard for industrial sterilizer
process monitoring. It combines a React frontend with an Express REST API,
MySQL configuration storage, and InfluxDB time-series data.

The project is designed primarily for desktop web browsers. It provides
near-real-time monitoring through authenticated REST polling; it is not a
validated digital twin or a direct PLC/control-system integration.

## Main Capabilities

- Configurable grid-based dashboards and reusable templates
- Drag, resize, configure, save, assign, and reopen widgets
- InfluxDB bucket, measurement, device, and channel mapping
- Charts, gauges, numeric statistics, heatmaps, logs, images, and Sankey views
- Interactive process-flow workspace and plant process simulator
- Organization-based data separation and device permissions
- JWT authentication with `superadmin`, `admin`, `editor`, and `viewer` roles
- Session expiry and reauthentication handling
- Graceful live-data failure feedback with repeated REST polling
- Automated unit, role, API coverage, and Newman API test tooling

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS, React Router |
| Visualization | Recharts, React Grid Layout, custom process components |
| Backend | Node.js, Express 5, JSON REST APIs |
| Authentication | JWT and BCrypt |
| Configuration database | MySQL 8 |
| Time-series data | InfluxDB |
| Testing | Node test runner, Newman, custom API coverage audit |

## Requirements

- Node.js `20.19+` or `22.12+`
- npm
- MySQL 8+
- An accessible InfluxDB instance for live measurements

## Installation

Clone the repository and install all frontend, backend, and test dependencies
from the project root:

```bash
git clone https://github.com/NovaflowTechnology/SmartMill365-UI.git
cd SmartMill365-UI
npm install
```

## Database Setup

The SQL script creates the `kanban_dashboard` database and all required tables:

```bash
mysql -u root -p < kanban_dashboard.sql
```

The script does not create an initial account. Create the first organization
and Super Administrator separately using a BCrypt password hash. Do not store a
plain-text password in the database.

Generate a hash:

```bash
node -e "console.log(require('bcrypt').hashSync('replace-this-password', 12))"
```

Then insert the initial records in MySQL, replacing `<bcrypt-hash>`:

```sql
USE kanban_dashboard;

INSERT INTO organizations (name)
VALUES ('Novaflow Engineering');

INSERT INTO users (username, password, role, org_id)
VALUES ('superadmin', '<bcrypt-hash>', 'superadmin', NULL);
```

## Environment Configuration

Create `.env` in the project root. The file is ignored by Git and must never be
committed.

```env
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=replace-with-your-mysql-password
DB_NAME=kanban_dashboard

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=replace-with-your-influx-token
INFLUX_ORG=replace-with-your-influx-organization
INFLUX_BUCKET=replace-with-your-default-bucket

# Optional
INFLUX_TIMEOUT=15000
INFLUX_METADATA_LOOKBACK=-7d
```

The frontend currently calls the backend at `http://localhost:5000`, so keep
the API on port `5000` during local development.

## Running Locally

Start the backend from the project root:

```bash
node server.js
```

The API is available at `http://localhost:5000`. Verify it with:

```bash
curl http://localhost:5000/health
```

In a second terminal, start the frontend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally
`http://localhost:5173`.

## Available Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production frontend build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Node unit tests |
| `npm run test:roles` | Check role-protected API behavior |
| `npm run api:collection` | Regenerate the Postman API collection |
| `npm run api:audit` | Compare implemented routes with collection coverage |
| `npm run test:api` | Run the complete Newman API test workflow |

## API Testing

The API tests create, modify, and delete records. Run them only against a
disposable local test database with disposable accounts for all four roles.
Start the backend before running the tests.

Create the ignored file
`tests/api/postman-local-environment.local.json`:

```json
{
  "values": [
    { "key": "baseUrl", "value": "http://localhost:5000", "enabled": true },
    { "key": "superadminUsername", "value": "", "enabled": true },
    { "key": "superadminPassword", "value": "", "enabled": true },
    { "key": "adminUsername", "value": "", "enabled": true },
    { "key": "adminPassword", "value": "", "enabled": true },
    { "key": "editorUsername", "value": "", "enabled": true },
    { "key": "editorPassword", "value": "", "enabled": true },
    { "key": "viewerUsername", "value": "", "enabled": true },
    { "key": "viewerPassword", "value": "", "enabled": true }
  ]
}
```

Fill in the disposable account credentials, then run:

```bash
npm run test:api
```

Generated test evidence is kept together under `reports/api`:

- `API-COVERAGE.md` records implemented route coverage.
- `API-TEST-RESULTS.md` contains the sanitized Newman execution summary.

On Windows, the test runner opens the `reports` folder after execution. Set
`API_TEST_OPEN_REPORTS=false` to disable this behavior, such as in CI. The
runner refuses non-local targets unless `API_TEST_ALLOW_REMOTE=true` is set
explicitly for an approved disposable environment.

## Project Structure

```text
SmartMill365-UI/
|-- config/                 MySQL and InfluxDB clients
|-- middleware/             Authentication and authorization middleware
|-- routes/                 Express REST route modules
|-- services/               InfluxDB query service
|-- src/
|   |-- components/         Shared interface components
|   |-- pages/              Dashboard, management, and editor screens
|   |-- process/            Process-flow visualization components
|   |-- utils/              Frontend session and data utilities
|   `-- widgets/            Dashboard widget implementations
|-- tests/
|   |-- api/                Postman collection and API test tools
|   `-- *.test.js           Node unit tests
|-- reports/                Generated API test evidence
|-- scripts/                Role and interface checks
|-- kanban_dashboard.sql    MySQL schema
|-- server.js               Express application entry point
`-- package.json            Dependencies and commands
```

## Operational Notes

- MySQL must be running before the backend starts.
- InfluxDB-dependent screens require valid InfluxDB settings and available data.
- A temporary InfluxDB failure should not prevent unrelated MySQL-backed APIs
  from responding.
- The supported evaluation scope is desktop layouts, including `1024x768`,
  `1366x768`, `1440x900`, and `1920x1080` at 100 percent browser zoom.
- Mobile layout optimization, direct field-hardware integration, predictive
  analytics, and large-scale production benchmarking are outside the current
  project scope.

## Author

Developed by Teh Kuan Yew as a Final Year Project:
**Development of a Configurable Web Dashboard for Industrial Sterilizer Process
Monitoring**.
