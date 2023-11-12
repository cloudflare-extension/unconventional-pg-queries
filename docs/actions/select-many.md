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
- [count](#count-results)

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

### Count Results

**Definition**
```ts
{
    table: 'public.users',
    count: true
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