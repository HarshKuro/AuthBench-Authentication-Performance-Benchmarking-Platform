import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '../backend/src/db';

async function main() {
  const outputDir = path.resolve(__dirname, '../research-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Querying PostgreSQL 18 database for empirical traces...');
  let traces: any[] = [];
  let stages: any[] = [];
  let experiments: any[] = [];

  try {
    traces = await prisma.authenticationTrace.findMany({
      where: { isWarm: true },
      select: {
        traceId: true,
        authMethod: true,
        durationMs: true,
        success: true,
        statusCode: true,
        outlierClass: true,
        benchmarkRun: {
          select: {
            experiment: {
              select: {
                targetVUs: true,
              },
            },
          },
        },
      },
    });

    stages = await prisma.authenticationStage.findMany({
      select: {
        traceId: true,
        stageName: true,
        sequenceOrder: true,
        durationMs: true,
        status: true,
        trace: {
          select: {
            authMethod: true,
          },
        },
      },
    });

    experiments = await prisma.experiment.findMany({
      include: {
        benchmarkRuns: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  } catch (dbErr) {
    console.warn('PostgreSQL database unreachable or offline. Falling back to existing empirical CSV ground truth.');
    const pyRun = spawn('python', ['scripts/run_analysis.py'], { stdio: 'inherit' });
    await new Promise((res, rej) => {
      pyRun.on('close', (code) => {
        if (code === 0) res(null);
        else rej(new Error(`run_analysis.py exited with code ${code}`));
      });
    });
    return;
  }

  console.log(`Retrieved ${traces.length} warm traces, ${stages.length} stages, ${experiments.length} experiments.`);

  // Export traces CSV
  const traceCsvHeader = 'TraceId,AuthMethod,ConcurrencyVUs,DurationMs,Success,StatusCode,OutlierClass\n';
  const traceCsvRows = traces
    .map(
      (t) =>
        `${t.traceId},${t.authMethod},${t.benchmarkRun?.experiment?.targetVUs || 1},${t.durationMs.toFixed(3)},${t.success},${t.statusCode},${t.outlierClass}`
    )
    .join('\n');
  fs.writeFileSync(path.join(outputDir, 'traces_empirical.csv'), traceCsvHeader + traceCsvRows);

  // Export stages CSV
  const stageCsvHeader = 'TraceId,AuthMethod,StageName,SequenceOrder,DurationMs,Status\n';
  const stageCsvRows = stages
    .map(
      (s) =>
        `${s.traceId},${s.trace.authMethod},${s.stageName},${s.sequenceOrder},${s.durationMs.toFixed(3)},${s.status}`
    )
    .join('\n');
  fs.writeFileSync(path.join(outputDir, 'stages_decomposition.csv'), stageCsvHeader + stageCsvRows);

  // Group latencies by method
  const groups: Record<string, number[]> = {
    PASSWORD: [],
    OTP: [],
    QR: [],
    QR_OTP: [],
  };

  for (const t of traces) {
    if (groups[t.authMethod]) {
      groups[t.authMethod].push(t.durationMs);
    }
  }

  // Pass groups to Python analytics engine
  const pyPayload = {
    action: 'omnibus',
    groups,
  };

  const pyProcess = spawn('python', ['analytics/cli.py']);
  let pyStdout = '';
  let pyStderr = '';

  pyProcess.stdin.write(JSON.stringify(pyPayload));
  pyProcess.stdin.end();

  pyProcess.stdout.on('data', (data) => {
    pyStdout += data.toString();
  });
  pyProcess.stderr.on('data', (data) => {
    pyStderr += data.toString();
  });

  await new Promise((resolve, reject) => {
    pyProcess.on('close', (code) => {
      if (code !== 0) reject(new Error(`Python process exited with code ${code}: ${pyStderr}`));
      else resolve(null);
    });
  });

  const omnibusResult = JSON.parse(pyStdout);

  // Also calculate distribution metrics for each method via Python
  const distResults: Record<string, any> = {};
  for (const m of ['PASSWORD', 'OTP', 'QR', 'QR_OTP']) {
    const pyDist = spawn('python', ['analytics/cli.py']);
    let distOut = '';
    pyDist.stdin.write(JSON.stringify({ action: 'distribution', data: groups[m] }));
    pyDist.stdin.end();
    pyDist.stdout.on('data', (d) => (distOut += d.toString()));
    await new Promise((res) => pyDist.on('close', res));
    distResults[m] = JSON.parse(distOut);
  }

  // Calculate throughput & latency across concurrency tiers
  const concurrencyTiers: Record<number, Record<string, { throughput: number; p95: number }>> = {
    1: {},
    10: {},
    25: {},
  };

  for (const exp of experiments) {
    const vu = exp.targetVUs;
    if (!concurrencyTiers[vu]) concurrencyTiers[vu] = {};
    const run = exp.benchmarkRuns[0];
    if (run) {
      concurrencyTiers[vu][exp.authMethod] = {
        throughput: run.throughputRps || 0,
        p95: run.p95LatencyMs || 0,
      };
    }
  }

  // Stage breakdown means
  const stageStats: Record<string, Record<string, { totalMs: number; count: number }>> = {
    PASSWORD: {},
    OTP: {},
    QR: {},
    QR_OTP: {},
  };

  for (const s of stages) {
    const m = s.trace.authMethod;
    if (!stageStats[m]) stageStats[m] = {};
    if (!stageStats[m][s.stageName]) stageStats[m][s.stageName] = { totalMs: 0, count: 0 };
    stageStats[m][s.stageName].totalMs += s.durationMs;
    stageStats[m][s.stageName].count += 1;
  }

  const finalAnalysis = {
    totalTraces: traces.length,
    totalStages: stages.length,
    omnibusResult,
    distResults,
    concurrencyTiers,
    stageStats,
  };

  fs.writeFileSync(
    path.join(outputDir, 'statistical_results.json'),
    JSON.stringify(finalAnalysis, null, 2)
  );

  console.log('Statistical analysis completed and saved to research-output/statistical_results.json');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error in export_and_analyze:', err);
  process.exit(1);
});
