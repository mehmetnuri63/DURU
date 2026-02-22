
-- DURU ERP SİSTEMİ - SUPABASE DATABASE SCHEMA (FULL)

-- 1. ÜRÜNLER TABLOSU
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TEDARİKÇİLER TABLOSU
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    contact_person TEXT,
    email TEXT,
    address TEXT,
    service_areas TEXT[] DEFAULT '{}',
    rating INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SATIN ALMA TALEPLERİ VE ARŞİV (Status: Beklemede -> Sipariş Verildi -> Teslim Alındı)
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL NOT NULL DEFAULT 0,
    brand TEXT,
    features TEXT,
    note TEXT,
    status TEXT DEFAULT 'Beklemede' CHECK (status IN ('Beklemede', 'Sipariş Verildi', 'Teslim Alındı')),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    final_price DECIMAL DEFAULT 0, -- Birim Fiyat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DIŞ FİYAT TEKLİFLERİ
CREATE TABLE price_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    price DECIMAL NOT NULL,
    brand TEXT,
    features TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS (ROW LEVEL SECURITY)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for public" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON purchase_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON price_offers FOR ALL USING (true) WITH CHECK (true);

-- 6. EN İYİ FİYAT ANALİZ GÖRÜNÜMÜ
CREATE OR REPLACE VIEW best_price_analysis AS
WITH combined_prices AS (
    SELECT 
        product_id, 
        supplier_id, 
        price, 
        'TEKLİF' as source,
        created_at
    FROM price_offers
    UNION ALL
    SELECT 
        product_id, 
        supplier_id, 
        final_price as price, 
        'GERÇEK ALIM' as source,
        created_at
    FROM purchase_requests
    WHERE status = 'Teslim Alındı' AND final_price > 0
)
SELECT 
    product_id,
    supplier_id,
    MIN(price) as best_price,
    source,
    MAX(created_at) as last_update
FROM combined_prices
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY product_id, supplier_id, source;
