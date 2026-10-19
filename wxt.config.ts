import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  publicDir: 'src/public',
  manifest: {
    name: 'Buffer Feedling',
    description: 'A pixel pet fed by your Buffer activity.',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyKLHDhKnxN34sJ1snKVCuqcgGxmnyXaeqFvVwLjMOCCoEAqFFBC4qtbuAQFtDFGWWi3KGegOnsPsFPUp1/wXyhd0W1jBYgyQb91JubpdoYH+wBe+hjRk3RSCMfbddACTFkeWwwe0Z3n+b9vx6z7VtDDu1w0DpT3He1+1d1VIcoFH5Eon8qtA7Av9bt7HlAsPDudyYypBT0+ghcpCkHYiy6HL17wlzMvfk2c8xpsy5fJi7/98rRLvHMD7SXE0DVE9V2xum3/NI5i3zWP4QC07IL5oclAzZaQRiR1WiQwO11TCWM6IUVjogDsJve9/1b/H39Mo3+pprfR/wce02HQpswIDAQAB',
    permissions: ['storage', 'alarms', 'identity', 'scripting', 'contextMenus'],
    optional_host_permissions: [
      '*://*.instagram.com/*',
      '*://*.facebook.com/*',
      '*://*.x.com/*',
      '*://*.twitter.com/*',
      '*://*.linkedin.com/*',
      '*://*.threads.com/*',
      '*://*.threads.net/*',
      '*://*.tiktok.com/*',
      '*://*.youtube.com/*',
      '*://*.pinterest.com/*',
      '*://bsky.app/*',
      '*://*.substack.com/*',
    ],
  },
});
