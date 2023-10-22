# Select

_Retrieves multiple records from the database_

```ts
import { selectMany } from 'unconventional-pg-queries';

const response = await selectMany(client, definition);
```

## Configurable fields
- table
- where
- expand
- order
- page
- limit
- count

## Examples

### Fetch by id

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
SELECT * FROM public.user fromref
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

### Fetch by multiple conditions

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
SELECT * FROM public.user fromref 
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
```
**Generated SQL**
```sql
```
**Response**
```json
```

### Order Results

**Definition**
```ts
```
**Generated SQL**
```sql
```
**Response**
```json
```

### Count Results

**Definition**
```ts
```
**Generated SQL**
```sql
```
**Response**
```json
```