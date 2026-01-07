-- Create Jurisprudence Table
CREATE TABLE IF NOT EXISTS public.jurisprudence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identificadores Clave
    radicado TEXT NOT NULL, -- Ej: "52059" (Usado para evitar duplicados)
    sentencia_id TEXT,      -- Ej: "SP2163-2018"
    ddp_number TEXT,        -- Ej: "110" (Del boletín)
    
    -- Contenido Jurídico
    tema TEXT,              -- Ej: "Inasistencia alimentaria"
    tesis TEXT,             -- El resumen jurídico o tesis principal
    
    -- Metadatos de Origen
    source_url TEXT,        -- Link a OneDrive o fuente externa
    source_type TEXT DEFAULT 'bulletin', -- 'bulletin' | 'upload'
    
    -- Análisis Profundo (Opcional, para cuando se sube el PDF completo)
    analysis_level TEXT DEFAULT 'basic', -- 'basic' | 'deep'
    full_analysis JSONB,    -- Estructura compleja del análisis profundo
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index para búsquedas rápidas por radicado o tema
CREATE INDEX IF NOT EXISTS idx_jurisprudence_radicado ON public.jurisprudence(radicado);
CREATE INDEX IF NOT EXISTS idx_jurisprudence_tema ON public.jurisprudence USING gin(to_tsvector('spanish', tema || ' ' || tesis));

-- RLS Policies (Seguridad)
ALTER TABLE public.jurisprudence ENABLE ROW LEVEL SECURITY;

-- Lectura: Disponible para todos los usuarios autenticados
CREATE POLICY "Jurisprudence is viewable by all users" 
ON public.jurisprudence FOR SELECT 
USING (auth.role() = 'authenticated');

-- Escritura: Solo Admins (Staff con permiso) pueden crear/editar
-- (Por ahora lo dejamos abierto a autenticados para facilitar tus pruebas, luego se restringe)
CREATE POLICY "Jurisprudence is editable by admins" 
ON public.jurisprudence FOR ALL 
USING (auth.role() = 'authenticated'); -- Ajustar a rol 'ADMIN' mas adelante
