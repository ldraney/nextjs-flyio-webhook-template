-- Add status column to formulas table
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'needs_review';

-- Add check constraint for valid status values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formulas_status_check') THEN
        ALTER TABLE formulas ADD CONSTRAINT formulas_status_check 
            CHECK (status IN ('needs_review', 'approved', 'rejected'));
    END IF;
END $$;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_formulas_status ON formulas(status);

-- Add index for status + created_date for dashboard queries
CREATE INDEX IF NOT EXISTS idx_formulas_status_created ON formulas(status, created_date DESC);

-- Update any existing formulas to default status
UPDATE formulas SET status = 'needs_review' WHERE status IS NULL;

-- Add comment to document status values
COMMENT ON COLUMN formulas.status IS 'Status of formula validation: needs_review, approved, rejected';