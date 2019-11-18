import _ from 'lodash';
import P from 'bluebird';
import config from './config';
import { init as dbInit } from './models/db-init';
import { Pool } from 'pg';
import generate from 'nanoid/generate';

let runCount = 1000;

const pgPool = new Pool({ connectionString: config.servicePG });

async function singleQuery(sqlStr: string, values: any[]) {
  return await pgPool.query(sqlStr, values);
}

function randDomainId(num: number = 6) {
  return generate('01234', num);
}

function randId(num: number = 6) {
  return generate('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', num);
}

async function getDomainIds(): Promise<string[]> {
  const query = `SELECT distinct domain_id from events`;
  const result = await singleQuery(query, []);
  return result.rows.map(r => r.domain_id);
}

async function deleteEvents(domainId: string) {
  const delQuery = `DELETE from events WHERE domain_id = $1`;
  await singleQuery(delQuery, [domainId]);
}

async function saveEvents() {
  const domainId = randDomainId(4);
  const userId = `${randId(10)}.${randId(10)}`;
  const sessionId = randId(4);

  const events = [{ event: randId(5), eventId: randId(6), pageId: randId(4), createdAt: Date.now() }];

  const evParams = _(events).map(ev => [ev.event, JSON.stringify(ev)]).flatten().value();
  const params: string[] = [ domainId, userId, sessionId, ...evParams ];
  let query = `INSERT INTO events (domain_id, user_id, session_id, event_name, event) VALUES`;
  query += events.map((_e, index) => `($1, $2, $3, $${4 + (index * 2)}, $${5 + (index * 2)})`).join(', ');
  await singleQuery(query, params);
}

async function saveParallel() {
  const start = Date.now();
  const arr = new Array(2000);
  await P.map(arr, saveEvents);
  const processTime = Date.now() - start;
  const waitTime = 1000 - processTime;
  if(waitTime > 0) await P.delay(waitTime);
}

async function run() {
  await saveParallel();
  await P.delay(300);
  const domainIds = await getDomainIds();
  await P.map(domainIds, deleteEvents);
  runCount--;
  if (runCount > 0) await run();
}

async function main() {
  await dbInit();
  const stopServer = () => {
    console.log('shutting.down');
    runCount = 0;
  };
  process.once('SIGINT', stopServer);
  process.once('SIGTERM', stopServer);
  run();
}

main()
  .catch(err => {
    console.error('app.init.failed', err);
    process.exit(1);
  });
