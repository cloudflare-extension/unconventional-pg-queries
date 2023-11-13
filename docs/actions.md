# Actions

Unconventional Queries supports these database actions: [Select](./actions/select.md), [Insert](./actions/insert.md), [Update](./actions/update.md), [Delete](./actions/delete.md), [Select Many](./actions/select-many.md), [Update Many](./actions/update-many.md).

## Definition

Each action is customized by a query definition, which has the following properties:

|Prop|Type|Supported Actions|Description|
| ------------- | :-----------: | :-------: | :---- |
| table | string | All | The database table on which to execute the query (Required by all) |
| [where](./concepts/where.md) | [SqlWhere](#sqlwhere) | [Select](./actions/select.md)<br />[Select Many](./actions/select-many.md)<br />[Update](./actions/update.md)<br />[Delete](./actions/delete.md) | Filters the query response by a particular set of criteria |
| data | Object \| Object[] | [Insert](./actions/insert.md)<br />[Update](./actions/update.md)<br />[Update Many](./actions/update-many.md) | The data to insert or update in a table |
| [expand](./concepts/relations.md) | Record<string, [Expansion](#expansion)> | [Select](./actions/select.md)<br />[Select Many](./actions/select-many.md) | A list of relations to expand on the response object |
| [order](./actions/select-many.md#order-results) | [SqlOrder[]](#sqlorder) | [Select Many](./actions/select-many.md) | Orders the rows in the response object by a particular set of fields |
| [page](./actions/select-many.md#paginate-results) | [SqlPaginate](#sqlpaginate) | [Select Many](./actions/select-many.md) | Paginates the rows in the response object |
| [limit](./actions/select-many.md#paginate-results) | number | [Select Many](./actions/select-many.md) | Returns only a set number of rows |
| [count](./actions/select-many.md#count-results) | boolean | [Select Many](./actions/select-many.md) | If `true`, returns the number of rows matching the query in the form `{count: <# of rows>}` |
| [conflict](./actions/insert.md#upsert) | [SqlConflict](#sqlconflict) | [Insert](./actions/insert.md) | When used on an Insert query, either performs an upsert or ignores conflicts depending on which resolution is set |

## Types

Types used in the formation of a query definition object

*For informational purposes. Feel free to skip to the next page for query examples.*

### Expansion
```ts
interface Expansion {
  type: OneOrMany;
  name: string;
  parentName?: string;
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  throughTable?: string;
  throughFromField?: string;
  throughToField?: string;
  expand?: Record<string, Expansion>;
}
```

### SqlConflict
```ts
interface SqlConflict {
  action: ConflictResolution;
  constraint?: string[];
}
```

### SqlOrder
```ts
interface SqlOrder {
  field: string;
  jsonPath?: string[];
  direction: SqlDirection;
}
```

### SqlPaginate
```ts
interface SqlPaginate {
  field: string;
  cursor: string | number;
}
```

### SqlWhere
```ts
interface SqlWhere {
  field: string;
  jsonPath?: string[];
  operator: SqlWhereOperator;
  value: string | number | null;
  andOr?: AndOr;
}
```

## Enums

Enums used within definition properties above

#### AndOr
```ts
enum AndOr {
  And = 'AND',
  Or = 'OR'
}
```

#### ConflictResolution
```ts
enum ConflictResolution {
  doNothing = 'DO NOTHING',
  doUpdate = 'DO UPDATE SET'
}
```

#### OneOrMany
```ts
enum OneOrMany {
  One = 'one',
  Many = 'many'
}
```

#### SqlDirection
```ts
enum SqlDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}
```

#### SqlWhereOperator
```ts
enum SqlWhereOperator {
  Eq = '=',
  Neq = '<>',
  Gt = '>',
  Gte = '>=',
  Lt = '<',
  Lte = '<=',
  Like = 'LIKE',
  ILike = 'ILIKE',
  NotLike = 'NOT LIKE',
  In = 'IN',
  NotIn = 'NOT IN',
  IsNull = 'IS NULL',
  IsNotNull = 'IS NOT NULL',
  BitwiseAnd = '&'
}
```