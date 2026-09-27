import { prisma } from '../db';
import { BenchmarkRunner } from './runner';
import { TelemetryBuffer } from '../instrumentation/telemetry-buffer';

async function runScientificCampaign() {
  console.log('================================================================');
  console.log('STARTING RIGOROUS EMPIRICAL BENCHMARK CAMPAIGN ON POSTGRESQL');
  console.log('================================================================');

  // Define experimental profiles to evaluate
  // Methods: PASSWORD, OTP, QR, QR_OTP
  // Concurrency levels: 1 VU (Baseline), 10 VUs (Medium), 25 VUs (Stress)
  const methods: ('PASSWORD' | 'OTP' | 'QR' | 'QR_OTP')[] = [
    'PASSWORD',
    'OTP',
    'QR',
    'QR_OTP',
  ];

  const concurrencyLevels = [1, 10, 25];
  const durationSec = 6; // 6 seconds per test condition to gather robust sample size

  for (const vu of concurrencyLevels) {
    for (const method of methods) {
      console.log(`\n>>> Executing Condition: Method = ${method}, Concurrency = ${vu} VUs, Duration = ${durationSec}s`);

      const exp = await prisma.experiment.create({
        data: {
          code: `EXP-${method}-${vu}VU-${Date.now().toString().slice(-4)}`,
          title: `Empirical Study: ${method} under ${vu} Concurrent VUs`,
          hypothesis: `H1/H4: Evaluate latency distribution and throughput for ${method} at ${vu} VUs`,
          authMethod: method,
          loadModel: 'CLOSED_CONCURRENCY',
          targetVUs: vu,
          durationSec,
          repetitions: 1,
          networkProfile: 'LAN_0MS',
          addedLatencyMs: 0,
          status: 'CONFIGURED',
        },
      });

      const runner = new BenchmarkRunner({
        experimentId: exp.id,
        code: exp.code,
        authMethod: method,
        loadModel: 'CLOSED_CONCURRENCY',
        targetVUs: vu,
        durationSec,
        repetitions: 1,
        addedLatencyMs: 0,
        packetLossPct: 0,
        cacheEnabled: false,
      });

      await runner.execute();
      console.log(`Finished Condition: ${exp.code}`);
    }
  }

  console.log('\nFlushing all remaining telemetry to PostgreSQL...');
  await TelemetryBuffer.getInstance().flush();
  TelemetryBuffer.getInstance().stop();

  const totalTraces = await prisma.authenticationTrace.count();
  const totalStages = await prisma.authenticationStage.count();
  console.log(`\n================================================================`);
  console.log(`CAMPAIGN COMPLETED SUCCESSFULLY!`);
  console.log(`Total Stored Traces in PostgreSQL: ${totalTraces}`);
  console.log(`Total Stored Micro-Stages in PostgreSQL: ${totalStages}`);
  console.log(`================================================================`);

  await prisma.$disconnect();
  process.exit(0);
}

runScientificCampaign().catch((err) => {
  console.error('Campaign error:', err);
  process.exit(1);
});
