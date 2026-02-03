import { LicenseService } from './src/lib/license/LicenseService.ts';

async function test() {
    console.log('--- Testing License Service ---');
    const service = LicenseService.getInstance();
    await service.init();

    // Check ID
    const status = service.getStatus();
    console.log('Initial Status:', status);

    // Activate
    console.log('Activating VALID_KEY...');
    const res = await service.activate('VALID_KEY');
    console.log('Activate Result:', res);

    console.log('New Status:', service.getStatus());

    // Refresh
    console.log('Refreshing...');
    const ref = await service.refresh();
    console.log('Refresh Result:', ref);

    // Deactivate
    console.log('Deactivating...');
    await service.deactivate();
    console.log('Final Status:', service.getStatus());
}

test().catch(console.error);
