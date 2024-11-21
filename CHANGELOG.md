### 1.1.0 (2024-11-21)

##### Bug Fixes

*  Expansions where the connecting field is not the id field sometimes failed to return results due to multiple rows meeting the WHERE condition. Added a subquery to the from table in direct joins to prevent this and also make the queries significantly more efficient. ([6f039187](https://github.com/cloudflare-extension/unconventional-pg-queries/commit/6f03918785905e32ccfc9bd5646d4e338ffbbbdc))

