-- How much extra the day's goal grows per ml of sweet/caffeinated drink logged —
-- user-adjustable since caffeine tolerance varies. Ships at 0.3 (30%), matching
-- the default OTHER_DRINK_GOAL_COMPENSATION_RATIO in src/lib/otherDrinks.ts.
alter table profiles add column caffeine_compensation_ratio numeric not null default 0.3;
