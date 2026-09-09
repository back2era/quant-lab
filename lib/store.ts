import { env } from 'cloudflare:workers';
import { initialAccount } from './engine.mjs';
import seed from './seed.json';
function db(){const binding=(env as unknown as {DB:D1Database}).DB;if(!binding)throw new Error('账户数据库暂时不可用');return binding;}
export async function readAccount(){
 const database=db();let row=await database.prepare('SELECT revision, body FROM account WHERE id = ?').bind('main').first<{revision:number,body:string}>();
 if(!row){const state=initialAccount(new Date().toISOString());state.data=seed;await database.prepare('INSERT OR IGNORE INTO account (id, revision, body) VALUES (?, 0, ?)').bind('main',JSON.stringify(state)).run();row=await database.prepare('SELECT revision, body FROM account WHERE id = ?').bind('main').first<{revision:number,body:string}>();}
 if(!row)throw new Error('账户初始化失败');return {revision:row.revision,state:JSON.parse(row.body)};
}
export async function saveAccount(state:unknown,revision:number){const result=await db().prepare('UPDATE account SET body = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(state),'main',revision).run();if(result.meta.changes!==1)throw new Error('另一次更新已完成，请刷新后重试。');}
export async function readQuotes(){const row=await db().prepare('SELECT body FROM quotes WHERE id = ?').bind('live').first<{body:string}>();return row?JSON.parse(row.body):null;}
export async function saveQuotes(value:unknown){await db().prepare('INSERT INTO quotes (id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').bind('live',JSON.stringify(value)).run();}
