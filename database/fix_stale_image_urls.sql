-- Clear stale local image paths that no longer exist on the server filesystem.
-- These were downloaded to Render's ephemeral disk and lost on restart.
-- The scraper will repopulate image_url with the original source URLs on the next run.
UPDATE japan_cars
SET image_url = NULL
WHERE image_url LIKE '/uploads/%';
