import { defineConfig } from 'wxt';
import { allSitePatterns } from './src/lib/platforms/sites';

export default defineConfig({
  srcDir: 'src',
  publicDir: 'src/public',
  manifest: {
    name: 'Sproutling',
    description: 'A pixel pet that keeps your Buffer posting streak company and gently reminds you to stretch and look up from the scroll.',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyKLHDhKnxN34sJ1snKVCuqcgGxmnyXaeqFvVwLjMOCCoEAqFFBC4qtbuAQFtDFGWWi3KGegOnsPsFPUp1/wXyhd0W1jBYgyQb91JubpdoYH+wBe+hjRk3RSCMfbddACTFkeWwwe0Z3n+b9vx6z7VtDDu1w0DpT3He1+1d1VIcoFH5Eon8qtA7Av9bt7HlAsPDudyYypBT0+ghcpCkHYiy6HL17wlzMvfk2c8xpsy5fJi7/98rRLvHMD7SXE0DVE9V2xum3/NI5i3zWP4QC07IL5oclAzZaQRiR1WiQwO11TCWM6IUVjogDsJve9/1b/H39Mo3+pprfR/wce02HQpswIDAQAB',
    // Lets the service worker call Buffer without CORS headers
    host_permissions: ['https://auth.buffer.com/*', 'https://api.buffer.com/*'],
    permissions: ['storage', 'alarms', 'scripting', 'offscreen'],
    externally_connectable: { matches: ['https://sproutling.pet/*'] },
    optional_host_permissions: allSitePatterns(),
  },
});
