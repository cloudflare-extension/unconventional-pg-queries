### 1.6.0 (2025-10-29)

##### New Features

*  compound clauses ([5e651924](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/5e6519247919ce6fdbb4c41b2ab5ac122bcf7af0))

### 1.5.0 (2025-10-27)

##### Chores

*  update destroy returning value ([872e39e3](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/872e39e391e592efff1009fbf8fde76abf00ced2))

##### New Features

*  Add similarity operator ([afd89fba](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/afd89fbaaaffeac22a8dae3f1442002744ca60f8))

### 1.4.0 (2025-07-28)

##### New Features

*  Add ability to filter on relations via the SqlWhere structure ([346bf069](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/346bf069ef34f39dc8212826f199f4af2e9f0b46))

##### Bug Fixes

*  Nested expansions can result in the same record appearing multiple times. In this case, 2nd layer expansions weren't being attached to all appearances ([1a3eaf9d](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/1a3eaf9dccf1bd1e5a3e715f0fd1360cace072aa))
*  Fixed bug where only the first of two records expanding the same relation would get the relation, while the other was blank. ([c1dfe052](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/c1dfe0528e6acb689b7eea2ae3c2aa8102ab9670))
*  Handle casting of Dates on updates ([22c37dad](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/22c37dad2008ee4f44ab50fcdf8248e1df1d40a2))
*  Add type parser to ensure numeric types don't come out of the database as strings ([efb02401](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/efb0240193aeabfd5d8db1c8247e7d23a637c509))

### 1.3.0 (2025-06-18)

##### Bug Fixes

*  Nested expansions can result in the same record appearing multiple times. In this case, 2nd layer expansions weren't being attached to all appearances ([1a3eaf9d](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/1a3eaf9dccf1bd1e5a3e715f0fd1360cace072aa))
*  Fixed bug where only the first of two records expanding the same relation would get the relation, while the other was blank. ([c1dfe052](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/c1dfe0528e6acb689b7eea2ae3c2aa8102ab9670))
*  Handle casting of Dates on updates ([22c37dad](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/22c37dad2008ee4f44ab50fcdf8248e1df1d40a2))
*  Add type parser to ensure numeric types don't come out of the database as strings ([efb02401](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/efb0240193aeabfd5d8db1c8247e7d23a637c509))

### 1.2.0 (2025-03-16)

##### Bug Fixes

*  Handle casting of Dates on updates ([22c37dad](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/22c37dad2008ee4f44ab50fcdf8248e1df1d40a2))
*  Add type parser to ensure numeric types don't come out of the database as strings ([efb02401](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/efb0240193aeabfd5d8db1c8247e7d23a637c509))

### 1.1.0 (2024-11-21)

##### Bug Fixes

*  Expansions where the connecting field is not the id field sometimes failed to return results due to multiple rows meeting the WHERE condition. Added a subquery to the from table in direct joins to prevent this and also make the queries significantly more efficient. ([6f039187](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/6f03918785905e32ccfc9bd5646d4e338ffbbbdc))

