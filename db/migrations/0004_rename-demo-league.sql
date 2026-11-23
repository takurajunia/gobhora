-- Custom SQL migration file, put your code below! ---- The sample league becomes the demo league, freeing "sazsl" for the real one
UPDATE "leagues"
SET "name" = 'GoBhora Demo League', "slug" = 'demo', "short_name" = 'Demo',
    "region" = 'Sample data', "tier" = NULL
WHERE "slug" = 'sazsl';