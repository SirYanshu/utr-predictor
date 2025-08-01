
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/home/div/projects/configs/scripts/utr_analysis/utr-calculator/utr-predictor/dist/utr-calculator',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/home/div/projects/configs/scripts/utr_analysis/utr-calculator/utr-predictor/dist/utr-calculator"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 533, hash: '282e754e775a7727cbf841cf40101f03be6b3b5ea7336cf5cf46145ef4c51976', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1046, hash: '69eb70f046ea0d25b24cc2f2f87f92fcf03527ae75e75736b93b07784347e468', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 9023, hash: '2e2edbf0b8f385e09d3a4419ca7b6745b7372c3edf1d81239238b9acc390b6dc', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
