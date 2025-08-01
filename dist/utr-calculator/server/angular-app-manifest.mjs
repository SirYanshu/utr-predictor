
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/utr-predictor/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/utr-predictor"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 452, hash: '5d307eb2aaececb5a40be8bd477c3bd7cbf86f1de5448ff58c16da8920b2ecb3', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 965, hash: 'eebb8da330b356e622f947c9c6ff5235ace6baa373a1d1f8934624949bf5a63e', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 8942, hash: 'b1d04edefdd0a30f991efbeaebafd07acd19ba8756aed8e14d7359ab3226f976', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
