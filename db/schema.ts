import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const account = sqliteTable('account', {id:text('id').primaryKey(),revision:integer('revision').notNull().default(0),body:text('body').notNull()});
export const quotes = sqliteTable('quotes', {id:text('id').primaryKey(),body:text('body').notNull()});
