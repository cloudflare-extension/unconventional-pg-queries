### 1.2.0 (2025-03-16)

##### Bug Fixes

*  Handle casting of Dates on updates ([22c37dad](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/22c37dad2008ee4f44ab50fcdf8248e1df1d40a2))
*  Add type parser to ensure numeric types don't come out of the database as strings ([efb02401](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/efb0240193aeabfd5d8db1c8247e7d23a637c509))

### 1.1.0 (2024-11-21)

##### Bug Fixes

*  Expansions where the connecting field is not the id field sometimes failed to return results due to multiple rows meeting the WHERE condition. Added a subquery to the from table in direct joins to prevent this and also make the queries significantly more efficient. ([6f039187](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/6f03918785905e32ccfc9bd5646d4e338ffbbbdc))

