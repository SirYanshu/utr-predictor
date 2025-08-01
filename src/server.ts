import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const browserDistFolder = join(__dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

console.log('Server starting up...');

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

const port = process.env['PORT'] || 4000;
app.listen(port, (error) => {
  if (error) {
    throw error;
  }

  console.log(`Node Express server listening on http://localhost:${port}`);
});


export const reqHandler = createNodeRequestHandler(app);
