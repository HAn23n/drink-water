-- Tracks the best goal-met streak ever reached, so achievement badges stay
-- unlocked even after the current streak later breaks.
alter table profiles add column longest_streak_days integer not null default 0;
