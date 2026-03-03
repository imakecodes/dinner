import { triggerManualSnapshot, getSnapshotStatus } from '@/lib/cron';

async function main() {
    console.log('=== Testing POE2 Snapshot System ===\n');
    
    // Testar status atual
    console.log('1. Checking current snapshot status...');
    try {
        const status = await getSnapshotStatus();
        console.log(`   Last run: ${status.lastRun ? status.lastRun.status : 'None'}`);
        console.log(`   Total entities: ${status.totalEntities}`);
        console.log(`   Last run date: ${status.lastRunDate || 'Never'}`);
        console.log(`   Next scheduled run: ${status.nextScheduledRun}`);
    } catch (error) {
        console.error('   Error getting status:', error);
    }
    
    // Testar snapshot padrão
    console.log('\n2. Testing standard snapshot...');
    try {
        const result = await triggerManualSnapshot('standard');
        console.log(`   Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Message: ${result.message}`);
    } catch (error) {
        console.error('   Error:', error);
    }
    
    // Aguardar um pouco
    console.log('\n3. Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Testar snapshot incremental
    console.log('\n4. Testing incremental snapshot...');
    try {
        const result = await triggerManualSnapshot('incremental');
        console.log(`   Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Message: ${result.message}`);
    } catch (error) {
        console.error('   Error:', error);
    }
    
    // Testar status após execução
    console.log('\n5. Checking status after tests...');
    try {
        const status = await getSnapshotStatus();
        console.log(`   Total entities: ${status.totalEntities}`);
        console.log(`   Last run status: ${status.lastRun?.status || 'None'}`);
    } catch (error) {
        console.error('   Error getting status:', error);
    }
    
    console.log('\n=== Test completed ===');
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

// Exportar para uso em outros módulos
export { main as testSnapshotSystem };