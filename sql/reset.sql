-- reset.sql
SOURCE setup.sql;

-- Droppa alla tabeller om de redan existerar
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS knowledgeBase;
DROP TABLE IF EXISTS emailtickets;


-- Återskapa databasens schema
SOURCE ddl.sql;
--SOURCE insert.sql;
