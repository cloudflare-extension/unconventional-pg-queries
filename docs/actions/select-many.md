# Select Many

_Retrieves multiple records from the database_

```ts
import { selectMany } from 'unconventional-pg-queries';

const response = await selectMany(client, definition);
```

## Configurable fields
- table
- [where](/concepts/where)
- [expand](/concepts/relations)
- [page](#paginate-results)
- [limit](#paginate-results)
- [order](#order-results)
- [subAction (count)](#count-results)

## Examples

### Select by id

**Definition**
```ts
{
    table: 'public.users',
    where: [
        {
            field: 'age',
            operator: SqlWhereOperator.Lt,
            value: 30
        }
    ]
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."age")::int < 30
```
**Response**
```json
[
    {
        id: 2,
        email: "dorian.gray@test.com",
        firstName: "Dorian",
        lastName: "Gray",
        age: 25,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    {
        id: 5,
        email: "sibyl.vane@test.com",
        firstName: "Sibyl",
        lastName: "Vane",
        age: 20,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    ...
]
```

### Select by multiple conditions

**Definition**
```ts
{
    table: 'public.users',
    where: [
        {
            field: 'lastName',
            operator: SqlWhereOperator.IsNull,
            value: null
        },
        {
            field: 'isActive',
            operator: SqlWhereOperator.Eq,
            value: 'true'
        }
    ]
}
```
::: tip
`IsNull` or `IsNotNull` operators ignore the `value` field of a `where` clause. So, while a value is required for strong typing, anything can be used.
:::
**Generated SQL**
```sql
SELECT * FROM public.users fromref 
WHERE fromref."lastName" IS NULL 
AND (fromref."isActive")::boolean = true  
```
**Response**
```json
[
    {
        id: 12,
        email: "pocahontas@test.com",
        firstName: "Pocahontas",
        lastName: null,
        age: 20,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    {
        id: 34,
        email: "garfield@test.com",
        firstName: "Garfield",
        lastName: null,
        age: 15,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    ...
]
```

### Paginate Results

The cursor remains the value of the unique `page.field`, normally `id`. Pagination follows the complete requested sort, including COALESCE expressions and mixed directions. The unique cursor field is appended as a tie-breaker when omitted. For custom primary keys, set `idField` on the query definition so the first page uses the same tie-breaker.

ID-only ordering compares directly to the cursor value. Other sorts resolve the cursor row in a subquery within the same SQL statement, using the same filters. A missing or filtered-out cursor row produces an empty page. Sort-value changes between page requests can still move rows; pagination is not a snapshot.

Sorted cursor pagination requires non-null effective sort values. Use COALESCE with a non-null fallback for optional fields, such as `COALESCE(placed_at, created_at)` when `created_at` is NOT NULL. No nullability metadata or schema queries are needed.

When all sort directions match, a row comparison lets PostgreSQL seek directly into a matching index. Mixed directions use individual key comparisons. Cursor values remain inside PostgreSQL, preserving timestamp and integer precision.

For example, `COALESCE(placed_at, created_at) DESC, id DESC` can seek through `(user_id, COALESCE(placed_at, created_at) DESC, id DESC)` when the query filters one user. Add `account_id` after `user_id` in a separate index for queries filtering one account. Additional filters can still cause PostgreSQL to examine more than one page of index entries.

**Definition**
```ts
{
    table: 'public.users',
    page: {
        field: 'id',
        cursor: 10
    },
    limit: 10
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int > 10
LIMIT 10
```
::: tip
Results can be paginated in descending order as well. In that case, the second line above would change to `WHERE (fromref."id")::int < 10 ORDER BY fromref."id" DESC`.
:::
**Response**
```json
[
    {
        id: 11,
        email: "king.kong@test.com",
        firstName: "King",
        lastName: "Kong",
        age: 100,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    ...
    {
        id: 20,
        email: "charlie.brown@test.com",
        firstName: "Charlie",
        lastName: "Brown",
        age: 10,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    }
]
```

### Order Results

**Definition**
```ts
{
    table: 'public.users',
    order: [
        {
            field: 'isActive',
            direction: SqlDirection.Desc
        },
        {
            field: 'age',
            direction: SqlDirection.Asc
        }
    ]
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
ORDER BY fromref."isActive" DESC, fromref."age" ASC
```
**Response**
```json
[
    {
        id: 20,
        email: "charlie.brown@test.com",
        firstName: "Charlie",
        lastName: "Brown",
        age: 10,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    ...
    {
        id: 99,
        email: "elrond.peredhel@test.com",
        firstName: "Elrond",
        lastName: "Peredhel",
        age: 6437,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    }
]
```

### Count Rows

Adding the `subAction: SubAction.Count` field to your query definition returns the count of records in the table.

**Definition**
```ts
{
    table: 'public.users',
    subAction: SubAction.Count
}
```
**Generated SQL**
```sql
SELECT COUNT(*) FROM public.users fromref
```
**Response**
```json
{
    count: "100"
}
```