-- Travel-log entries can be fuzzy: an old trip may be known only to the month or
-- year, with day count unknown. Track how precise each trip's dates are so the UI
-- can render "~2008" / "Jul 2008" and "—" days instead of fake exact dates.
ALTER TABLE trips ADD COLUMN date_precision TEXT NOT NULL DEFAULT 'day'; -- day | month | year | unknown
