-- Migration: add geolocation columns to clockins
ALTER TABLE clockins
    ADD COLUMN clock_in_lat  DECIMAL(10, 7) NULL AFTER hours_worked,
    ADD COLUMN clock_in_lng  DECIMAL(10, 7) NULL AFTER clock_in_lat;
