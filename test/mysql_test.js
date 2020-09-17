const Code = require('@hapi/code');
const Lab = require('@hapi/lab');

const { expect } = Code;
const lab = (exports.lab = Lab.script());

const Promise = require('bluebird');
let dbmeta = require('db-meta');
const dataType = require('db-migrate-shared').dataType;
const driver = require('../');
const log = require('db-migrate-shared').log;

dbmeta = Promise.promisify(dbmeta);

const config = require('./db.config.json').mysql;

const internals = {};
internals.migrationTable = 'migrations';
internals.mod = {
  log: log,
  type: dataType
};
internals.interfaces = {
  SeederInterface: {},
  MigratorInterface: {}
};
log.silence(true);

const dbName = config.database;
let db;
let meta;
let isMySQLv8;

const findByName = (columns, name) => {
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].getName() === name) {
      return columns[i];
    }
  }
  return null;
};

lab.experiment('mysql', () => {
  lab.before(async () => {
    const con = await Promise.promisify(driver.connect)(config, internals);
    const _meta = await dbmeta('mysql', { connection: con.connection });

    Promise.promisifyAll(_meta);
    meta = _meta;

    db = con;

    isMySQLv8 = parseInt(await meta.getVersionAsync()) == 8;
  });

  lab.experiment('createTable', () => {
    let tables;
    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        str: {
          type: dataType.STRING,
          unique: true,
          defaultValue: 'foo',
          comment: 'foo'
        },
        strDefaultNull: { type: dataType.STRING, defaultValue: null },
        txt: { type: dataType.TEXT, notNull: true },
        intg: dataType.INTEGER,
        rel: dataType.REAL,
        dt: dataType.DATE_TIME,
        ts: dataType.TIMESTAMP,
        bin: dataType.BINARY,
        dec: { type: 'decimal', precision: 8, scale: 2 },
        bl: { type: dataType.BOOLEAN, defaultValue: false },
        ct: {
          type: dataType.DATE_TIME,
          length: 3,
          defaultValue: 'CURRENT_TIMESTAMP(3)',
          onUpdate: 'CURRENT_TIMESTAMP(3)'
        }
      });
      tables = await meta.getTablesAsync();
    });

    lab.test('has table metadata containing the event table', async () => {
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('event');
    });

    lab.experiment('has column metadata for the event table', () => {
      let columns;

      lab.before(async () => (columns = await meta.getColumnsAsync('event')));

      lab.test('with 12 columns', async () => {
        expect(columns).to.exist();
        expect(columns.length).to.equal(12);
      });
      lab.test(
        'that has integer id column that is primary key, non-nullable, and auto increments',
        async () => {
          const column = findByName(columns, 'id');
          expect(column.getDataType()).to.equal('INT');
          expect(column.isPrimaryKey()).to.equal(true);
          expect(column.isNullable()).to.equal(false);
          expect(column.isAutoIncrementing()).to.equal(true);
        }
      );

      lab.test(
        'that has text str column that is unique and has a default value',
        () => {
          const column = findByName(columns, 'str');
          expect(column.getDataType()).to.equal('VARCHAR');
          expect(column.getDefaultValue()).to.equal('foo');
          expect(column.isUnique()).to.equal(true);
        }
      );

      lab.test(
        'that has text strDefaultNull column that has a default null value',
        () => {
          const column = findByName(columns, 'strDefaultNull');
          expect(column.getDefaultValue()).to.equal(null);
        }
      );

      lab.test('that has text txt column that is non-nullable', () => {
        const column = findByName(columns, 'txt');
        expect(column.getDataType()).to.equal('TEXT');
        expect(column.isNullable()).to.equal(false);
      });

      lab.test('that has integer intg column', () => {
        const column = findByName(columns, 'intg');
        expect(column.getDataType()).to.equal('INT');
        expect(column.isNullable()).to.equal(true);
      });

      lab.test('that has real rel column', () => {
        const column = findByName(columns, 'rel');
        expect(column.getDataType()).to.equal('DOUBLE');
        expect(column.isNullable()).to.equal(true);
      });

      lab.test('that has datetime dt column', () => {
        const column = findByName(columns, 'dt');
        expect(column.getDataType()).to.equal('DATETIME');
        expect(column.isNullable()).to.equal(true);
      });

      lab.test('that has timestamp ts column', () => {
        const column = findByName(columns, 'ts');
        expect(column.getDataType()).to.equal('TIMESTAMP');
        expect(column.isNullable()).to.equal(isMySQLv8 ? true : false);
      });

      lab.test('that has binary bin column', () => {
        const column = findByName(columns, 'bin');
        expect(column.getDataType()).to.equal('BINARY');
        expect(column.isNullable()).to.equal(true);
      });

      lab.test('that has boolean bl column with a default value', () => {
        const column = findByName(columns, 'bl');
        expect(column.getDataType()).to.equal('TINYINT');
        expect(column.isNullable()).to.equal(true);
        expect(column.getDefaultValue()).to.equal('0');
      });

      lab.test(
        'that has ct column with current timestamp with precision 3 as defaultValue',
        () => {
          const column = findByName(columns, 'ct');
          expect(column.getDataType().toUpperCase()).to.equal('DATETIME');
          expect(column.getDefaultValue().toUpperCase()).to.equal(
            'CURRENT_TIMESTAMP(3)'
          );
        }
      );

      lab.test(
        'that has ct column with current timestamp with as onUpdate value',
        () => {
          const column = findByName(columns, 'ct');
          expect(column.getDataType().toUpperCase()).to.equal('DATETIME');
          expect(column.meta.extra.toUpperCase()).to.equal(
            isMySQLv8
              ? 'DEFAULT_GENERATED ON UPDATE CURRENT_TIMESTAMP(3)'
              : 'ON UPDATE CURRENT_TIMESTAMP(3)'
          );
        }
      );

      lab.test('that has decimal dec column', () => {
        const column = findByName(columns, 'dec');
        expect(column.getDataType().toUpperCase()).to.equal('DECIMAL');
        expect(column.meta.numeric_precision).to.equal(8);
        expect(column.meta.numeric_scale).to.equal(2);
      });

      lab.test('that has foo comment', () => {
        const column = findByName(columns, 'str');
        expect(column.meta.column_comment).to.equal('foo');
      });
    });

    lab.after(() => db.dropTable('event'));
  });

  lab.experiment('dropTable', () => {
    let tables;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        }
      });
      await db.dropTable('event');
      tables = await meta.getTablesAsync();
    });

    lab.test('deleted table successfully', () => {
      expect(tables).to.exist();
      expect(tables.length).to.equal(0);
    });
  });

  lab.experiment('renameTable', () => {
    let tables;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        }
      });
      await db.renameTable('event', 'functions');
      tables = await meta.getTablesAsync();
    });

    lab.after(() => db.dropTable('functions'));

    lab.test('was executed successfully', () => {
      expect(tables).to.exist();
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('functions');
    });
  });

  lab.experiment('addColumn', () => {
    let columns;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        }
      });
      await db.addColumn('event', 'title', 'string');
      columns = await meta.getColumnsAsync('event');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('with additional title column', () => {
      expect(columns).to.exist();
      expect(columns.length).to.equal(2);
      const column = findByName(columns, 'title');
      expect(column.getName()).to.equal('title');
      expect(column.getDataType()).to.equal('VARCHAR');
    });
  });

  lab.experiment('removeColumn', () => {
    let columns;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.removeColumn('event', 'title');
      columns = await meta.getColumnsAsync('event');
    });

    lab.after(() => db.dropTable('event'));
    lab.test('without title column', () => {
      expect(columns).to.exist();
      expect(columns.length).to.equal(1);
      expect(columns[0].getName()).to.not.equal('title');
    });
  });

  lab.experiment('renameColumn', () => {
    let columns;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.renameColumn('event', 'title', 'new_title');
      columns = await meta.getColumnsAsync('event');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('with renamed title column', () => {
      expect(columns).to.exist();
      expect(columns.length).to.equal(2);
      const column = findByName(columns, 'new_title');
      expect(column).to.exist();
      expect(column.getName()).to.equal('new_title');
    });
  });

  lab.experiment('changeColumn', () => {
    let columns;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        txt: {
          type: dataType.STRING,
          notNull: true,
          defaultValue: 'foo',
          unique: true
        },
        keep_id: { type: dataType.INTEGER, notNull: false, unique: true }
      });

      await db.changeColumn('event', 'txt', {
        type: dataType.STRING,
        notNull: false,
        unique: false,
        defaultValue: 'foo2'
      });
      await db.changeColumn('event', 'keep_id', {
        type: dataType.INTEGER,
        notNull: true,
        unsigned: true
      });
      columns = await meta.getColumnsAsync('event');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('with changed title column', () => {
      expect(columns).to.exist();
      expect(columns.length).to.equal(3);
      let column = findByName(columns, 'txt');
      expect(column.getName()).to.equal('txt');
      expect(column.isNullable()).to.equal(true);
      expect(column.getDefaultValue()).to.equal('foo2');
      expect(column.isUnique()).to.equal(false);

      column = findByName(columns, 'keep_id');
      expect(column.getName()).to.equal('keep_id');
      expect(column.isNullable()).to.equal(false);
      expect(column.isUnique()).to.equal(true);
    });
  });

  lab.experiment('addIndex', () => {
    let tables;
    let indexes;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });

      await db.addIndex('event', 'event_title', 'title');
      await db.addIndex('event', 'event_title_sub_part', {
        name: 'title',
        length: 8
      });
      tables = await meta.getTablesAsync();
      indexes = await meta.getIndexesAsync('event');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('preserves case of the functions original table', () => {
      expect(tables).to.exist();
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('event');
    });

    lab.test('has table with additional indexes', () => {
      expect(indexes).to.exist();
      expect(indexes.length).to.equal(3);

      const index = findByName(indexes, 'event_title');
      expect(index.getName()).to.equal('event_title');
      expect(index.getTableName()).to.equal('event');
      expect(index.getColumnName()).to.equal('title');

      const indexSubpart = findByName(indexes, 'event_title_sub_part');
      expect(indexSubpart.getName()).to.equal('event_title_sub_part');
      expect(indexSubpart.getTableName()).to.equal('event');
      expect(indexSubpart.getColumnName()).to.equal('title');
      expect(indexSubpart.meta.sub_part).to.equal(8);
    });
  });

  lab.experiment('columnForeignKeySpec', () => {
    let rows;

    lab.before(async () => {
      await db.createTable('event_type', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        event_id: {
          type: dataType.INTEGER,
          notNull: true,
          foreignKey: {
            name: 'fk_event_event_type',
            table: 'event_type',
            mapping: 'id',
            rules: {
              onDelete: 'CASCADE'
            }
          }
        },
        title: {
          type: dataType.STRING
        }
      });

      const metaQuery = [
        'SELECT',
        '  usg.REFERENCED_TABLE_NAME,',
        '  usg.REFERENCED_COLUMN_NAME,',
        '    cstr.UPDATE_RULE,',
        '  cstr.DELETE_RULE',
        'FROM',
        '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
        'INNER JOIN',
        '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
        '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
        '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
        'WHERE',
        '  usg.TABLE_SCHEMA = ?',
        '  AND usg.TABLE_NAME = ?',
        '  AND usg.COLUMN_NAME = ?'
      ].join('\n');

      rows = await db.runSql(metaQuery, dbName, 'event', 'event_id');
    });

    lab.after(async () => {
      await db.dropTable('event');
      await db.dropTable('event_type');
    });

    lab.experiment('sets usage and constraints', () => {
      lab.test('with correct references', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(1);
        const row = rows[0];
        expect(row.REFERENCED_TABLE_NAME).to.equal('event_type');
        expect(row.REFERENCED_COLUMN_NAME).to.equal('id');
      });

      lab.test('and correct rules', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(1);
        const row = rows[0];
        expect(row.UPDATE_RULE).to.equal('NO ACTION');
        expect(row.DELETE_RULE).to.equal('CASCADE');
      });
    });
  });

  lab.experiment('explicitColumnForeignKeySpec', () => {
    let rows;

    lab.before(async () => {
      await db.createTable('event_type', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        event_id: {
          type: dataType.INTEGER,
          notNull: true,
          foreignKey: {
            name: 'fk_event_event_type',
            table: 'event_type',
            mapping: 'id',
            rules: {
              onDelete: 'CASCADE'
            }
          }
        },
        event_id2: {
          type: dataType.INTEGER,
          notNull: true,
          foreignKey: {
            name: 'fk_event_event2_type',
            table: 'event_type',
            mapping: 'id',
            rules: {
              onDelete: 'CASCADE'
            }
          }
        },
        title: {
          type: dataType.STRING
        }
      });

      const metaQuery = [
        'SELECT',
        '  usg.REFERENCED_TABLE_NAME,',
        '  usg.REFERENCED_COLUMN_NAME,',
        '    cstr.UPDATE_RULE,',
        '  cstr.DELETE_RULE',
        'FROM',
        '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
        'INNER JOIN',
        '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
        '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
        '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
        'WHERE',
        '  usg.TABLE_SCHEMA = ?',
        '  AND usg.TABLE_NAME = ?',
        '  AND ( usg.COLUMN_NAME = ? OR usg.COLUMN_NAME = ? )'
      ].join('\n');

      rows = await db.runSql(
        metaQuery,
        dbName,
        'event',
        'event_id',
        'event_id2'
      );
    });

    lab.after(async () => {
      await db.dropTable('event');
      await db.dropTable('event_type');
    });

    lab.experiment('sets usage and constraints', () => {
      lab.test('with correct references', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(2);
        let row = rows[0];
        expect(row.REFERENCED_TABLE_NAME).to.equal('event_type');
        expect(row.REFERENCED_COLUMN_NAME).to.equal('id');

        row = rows[1];
        expect(row.REFERENCED_TABLE_NAME).to.equal('event_type');
        expect(row.REFERENCED_COLUMN_NAME).to.equal('id');
        row = rows[1];
        expect(row.UPDATE_RULE).to.equal('NO ACTION');
        expect(row.DELETE_RULE).to.equal('CASCADE');
      });

      lab.test('and correct rules', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(2);
        let row = rows[0];
        expect(row.UPDATE_RULE).to.equal('NO ACTION');
        expect(row.DELETE_RULE).to.equal('CASCADE');

        row = rows[1];
        expect(row.REFERENCED_TABLE_NAME).to.equal('event_type');
        expect(row.REFERENCED_COLUMN_NAME).to.equal('id');
        row = rows[1];
        expect(row.UPDATE_RULE).to.equal('NO ACTION');
        expect(row.DELETE_RULE).to.equal('CASCADE');
      });
    });
  });

  lab.experiment('addForeignKey', () => {
    let rows;

    lab.before(async () => {
      await db.createTable('event_type', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        event_id: {
          type: dataType.INTEGER,
          notNull: true
        },
        title: {
          type: dataType.STRING
        }
      });
      await db.addForeignKey(
        'event',
        'event_type',
        'fk_event_event_type',
        {
          event_id: 'id'
        },
        {
          onDelete: 'CASCADE'
        }
      );

      const metaQuery = [
        'SELECT',
        '  usg.REFERENCED_TABLE_NAME,',
        '  usg.REFERENCED_COLUMN_NAME,',
        '    cstr.UPDATE_RULE,',
        '  cstr.DELETE_RULE',
        'FROM',
        '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
        'INNER JOIN',
        '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
        '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
        '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
        'WHERE',
        '  usg.TABLE_SCHEMA = ?',
        '  AND usg.TABLE_NAME = ?',
        '  AND usg.COLUMN_NAME = ?'
      ].join('\n');

      rows = await db.runSql(metaQuery, dbName, 'event', 'event_id');
    });

    lab.after(async () => {
      await db.dropTable('event');
      await db.dropTable('event_type');
    });

    lab.experiment('sets usage and constraints', () => {
      lab.test('with correct references', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(1);
        const row = rows[0];
        expect(row.REFERENCED_TABLE_NAME).to.equal('event_type');
        expect(row.REFERENCED_COLUMN_NAME).to.equal('id');
      });

      lab.test('and correct rules', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(1);
        const row = rows[0];
        expect(row.UPDATE_RULE).to.equal('NO ACTION');
        expect(row.DELETE_RULE).to.equal('CASCADE');
      });
    });
  });

  lab.experiment('removeForeignKey', () => {
    let rows;

    lab.before(async () => {
      await db.createTable('event_type', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        event_id: {
          type: dataType.INTEGER,
          notNull: true
        },
        title: {
          type: dataType.STRING
        }
      });
      await db.addForeignKey(
        'event',
        'event_type',
        'fk_event_event_type',
        {
          event_id: 'id'
        },
        {
          onDelete: 'CASCADE'
        }
      );
      await db.removeForeignKey('event', 'fk_event_event_type');

      const metaQuery = [
        'SELECT',
        '  usg.REFERENCED_TABLE_NAME,',
        '  usg.REFERENCED_COLUMN_NAME,',
        '    cstr.UPDATE_RULE,',
        '  cstr.DELETE_RULE',
        'FROM',
        '  `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` AS usg',
        'INNER JOIN',
        '  `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS` AS cstr',
        '    ON  cstr.CONSTRAINT_SCHEMA = usg.TABLE_SCHEMA',
        '    AND cstr.CONSTRAINT_NAME = usg.CONSTRAINT_NAME',
        'WHERE',
        '  usg.TABLE_SCHEMA = ?',
        '  AND usg.TABLE_NAME = ?',
        '  AND usg.COLUMN_NAME = ?'
      ].join('\n');

      rows = await db.runSql(metaQuery, dbName, 'event', 'event_id');
    });

    lab.after(async () => {
      await db.dropTable('event');
      await db.dropTable('event_type');
    });

    lab.experiment('sets usage and constraints', () => {
      lab.test('removes usage and constraints', () => {
        expect(rows).to.exist();
        expect(rows.length).to.equal(0);
      });
    });
  });

  lab.experiment('runSql', () => {
    lab.test('accepts letarg parameters', async () => {
      const data = await db.runSql('SELECT 1 = ?, 2 = ?', 1, 2);
      expect(data.length).to.equal(1);
    });
    lab.test('accepts array parameters', async () => {
      const data = await db.runSql('SELECT 1 = ?, 2 = ?', [1, 2]);
      expect(data.length).to.equal(1);
    });
  });

  lab.experiment('all', () => {
    lab.test('accepts letarg parameters', async () => {
      const data = await Promise.promisify(db.all.bind(db))(
        'SELECT 1 = ?, 2 = ?',
        1,
        2
      );
      expect(data.length).to.equal(1);
    });
  });

  lab.experiment('insert', () => {
    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });

      await db.insert('event', ['id', 'title'], [2, 'title']);
    });

    lab.after(() => db.dropTable('event'));

    lab.test('with additional row', async () => {
      const data = await db.runSql('SELECT * from event');
      expect(data.length).to.equal(1);
    });
  });

  lab.experiment('insertWithSingleQuotes', () => {
    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });

      await db.insert('event', ['id', 'title'], [2, "Bill's Mother's House"]);
    });

    lab.after(() => db.dropTable('event'));

    lab.test('with additional row', async () => {
      const data = await db.runSql('SELECT * from event');
      expect(data.length).to.equal(1);
    });
  });

  lab.experiment('addIndex', () => {
    let indexes;

    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });

      await db.addIndex('event', 'event_title', 'title');
      await db.removeIndex('event', 'event_title');
      indexes = await meta.getIndexesAsync('event');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('has table without index', () => {
      expect(indexes).to.exist();
      expect(indexes.length).to.equal(1); // first index is primary key
    });
  });

  lab.experiment('removeIndexInvalidArgs', () => {
    lab.before(async () => {
      await db.createTable('event', {
        id: {
          type: dataType.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        title: { type: dataType.STRING }
      });

      await db.addIndex('event', 'event_title', 'title');
    });

    lab.after(() => db.dropTable('event'));

    lab.test('removeIndex has errored', async () => {
      const err = await expect(db.removeIndex('event_title')).to.reject(
        Error,
        'Illegal arguments, must provide "tableName" and "indexName"'
      );
      expect(err).to.exist();
    });
  });

  lab.experiment('createMigrationsTable', () => {
    let tables;
    let columns;

    lab.before(async () => {
      await Promise.promisify(db.createMigrationsTable.bind(db))();

      columns = await meta.getColumnsAsync('migrations');
      tables = await meta.getTablesAsync();
    });

    lab.after(() => db.dropTable('migrations'));

    lab.test('has migrations table', () => {
      expect(tables).to.exist();
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('migrations');
    });

    lab.test('with names', () => {
      expect(columns).to.exist();
      expect(columns.length).to.equal(3);
      var column = findByName(columns, 'id');
      expect(column.getName()).to.equal('id');
      expect(column.getDataType()).to.equal('INT');
      column = findByName(columns, 'name');
      expect(column.getName()).to.equal('name');
      expect(column.getDataType()).to.equal('VARCHAR');
      column = findByName(columns, 'run_on');
      expect(column.getName()).to.equal('run_on');
      expect(column.getDataType()).to.equal('DATETIME');
    });
  });

  lab.experiment('createTableWithOptions', () => {
    let tables;
    lab.before(async () => {
      await db.createTable('event', {
        columns: {
          id: {
            type: dataType.INTEGER,
            primaryKey: true,
            autoIncrement: true
          }
        },
        engine: 'myisam',
        collate: 'latin1_swedish_ci',
        rowFormat: 'FIXED'
      });
      tables = await meta.getTablesAsync();
    });

    lab.test('has table metadata containing the event table', async () => {
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('event');
    });

    lab.test('has table options set successfully', async () => {
      expect(tables[0].meta.engine.toLowerCase()).to.equal('myisam');
      expect(tables[0].meta.row_format.toLowerCase()).to.equal('fixed');
      expect(tables[0].meta.table_collation.toLowerCase()).to.equal(
        'latin1_swedish_ci'
      );
    });

    lab.after(() => db.dropTable('event'));
  });

  lab.experiment('createTableWithCharset', () => {
    let tables;
    lab.before(async () => {
      await db.createTable('event', {
        columns: {
          id: {
            type: dataType.INTEGER,
            primaryKey: true,
            autoIncrement: true
          }
        },
        charset: 'utf8'
      });
      tables = await meta.getTablesAsync();
    });

    lab.test('has table metadata containing the event table', async () => {
      expect(tables.length).to.equal(1);
      expect(tables[0].getName()).to.equal('event');
    });

    lab.test('has table charset set successfully', async () => {
      expect(tables[0].meta.table_collation.toLowerCase()).to.equal(
        'utf8_general_ci'
      );
    });

    lab.after(() => db.dropTable('event'));
  });

  lab.after(() => db.close());
});
