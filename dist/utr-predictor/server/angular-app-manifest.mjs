
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 420, hash: '98dff4f1da0485506d18a21d4e8d99d9df0f4c2c83617e8d49929db9c097d471', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 933, hash: '0949873ed4c026bc5647f116071bf51f6540ba6496fd6296c24fe336a4ed5891', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 8910, hash: 'aca90ac3b9468dca654fcb1a7c75781ff2cdce3fb2c6631b04ab99da36f380b1', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles_css.mjs').then(m => m.default)}
  },
};
