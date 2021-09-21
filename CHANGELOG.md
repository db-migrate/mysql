# [2.2.0](https://github.com/db-migrate/mysql/compare/v2.1.2...v2.2.0) (2021-09-21)


### Bug Fixes

* Removing unexisting MySQL option "before" ([b1295ab](https://github.com/db-migrate/mysql/commit/b1295abe7a4c0414da437da74df1487c15c3d253))


### Features

* Adds "AFTER" constraint at createColumnConstraint ([c648049](https://github.com/db-migrate/mysql/commit/c648049ea73c6be4729c773b7471f5c9fb3f753a))
* Adds "BEFORE" constraint at createColumnConstraint ([f61842d](https://github.com/db-migrate/mysql/commit/f61842de3e75328e81d5fcfd7f1c221b9da6c311))
* Utilise mysql2 package instead of mysql ([79ccece](https://github.com/db-migrate/mysql/commit/79ccece00e3cf26c904d28641725aec79d2ac37b))



## [2.1.2](https://github.com/db-migrate/mysql/compare/v2.1.1...v2.1.2) (2020-12-26)



## [2.1.1](https://github.com/db-migrate/mysql/compare/v2.1.0...v2.1.1) (2020-03-04)


### Bug Fixes

* **kv:** escape kv methods properly ([e16c59b](https://github.com/db-migrate/mysql/commit/e16c59b0dac9b67d3c08f96fc7d0dcd3a3329855))



# [2.1.0](https://github.com/db-migrate/mysql/compare/v2.0.0...v2.1.0) (2019-12-11)


### Features

* **tableoptions:** add support for table options ([240da5e](https://github.com/db-migrate/mysql/commit/240da5eeb80caed45bd6af95a2987320a9525148))
* **test:** start migrating to lab as a testing framework ([113682f](https://github.com/db-migrate/mysql/commit/113682fb5977de311e5ed5f496ddb9cf0acaccbf))



# [2.0.0](https://github.com/db-migrate/mysql/compare/v1.1.10...v2.0.0) (2019-12-11)


### Bug Fixes

* **database:** Allow specifying migration tables with their database name prepended ([dd9c111](https://github.com/db-migrate/mysql/commit/dd9c11133b16eee7e5d9acc6b261129c11eb6b77))
* **escaping:** join rather than pass array to util format ([7053c78](https://github.com/db-migrate/mysql/commit/7053c782815d44896736c12f7d94e01c0b8cc2db))
* **escaping:** revert [#17](https://github.com/db-migrate/mysql/issues/17) and adjust comments to modern js ([dbf2380](https://github.com/db-migrate/mysql/commit/dbf23806cba2f10c6dba8072d6c213fe7b33b4e7))
* **test:** adjust test to new return values ([ef92da7](https://github.com/db-migrate/mysql/commit/ef92da770116ceb626d261a4e2301865089b4dca))


### Features

* **column constraint:** added precision support for current_timestamp ([43e40bd](https://github.com/db-migrate/mysql/commit/43e40bdafed6f265cb9099ef5fc880cb7ed63ec1))
* **comment:** Add comment spec for columns ([d1af925](https://github.com/db-migrate/mysql/commit/d1af92574ee4ace2cc10dcc23338b4d1b61d0721)), closes [#558](https://github.com/db-migrate/mysql/issues/558)
* **comment:** Add comment spec for columns ([b7297d6](https://github.com/db-migrate/mysql/commit/b7297d6629453fad83e27d55f8b523402aef869f)), closes [#558](https://github.com/db-migrate/mysql/issues/558)
* **data-types:** add support for decimal precision and range options ([336743f](https://github.com/db-migrate/mysql/commit/336743f273c4743b0ae9237ece5174a054bcdcab))



## [1.1.10](https://github.com/db-migrate/mysql/compare/v1.1.9...v1.1.10) (2016-10-17)


### Bug Fixes

* **ai:** do no omit auto increment on missing unique or pr spec ([be9bbec](https://github.com/db-migrate/mysql/commit/be9bbec5a7d9bf188b1a9c97e8f0f1df277b06e8))



## [1.1.9](https://github.com/db-migrate/mysql/compare/v1.1.8...v1.1.9) (2016-10-13)



## [1.1.8](https://github.com/db-migrate/mysql/compare/v1.1.7...v1.1.8) (2016-10-13)


### Bug Fixes

* **foreignKey:** check if options object exists first ([5b739f6](https://github.com/db-migrate/mysql/commit/5b739f67dc57fd76cae44e4aebfa70d9d9585438))


### Features

* **tests:** move tests into the repo of the driver ([1cd2f64](https://github.com/db-migrate/mysql/commit/1cd2f64fe7a16aa219712da96d7d6c16465ffa60))



## [1.1.7](https://github.com/db-migrate/mysql/compare/v1.1.6...v1.1.7) (2016-05-25)


### Bug Fixes

* **scopes:** use all instead of runSql in switchDatabase ([b45d1f1](https://github.com/db-migrate/mysql/commit/b45d1f19cdb4c119ee86a64bd22e09b6b96ccc0a)), closes [#5](https://github.com/db-migrate/mysql/issues/5)



## [1.1.6](https://github.com/db-migrate/mysql/compare/v1.1.5...v1.1.6) (2016-02-05)



## [1.1.5](https://github.com/db-migrate/mysql/compare/v1.1.4...v1.1.5) (2016-02-03)


### Bug Fixes

* **upstream:** bump upstream package to fix dropTable bug ([bd1a4cd](https://github.com/db-migrate/mysql/commit/bd1a4cd215f1055aade9664a784a194a71919a33))



## [1.1.4](https://github.com/db-migrate/mysql/compare/v1.1.3...v1.1.4) (2016-01-27)


### Bug Fixes

* **dependency:** upgrade to work properly with the main module again ([2a9a0f6](https://github.com/db-migrate/mysql/commit/2a9a0f6dbd4a8c4bd46e0bd1ed6ddfcad9fee5e2))



## [1.1.3](https://github.com/db-migrate/mysql/compare/v1.1.2...v1.1.3) (2015-09-16)



## [1.1.2](https://github.com/db-migrate/mysql/compare/v1.1.1...v1.1.2) (2015-09-10)



## 1.1.1 (2015-09-08)



