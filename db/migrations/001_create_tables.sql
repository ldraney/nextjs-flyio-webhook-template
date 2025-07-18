-- Create formulas table
CREATE TABLE IF NOT EXISTS formulas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) DEFAULT '1.0',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    inci_name VARCHAR(255),
    supplier_code VARCHAR(100),
    category VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create formula_ingredients junction table
CREATE TABLE IF NOT EXISTS formula_ingredients (
    id SERIAL PRIMARY KEY,
    formula_id INTEGER NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formula_id, ingredient_id)
);

-- Create ingredient_pricing table
CREATE TABLE IF NOT EXISTS ingredient_pricing (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    price_per_kg DECIMAL(10,2) NOT NULL CHECK (price_per_kg >= 0),
    supplier VARCHAR(255),
    effective_date DATE NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_formula_ingredients_formula_id ON formula_ingredients(formula_id);
CREATE INDEX IF NOT EXISTS idx_formula_ingredients_ingredient_id ON formula_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_pricing_ingredient_id ON ingredient_pricing(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_pricing_effective_date ON ingredient_pricing(effective_date);

-- Create updated_date trigger function
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for formulas table
CREATE OR REPLACE TRIGGER update_formulas_updated_date
    BEFORE UPDATE ON formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();