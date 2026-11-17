// Sample data for the database console: plain data, no database. The schema the tree shows, the
// query the editor starts with, and the rows "Run" shows (fixed: there is no SQL engine).

export interface Column {
    name: string;
    type: string;
    /** the primary key, or a foreign key to another table */
    key?: "primary" | "foreign";
}

export interface Table {
    name: string;
    rows: string;
    columns: Column[];
}

export const DATABASE = "analytics";

export const TABLES: Table[] = [
    {
        name: "customers",
        rows: "12.4k",
        columns: [
            { name: "id", type: "bigint", key: "primary" },
            { name: "name", type: "text" },
            { name: "email", type: "text" },
            { name: "country", type: "char(2)" },
            { name: "created_at", type: "timestamptz" },
        ],
    },
    {
        name: "orders",
        rows: "48.9k",
        columns: [
            { name: "id", type: "bigint", key: "primary" },
            { name: "customer_id", type: "bigint", key: "foreign" },
            { name: "status", type: "order_status" },
            { name: "total", type: "numeric(10,2)" },
            { name: "placed_at", type: "timestamptz" },
        ],
    },
    {
        name: "order_items",
        rows: "131k",
        columns: [
            { name: "order_id", type: "bigint", key: "foreign" },
            { name: "product_id", type: "bigint", key: "foreign" },
            { name: "quantity", type: "integer" },
            { name: "price", type: "numeric(10,2)" },
        ],
    },
    {
        name: "products",
        rows: "640",
        columns: [
            { name: "id", type: "bigint", key: "primary" },
            { name: "sku", type: "text" },
            { name: "title", type: "text" },
            { name: "category", type: "text" },
        ],
    },
];

export const QUERY = `-- Paid revenue by country, last 30 days
SELECT c.country,
       count(o.id)            AS orders,
       sum(o.total)           AS revenue,
       round(avg(o.total), 2) AS avg_order
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
  AND o.placed_at >= now() - interval '30 days'
GROUP BY c.country
ORDER BY revenue DESC
LIMIT 8;`;

export interface ResultColumn {
    name: string;
    numeric?: boolean;
}

export const RESULT: {
    columns: ResultColumn[];
    /** each row's values by column name */
    rows: Record<string, string>[];
    elapsed: string;
} = {
    columns: [
        { name: "country" },
        { name: "orders", numeric: true },
        { name: "revenue", numeric: true },
        { name: "avg_order", numeric: true },
    ],
    rows: [
        {
            country: "US",
            orders: "4,812",
            revenue: "391,204.50",
            avg_order: "81.30",
        },
        {
            country: "DE",
            orders: "2,215",
            revenue: "176,980.10",
            avg_order: "79.90",
        },
        {
            country: "GB",
            orders: "1,904",
            revenue: "149,330.75",
            avg_order: "78.43",
        },
        {
            country: "FR",
            orders: "1,631",
            revenue: "122,402.00",
            avg_order: "75.05",
        },
        {
            country: "JP",
            orders: "1,102",
            revenue: "93,761.40",
            avg_order: "85.08",
        },
        {
            country: "BR",
            orders: "1,288",
            revenue: "84,615.20",
            avg_order: "65.70",
        },
        {
            country: "CA",
            orders: "987",
            revenue: "77,512.95",
            avg_order: "78.53",
        },
        {
            country: "NL",
            orders: "744",
            revenue: "58,103.60",
            avg_order: "78.10",
        },
    ],
    elapsed: "14 ms",
};
