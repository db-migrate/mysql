var util = require('util');
var moment = require('moment');
var mysql = require('mysql');
var Base = require('db-migrate-base');
var Promise = require('bluebird');
var log;
var type;

var internals = {};

var MysqlDriver = Base.extend({
  init: function (connection) {
    this._escapeDDL = '`';
    this._escapeString = "'";
    this._super(internals);
    this.connection = connection;
  },

  startMigration: function (cb) {
    var self = this;

    if (!internals.notransactions) {
      return this.runSql('SET AUTOCOMMIT=0;')
        .then(function () {
          return self.runSql('START TRANSACTION;');
        })
        .nodeify(cb);
    } else return Promise.resolve().nodeify(cb);
  },

  endMigration: function (cb) {
    if (!internals.notransactions) {
      return this.runSql('COMMIT;').nodeify(cb);
    } else return Promise.resolve(null).nodeify(cb);
  },

  mapDataType: function (spec) {
    var len;
    switch (spec.type) {
      case type.TEXT:
        len = parseInt(spec.length, 10) || 1000;
        if (len > 16777216) {
          return 'LONGTEXT';
        }
        if (len > 65536) {
          return 'MEDIUMTEXT';
        }
        if (len > 256) {
          return 'TEXT';
        }
        return 'TINYTEXT';
      case type.DATE_TIME:
        return 'DATETIME';
      case type.BLOB:
        len = parseInt(spec.length, 10) || 1000;
        if (len > 16777216) {
          return 'LONGBLOB';
        }
        if (len > 65536) {
          return 'MEDIUMBLOB';
        }
        if (len > 256) {
          return 'BLOB';
        }
        return 'TINYBLOB';
      case type.BOOLEAN:
        return 'TINYINT(1)';
      case 'json':
        return 'JSON';
    }
    return this._super(spec.type);
  },

  createColumnDef: function (name, spec, options, tableName) {
    var escapedName = util.format('`%s`', name);
    var t = this.mapDataType(spec);
    var len;
    if (spec.type === type.DECIMAL) {
      if (spec.precision && spec.scale) {
        len = '(' + spec.precision + ',' + spec.scale + ')';
      }
    } else if (spec.type !== type.TEXT && spec.type !== type.BLOB) {
      len = spec.length ? util.format('(%s)', spec.length) : '';
      if (t === 'VARCHAR' && len === '') {
        len = '(255)';
      }
    }
    var constraint = this.createColumnConstraint(
      spec,
      options,
      tableName,
      name
    );
    return {
      foreignKey: constraint.foreignKey,
      constraints: [escapedName, t, len, constraint.constraints].join(' ')
    };
  },

  createColumnConstraint: function (spec, options, tableName, columnName) {
    var constraint = [];
    var cb;

    if (spec.unsigned) {
      constraint.push('UNSIGNED');
    }

    if (spec.primaryKey) {
      if (!options || options.emitPrimaryKey) {
        constraint.push('PRIMARY KEY');
      }
    }

    if (spec.autoIncrement) {
      constraint.push('AUTO_INCREMENT');
    }

    if (spec.notNull === true) {
      constraint.push('NOT NULL');
    }

    if (spec.unique) {
      constraint.push('UNIQUE');
    }

    if (spec.onUpdate && spec.onUpdate.startsWith('CURRENT_TIMESTAMP')) {
      constraint.push('ON UPDATE ' + spec.onUpdate);
    }

    if (spec.null || spec.notNull === false) {
      constraint.push('NULL');
    }

    if (spec.defaultValue !== undefined) {
      constraint.push('DEFAULT');

      if (typeof spec.defaultValue === 'string') {
        if (spec.defaultValue.startsWith('CURRENT_TIMESTAMP')) {
          constraint.push(spec.defaultValue);
        } else {
          constraint.push("'" + spec.defaultValue + "'");
        }
      } else if (spec.defaultValue === null) {
        constraint.push('NULL');
      } else {
        constraint.push(spec.defaultValue);
      }
    }

    if (spec.comment) {
      constraint.push(`COMMENT '${spec.comment}'`);
    }

    if (spec.foreignKey) {
      cb = this.bindForeignKey(tableName, columnName, spec.foreignKey);
    }

    return { foreignKey: cb, constraints: constraint.join(' ') };
  },

  renameTable: function (tableName, newTableName, callback) {
    var sql = util.format('RENAME TABLE `%s` TO `%s`', tableName, newTableName);
    return this.runSql(sql).nodeify(callback);
  },

  _applyTableOptions: function (spec, tableName) {
    const tableOpts = [];

    // if there is no columns in the options object
    // it means it was a default payload without table options
    if (!spec.columns) return '';

    if (spec.engine && typeof spec.engine === 'string') {
      tableOpts.push(`ENGINE ${spec.engine}`);
    }

    if (spec.rowFormat && typeof spec.rowFormat === 'string') {
      tableOpts.push(`ROW_FORMAT ${spec.rowFormat}`);
    }

    if (spec.collate && typeof spec.collate === 'string') {
      tableOpts.push(`COLLATE '${spec.collate}'`);
    }

    if (spec.charset && typeof spec.charset === 'string') {
      tableOpts.push(`CHARACTER SET ${spec.charset}`);
    }

    return tableOpts.join(' ');
  },

  createDatabase: function (dbName, options, callback) {
    var spec = '';
    var ifNotExists = '';

    if (typeof options === 'function') callback = options;
    else {
      ifNotExists = options.ifNotExists === true ? 'IF NOT EXISTS' : '';
    }

    this.runSql(
      util.format('CREATE DATABASE %s `%s` %s', ifNotExists, dbName, spec),
      callback
    );
  },

  switchDatabase: function (options, callback) {
    if (typeof options === 'object') {
      if (typeof options.database === 'string') {
        this.all(util.format('USE `%s`', options.database), callback);
      }
    } else if (typeof options === 'string') {
      this.all(util.format('USE `%s`', options), callback);
    } else callback(null);
  },

  dropDatabase: function (dbName, options, callback) {
    var ifExists = '';

    if (typeof options === 'function') callback = options;
    else {
      ifExists = options.ifExists === true ? 'IF EXISTS' : '';
    }

    this.runSql(
      util.format('DROP DATABASE %s `%s`', ifExists, dbName),
      callback
    );
  },

  removeColumn: function (tableName, columnName, callback) {
    var sql = util.format(
      'ALTER TABLE `%s` DROP COLUMN `%s`',
      tableName,
      columnName
    );

    return this.runSql(sql).nodeify(callback);
  },

  addIndex: function (tableName, indexName, columns, unique, callback) {
    if (typeof unique === 'function') {
      callback = unique;
      unique = false;
    }

    if (!Array.isArray(columns)) {
      columns = [columns];
    }

    var columnsList = [];
    for (var columnIndex in columns) {
      var column = columns[columnIndex];
      var columnSpec = '';

      if (typeof column === 'object' && column.name) {
        columnSpec = util.format(
          '`%s`%s',
          column.name,
          column.length ? util.format('(%s)', parseInt(column.length)) : ''
        );
      } else if (typeof column === 'string') {
        columnSpec = util.format('`%s`', column);
      } else return callback(new Error('Invalid column specification'));

      columnsList.push(columnSpec);
    }

    var sql = util.format(
      'ALTER TABLE `%s` ADD %s INDEX `%s` (%s)',
      tableName,
      unique ? 'UNIQUE ' : '',
      indexName,
      columnsList.join(', ')
    );
    return this.runSql(sql).nodeify(callback);
  },

  removeIndex: function (tableName, indexName, callback) {
    // tableName is optional for other drivers, but required for mySql.
    // So, check the args to ensure they are valid
    if (
      arguments.length === 1 ||
      (arguments.length === 2 && typeof indexName === 'function')
    ) {
      callback = indexName;
      const err = new Error(
        'Illegal arguments, must provide "tableName" and "indexName"'
      );

      if (typeof indexName === 'function') {
        process.nextTick(function () {
          callback(err);
        });
      }

      return Promise.reject(err);
    }

    var sql = util.format('DROP INDEX `%s` ON `%s`', indexName, tableName);

    return this.runSql(sql).nodeify(callback);
  },

  renameColumn: function (tableName, oldColumnName, newColumnName, callback) {
    var self = this;
    var columnTypeSql = util.format(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '%s' AND COLUMN_NAME = '%s'",
      tableName,
      oldColumnName
    );

    return this.runSql(columnTypeSql)
      .then(function (result) {
        var columnType = result[0].COLUMN_TYPE;
        var alterSql = util.format(
          'ALTER TABLE `%s` CHANGE `%s` `%s` %s',
          tableName,
          oldColumnName,
          newColumnName,
          columnType
        );

        return self.runSql(alterSql);
      })
      .nodeify(callback);
  },

  changeColumn: function (tableName, columnName, columnSpec, callback) {
    var constraint = this.createColumnDef(columnName, columnSpec);
    var sql = util.format(
      'ALTER TABLE `%s` CHANGE COLUMN `%s` %s',
      tableName,
      columnName,
      constraint.constraints
    );

    var exec = function () {
      return this.runSql(sql).then(function () {
        if (constraint.foreignKey) return constraint.foreignKey();
        else return Promise.resolve();
      });
    }.bind(this);

    if (columnSpec.unique === false) {
      return this.removeIndex(tableName, columnName)
        .then(function () {
          return exec();
        })
        .nodeify(callback);
    } else return exec().nodeify(callback);
  },

  addMigrationRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql(
      'INSERT INTO `' +
        internals.migrationTable +
        '` (`name`, `run_on`) VALUES (?, ?)',
      [name, formattedDate],
      callback
    );
  },

  addSeedRecord: function (name, callback) {
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    this.runSql(
      'INSERT INTO `' +
        internals.seedTable +
        '` (`name`, `run_on`) VALUES (?, ?)',
      [name, formattedDate],
      callback
    );
  },

  addForeignKey: function (
    tableName,
    referencedTableName,
    keyName,
    fieldMapping,
    rules,
    callback
  ) {
    if (arguments.length === 5 && typeof rules === 'function') {
      callback = rules;
      rules = {};
    }
    var columns = Object.keys(fieldMapping);
    var referencedColumns = columns.map(function (key) {
      return fieldMapping[key];
    });
    var sql = util.format(
      'ALTER TABLE `%s` ADD CONSTRAINT `%s` FOREIGN KEY (%s) REFERENCES `%s` (%s) ON DELETE %s ON UPDATE %s',
      tableName,
      keyName,
      this.quoteDDLArr(columns).join(', '),
      referencedTableName,
      this.quoteDDLArr(referencedColumns).join(', '),
      rules.onDelete || 'NO ACTION',
      rules.onUpdate || 'NO ACTION'
    );

    return this.runSql(sql).nodeify(callback);
  },

  removeForeignKey: function (tableName, keyName, options, callback) {
    var sql = util.format(
      'ALTER TABLE `%s` DROP FOREIGN KEY `%s`',
      tableName,
      keyName
    );

    if (typeof options === 'function') {
      callback = options;
    }

    return this.runSql(sql)
      .then(
        function () {
          if (options && options.dropIndex === true) {
            sql = util.format(
              'ALTER TABLE `%s` DROP INDEX `%s`',
              tableName,
              keyName
            );
            return this.runSql(sql);
          } else {
            return Promise.resolve();
          }
        }.bind(this)
      )
      .nodeify(callback);
  },

  runSql: function () {
    var self = this;
    var args = this._makeParamArgs(arguments);

    var callback = args.pop();
    log.sql.apply(null, arguments);
    if (internals.dryRun) {
      return Promise.resolve().nodeify(callback);
    }

    return new Promise(function (resolve, reject) {
      args.push(function (err, data) {
        return err ? reject(err) : resolve(data);
      });

      self.connection.query.apply(self.connection, args);
    }).nodeify(callback);
  },

  _makeParamArgs: function (args) {
    var params = Array.prototype.slice.call(args);
    var sql = params.shift();
    var callback =
      typeof params[params.length - 1] === 'function' ? params.pop() : null;

    if (params.length > 0 && Array.isArray(params[0])) {
      params = params[0];
    }
    return [sql, params, callback];
  },

  all: function () {
    var args = this._makeParamArgs(arguments);

    log.sql.apply(null, arguments);

    return this.connection.query.apply(this.connection, args);
  },

  close: function (callback) {
    return new Promise(
      function (resolve, reject) {
        var cb = function (err, data) {
          return err ? reject(err) : resolve(data);
        };

        this.connection.end(cb);
      }.bind(this)
    ).nodeify(callback);
  }
});

Promise.promisifyAll(MysqlDriver);

function dummy () {
  arguments[arguments.length - 1]('not implemented');
}

exports.connect = function (config, intern, callback) {
  var db;

  internals = intern;
  log = internals.mod.log;
  type = internals.mod.type;

  internals.interfaces.SeederInterface._makeParamArgs = dummy;

  if (typeof mysql.createConnection === 'undefined') {
    db = config.db || new mysql.createClient(config);
  } else {
    db = config.db || new mysql.createConnection(config);
  }

  db.connect(function (err) {
    if (err) {
      return callback(err);
    }

    callback(null, new MysqlDriver(db));
  });
};
