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
        str: { type: dataType.STRING, unique: true, defaultValue: 'foo' },
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

      lab.test('with 11 columns', async () => {
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
          expect(column.getDefaultValue()).to.equal("'foo'");
          expect(column.isUnique()).to.equal(true);
        }
      );

      lab.test(
        'that has text strDefaultNull column that has a default null value',
        () => {
          const column = findByName(columns, 'strDefaultNull');
          expect(column.getDefaultValue().toUpperCase()).to.equal('NULL');
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
        expect(column.isNullable()).to.equal(false);
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
            'ON UPDATE CURRENT_TIMESTAMP(3)'
          );
        }
      );

      lab.test('that has decimal dec column', () => {
        const column = findByName(columns, 'dec');
        expect(column.getDataType().toUpperCase()).to.equal('DECIMAL');
        expect(column.meta.numeric_precision).to.equal(8);
        expect(column.meta.numeric_scale).to.equal(2);
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

  lab.after(() => db.close());
});
