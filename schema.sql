-- schema.sql — Esquema de Base de Datos para Supabase (PostgreSQL)
-- App: Contabilidad Personal y Gestión Patrimonial

-- 1. Tabla de Cuentas
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'wallet', 'savings')),
    initial_balance NUMERIC(15, 2) DEFAULT 0.00,
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'CLP',
    color TEXT DEFAULT '#10b981',
    icon TEXT DEFAULT 'wallet',
    is_excluded_from_total BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#64748b'
);

-- 3. Tabla de Transacciones (Ingresos, Gastos, Transferencias)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    supplier TEXT,
    invoice_pdf TEXT,
    invoice_name TEXT,
    payment_method TEXT DEFAULT 'cash',
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Presupuestos Mensuales
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(15, 2) NOT NULL,
    spent_amount NUMERIC(15, 2) DEFAULT 0.00,
    month TEXT NOT NULL, -- Formato 'YYYY-MM'
    alert_threshold NUMERIC(5, 2) DEFAULT 80.00
);

-- 5. Tabla de Metas de Ahorro
CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) DEFAULT 0.00,
    deadline_date DATE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) opcional
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura anónima para desarrollo (ajustar en producción con auth)
CREATE POLICY "Permitir acceso universal temporal" ON accounts FOR ALL USING (true);
CREATE POLICY "Permitir acceso universal transacciones" ON transactions FOR ALL USING (true);
CREATE POLICY "Permitir acceso universal presupuestos" ON budgets FOR ALL USING (true);
CREATE POLICY "Permitir acceso universal metas" ON savings_goals FOR ALL USING (true);

