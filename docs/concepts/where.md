# Where

The SQL `where` clause filters the results of a query by one or multiple columns. The same is achieved in this library by adding a `where` field to any query definition. E.g:

```ts{5-7}
import { selectMany } from 'unconventional-pg-queries';

const response = await selectMany(client, {
    table: 'public.users',
    where: [
        { field: 'age', operator: SqlWhereOperator.Lt, value: 30 }
    ]
});
```

**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int < 30 // [!code hl]
```

## Operators
The following operators are supported by the `where` field:

### Equal
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.Eq, value: 'John' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."firstName" = 'John' // [!code focus]
```

### Not Equal
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.Neq, value: 'John' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."firstName" <> 'John' // [!code focus]
```

### Greater Than
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'age', operator: SqlWhereOperator.Gt, value: 30 } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int > 30 // [!code focus]
```

### Greater Than Or Equal
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'age', operator: SqlWhereOperator.Gt, value: 30 } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int >= 30 // [!code focus]
```

### Less Than
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'age', operator: SqlWhereOperator.Lt, value: 30 } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int < 30 // [!code focus]
```

### Less Than Or Equal
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'age', operator: SqlWhereOperator.Lte, value: 30 } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int <= 30 // [!code focus]
```

### Like
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.Like, value: 'J%' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."firstName" LIKE 'J%' // [!code focus]
```

### ILike
*ILike is the same as Like but case-insensitive*
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.ILike, value: 'j%' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."firstName" ILIKE 'j%' // [!code focus]
```

### Not Like
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.NotLike, value: 'John' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."firstName" NOT LIKE 'John' // [!code focus]
```

### In
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'id', operator: SqlWhereOperator.In, value: '(1,2,3)' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."id" IN (1,2,3) // [!code focus]
```

### Not In
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'firstName', operator: SqlWhereOperator.NotIn, value: '(1,2,3)' } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."id" NOT IN (1,2,3) // [!code focus]
```

### Is Null
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'lastName', operator: SqlWhereOperator.IsNull, value: null } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."id" IS NULL // [!code focus]
```

:::tip NOTE
The `value` field is unused in `IS NULL` and `IS NOT NULL` clauses.
:::

### Is Not Null
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'lastName', operator: SqlWhereOperator.IsNotNull, value: null } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."id" IS NOT NULL // [!code focus]
```

### Bitwise AND
```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'id', operator: SqlWhereOperator.BitwiseAnd, value: 2 } // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int & 2 > 0 // [!code focus]
```

::: tip
The bitwise AND operator is useful when storing flag enums in an integer column, where each bit of the integer represents a different boolean value. To check if a particular bit is set, simply check `field & bit > 0`.
:::

## Combining Clauses

Filtering on multiple columns at once is possible using the `andOr` field. E.g.

```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { field: 'lastName', operator: SqlWhereOperator.Like, value: 'S%' }, // [!code focus]
        { andOr: AndOr.Or, field: 'lastName', operator: SqlWhereOperator.IsNull, value: null }, // [!code focus]
        { andOr: AndOr.And, field: 'age', operator: SqlWhereOperator.Gt, value: 30 }, // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."lastName" LIKE 'S%' // [!code focus]
OR fromref."lastName" IS NULL // [!code focus]
AND (fromref."age")::int > 30 // [!code focus]
```
:::tip NOTE
Boolean operators are combined from left to right. Complex combinations involving parenthetical statements like (A OR B) AND (C OR D OR E) are not currently possible.
:::

## Filtering on JSON Columns

Filtering is supported on fields nested within JSONB columns as well. To do so, specify the JSONB column in `field` as usual, but also add the `jsonPath` field with the sub-field(s) to target. E.g.

```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { // [!code focus]
            field: 'metadata', // [!code focus]
            jsonPath: ['website'], // [!code focus]
            operator: SqlWhereOperator.Like, // [!code focus]
            value: '%.com' // [!code focus]
        }, // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."metadata"->>'website' LIKE '%.com' // [!code focus]
```

Or in the case of a nested sub-field:

```ts
{
    table: 'public.users',
    where: [ // [!code focus]
        { // [!code focus]
            field: 'metadata', // [!code focus]
            jsonPath: ['links', 'avatar'], // [!code focus]
            operator: SqlWhereOperator.IsNotNull, // [!code focus]
            value: null // [!code focus]
        }, // [!code focus]
    ] // [!code focus]
}
```

```sql
SELECT * FROM public.users fromref
WHERE fromref."metadata"->'links'->>'avatar' IS NOT NULL // [!code focus]
```