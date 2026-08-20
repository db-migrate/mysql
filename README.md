[![Backers on Open Collective](https://opencollective.com/node-db-migrate/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/node-db-migrate/sponsors/badge.svg)](#sponsors)
[![Build Status](https://github.com/db-migrate/mysql/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/db-migrate/mysql/actions/workflows/ci.yml)
[![Documentation Status](https://readthedocs.org/projects/db-migrate/badge/?version=latest)](https://readthedocs.org/projects/db-migrate/?badge=latest)

# db-migrate-mysql

MySQL driver for the [db-migrate](https://github.com/db-migrate/node-db-migrate) database migration framework.

This driver uses [`mysql2`](https://www.npmjs.com/package/mysql2) under the hood to connect and interact with MySQL databases.

## Installation

You can install this driver alongside `db-migrate`:

**Using npm:**

```bash
npm install db-migrate db-migrate-mysql
```

**Using yarn:**

```bash
yarn add db-migrate db-migrate-mysql
```

If you use `db-migrate` globally, you should also install the driver globally:

```bash
npm install -g db-migrate db-migrate-mysql
# or using yarn global
yarn global add db-migrate db-migrate-mysql
```

## Configuration

Configure your database connection in `database.json`. Use `mysql` as the driver:

```json
{
  "dev": {
    "driver": "mysql",
    "user": "root",
    "password": "your_password",
    "host": "localhost",
    "database": "your_database_name",
    "multipleStatements": true
  }
}
```

### Connection Options

All connection configuration options are passed directly to the underlying `mysql2` client. Commonly used options include:

- `host`: The hostname of the database you are connecting to (default: `localhost`).
- `port`: The port number to connect to (default: `3306`).
- `user`: The username to authenticate as.
- `password`: The password to authenticate with.
- `database`: The name of the database to connect to.
- `ssl`: An object with SSL options or a string/boolean (consult `mysql2` docs).
- `multipleStatements`: Allow multiple SQL statements in a single query (default: `false`). This is useful if you run raw SQL migrations containing multiple queries separated by semicolons.
- `socketPath`: The path to a unix domain socket (takes precedence over `host` and `port`).

For a complete list of connection options, check the [mysql2 Connection Options documentation](https://github.com/sidorares/node-mysql2#connection-options).

## Running Migrations

Once configured, you can run migrations using the `db-migrate` command-line tool:

```bash
# Create a new migration
db-migrate create add-users-table

# Run all pending migrations
db-migrate up

# Rollback the last migration
db-migrate down
```

For more details on how to write and manage migrations, please refer to the [db-migrate documentation](https://db-migrate.readthedocs.io/).

## Development & Testing

To set up the development environment and run tests:

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/db-migrate/mysql.git
   cd mysql
   npm install
   ```

2. Create a test configuration file `test/db.config.json` based on the example:

   ```bash
   cp test/db.config.example.json test/db.config.json
   ```

3. Update the credentials in `test/db.config.json` to match your local MySQL setup.

4. Run the test suite:
   ```bash
   npm test
   ```

## License

MIT License
