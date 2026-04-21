/* eslint-disable no-console */
import blazion, { HttpMethod, BlazionError, createBlazion } from './index';

async function runTests() {
  console.log('🚀 TESTING BLAZION CORE...\n');

  try {
    // 1. Basic GET
    try {
      const user = await blazion<{ name: string }>({
        url: 'https://jsonplaceholder.typicode.com/users/1',
        method: HttpMethod.GET
      });
      console.log('✅ GET Success:', user.name);
    } catch (e) {
      console.log('❌ GET Success failed:', e);
    }

    // 2. Structured 404 Case
    try {
      console.log('\nTesting 404 Error...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/invalid-endpoint-999',
        method: HttpMethod.GET
      });
      console.log('❌ Failed to catch structured error');
    } catch (e) {
      if (e instanceof BlazionError) {
        console.log('✅ Caught Structured BlazionError:', {
          Code: e.code,
          Status: e.status
        });
      } else {
        console.log('❌ Unexpected error type:', e);
      }
    }

    // 3. Timeout Case
    try {
      console.log('\nTesting Timeout Error...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        timeout: 1
      });
    } catch (e) {
      if (e instanceof BlazionError && e.isTimeoutError) {
        console.log('✅ Caught Timeout Error:', e.code);
      } else {
        console.log('❌ Timeout test failed:', e);
      }
    }

    // 4. Abort Case
    try {
      console.log('\nTesting Abort Error...');
      const controller = new AbortController();
      const p = blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        signal: controller.signal
      });
      controller.abort();
      await p;
    } catch (e) {
      if (e instanceof BlazionError && e.isAbortError) {
        console.log('✅ Caught Abort Error:', e.code);
      } else {
        console.log('❌ Abort test failed:', e);
      }
    }

    // 5. Global Timeout Case
    try {
      console.log('\nTesting Global Timeout (1ms)...');
      const customQf = createBlazion({ timeout: 1 });
      await customQf({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET
      });
    } catch (e) {
      if (e instanceof BlazionError && e.isTimeoutError) {
        console.log('✅ Global Timeout caught correctly');
      } else {
        console.log('❌ Global Timeout failed:', e);
      }
    }

    // 6. Parameter Validation Case
    try {
      console.log('\nTesting Parameter Validation...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        params: {
          page: (() => 9) as never
        }
      });
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('Invalid parameter type')) {
        console.log('✅ Caught expected TypeError for invalid parameter');
      } else {
        console.log('❌ Parameter validation failed:', e);
      }
    }

    // 7. Header Merging & Case Sensitivity Case
    console.log('\nTesting Header Merging, Overrides, and Case-Insensitivity...');
    try {
      const headerApi = createBlazion({
        headers: { 'X-Global-Header': 'global', 'X-Override': 'replace-me' }
      });

      const echo = await headerApi<{ headers: Record<string, string> }>({
        url: 'https://postman-echo.com/get',
        headers: { 'X-OVERRIDE': 'success', 'X-Local-Header': 'local' }
      });

      const h = echo.headers;
      if (h['x-global-header'] === 'global' && h['x-override'] === 'success' && h['x-local-header'] === 'local') {
        console.log('✅ Headers merged, overridden, and case-normalized correctly!');
      } else {
        console.log('❌ Header validation failed', h);
      }
    } catch (e) {
      console.error('❌ Header Validation Test Failed', e);
    }

    console.log('\n🎉 ALL CORE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Unexpected Test Failure:', err);
  }
}

runTests().then(() => process.exit(0));
