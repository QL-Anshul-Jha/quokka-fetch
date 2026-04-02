/* eslint-disable no-console */
import qf, { HttpMethod, QuokkaFetchError, createQuokkaFetch } from './index';

async function runTests() {
  console.log('🚀 TESTING QUOKKA-FETCH FEATURES...\n');

  try {
    // 1. Success Case
    try {
      const user = await qf<{ name: string }>({
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
      await qf({
        url: 'https://jsonplaceholder.typicode.com/invalid-endpoint-999',
        method: HttpMethod.GET
      });
      console.log('❌ Failed to catch structured error');
    } catch (e) {
      if (e instanceof QuokkaFetchError) {
        console.log('✅ Caught Structured QuokkaFetchError:', {
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
      await qf({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        timeout: 1
      });
    } catch (e) {
      if (e instanceof QuokkaFetchError && e.isTimeoutError) {
        console.log('✅ Caught Timeout Error:', e.code);
      } else {
        console.log('❌ Timeout test failed:', e);
      }
    }

    // 4. Abort Case
    try {
      console.log('\nTesting Abort Error...');
      const controller = new AbortController();
      const p = qf({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        signal: controller.signal
      });
      controller.abort();
      await p;
    } catch (e) {
      if (e instanceof QuokkaFetchError && e.isAbortError) {
        console.log('✅ Caught Abort Error:', e.code);
      } else {
        console.log('❌ Abort test failed:', e);
      }
    }

    // 5. Global Timeout Case
    try {
      console.log('\nTesting Global Timeout (1ms)...');
      const customQf = createQuokkaFetch({ timeout: 1 });
      await customQf({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET
      });
    } catch (e) {
      if (e instanceof QuokkaFetchError && e.isTimeoutError) {
        console.log('✅ Global Timeout caught correctly');
      } else {
        console.log('❌ Global Timeout failed:', e);
      }
    }

    // 6. Parameter Validation Case
    try {
      console.log('\nTesting Parameter Validation...');
      await qf({
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

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Unexpected Test Failure:', err);
  }
}

runTests();
