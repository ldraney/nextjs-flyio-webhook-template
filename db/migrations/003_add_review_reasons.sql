-- Add review_reasons field to track specific issues
ALTER TABLE formulas ADD COLUMN IF NOT EXISTS review_reasons TEXT[];

-- Add index for searching by review reasons
CREATE INDEX IF NOT EXISTS idx_formulas_review_reasons ON formulas USING GIN(review_reasons);

-- Add comment to document the field
COMMENT ON COLUMN formulas.review_reasons IS 'Array of specific reasons why this formula needs review, e.g. ["Duplicate ingredient: Water", "Total percentage: 103.2%"]';