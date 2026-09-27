import React, { useState } from 'react';
import { Smartphone, QrCode, KeyRound, CheckCircle2, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';

export const HumanLabTab: React.FC = () => {
  const [participantId, setParticipantId] = useState('P-01');
  const [authMethod, setAuthMethod] = useState<'QR' | 'OTP' | 'QR_OTP'>('QR_OTP');
  const [step, setStep] = useState<'IDLE' | 'QR_SCAN' | 'OTP_ENTRY' | 'COMPLETED'>('IDLE');

  // Challenge State
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [mockHint, setMockHint] = useState<string | null>(null);

  // Timers
  const [scanStartTime, setScanStartTime] = useState<number>(0);
  const [scanDurationMs, setScanDurationMs] = useState<number>(0);
  const [otpStartTime, setOtpStartTime] = useState<number>(0);
  const [otpDurationMs, setOtpDurationMs] = useState<number>(0);
  const [totalHumanMs, setTotalHumanMs] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const startTrial = async () => {
    setLoading(true);
    setQrDataUrl(null);
    setOtpCodeInput('');
    setScanDurationMs(0);
    setOtpDurationMs(0);

    try {
      if (authMethod === 'QR') {
        const res = await api.generateQR('benchmark_user');
        setQrDataUrl(res.qrDataUrl);
        setQrToken(res.challengeToken);
        setScanStartTime(performance.now());
        setStep('QR_SCAN');
      } else if (authMethod === 'OTP') {
        const res = await api.requestOTP('benchmark_user');
        setOtpToken(res.challengeToken);
        setMockHint(res.mockCodeForTesting || '123456');
        setOtpStartTime(performance.now());
        setStep('OTP_ENTRY');
      } else {
        const res = await api.initiateQROTP('benchmark_user');
        setQrDataUrl(res.qrDataUrl);
        setQrToken(res.qrChallengeToken);
        setOtpToken(res.otpChallengeToken);
        setMockHint(res.mockOtpCodeForTesting || '123456');
        setScanStartTime(performance.now());
        setStep('QR_SCAN');
      }
    } catch (err) {
      console.error('Failed to initiate trial:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async () => {
    const scanDur = performance.now() - scanStartTime;
    setScanDurationMs(scanDur);

    if (authMethod === 'QR') {
      await api.verifyQR(qrToken!, 'human_participant_device');
      setTotalHumanMs(scanDur);
      setStep('COMPLETED');
      await api.logHumanTrial({
        participantId,
        authMethod: 'QR',
        qrScanDurationMs: scanDur,
        totalHumanDurationMs: scanDur,
        success: true,
      });
    } else {
      // Proceed to OTP stage
      setOtpStartTime(performance.now());
      setStep('OTP_ENTRY');
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpDur = performance.now() - otpStartTime;
    setOtpDurationMs(otpDur);
    const total = (scanDurationMs || 0) + otpDur;
    setTotalHumanMs(total);

    if (authMethod === 'OTP') {
      await api.verifyOTP(otpToken!, otpCodeInput);
    } else {
      await api.verifyQROTP(qrToken!, otpToken!, otpCodeInput, 'human_participant_device');
    }

    setStep('COMPLETED');
    await api.logHumanTrial({
      participantId,
      authMethod,
      qrScanDurationMs: scanDurationMs || null,
      otpEntryDurationMs: otpDur,
      totalHumanDurationMs: total,
      success: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Human Interaction & Usability Laboratory
          </h2>
          <p className="text-xs text-slate-400">
            Measuring Human Motor Latencies (QR Viewfinder Alignment & Keystroke OTP Entry) in Isolated Lab Datasets
          </p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800">
          Strictly Partitioned from Synthetic VUs
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trial Setup */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="font-semibold text-white text-xs font-mono uppercase tracking-wider pb-3 border-b border-slate-800">
            Participant Parameters
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Participant ID</label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Authentication Method</label>
              <select
                value={authMethod}
                onChange={(e) => setAuthMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="QR_OTP">Method D: QR + OTP (Combined)</option>
                <option value="QR">Method C: QR Only</option>
                <option value="OTP">Method B: OTP Only</option>
              </select>
            </div>

            <button
              onClick={startTrial}
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Start Participant Trial</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Human times reflect physical user perception and motor entry delay, typically 1,500ms to 4,500ms, distinct from sub-millisecond server execution.
            </p>
          </div>
        </div>

        {/* Interactive Lab Screen */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[420px]">
          {step === 'IDLE' && (
            <div className="text-center space-y-3">
              <Smartphone className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-mono text-sm">Ready for Participant Trial</div>
              <p className="text-slate-500 text-xs max-w-sm">
                Click "Start Participant Trial" to begin the stopwatch and render the active challenge.
              </p>
            </div>
          )}

          {step === 'QR_SCAN' && (
            <div className="text-center space-y-4">
              <div className="text-xs uppercase font-mono text-teal-400 tracking-wider font-bold">
                Stage 1: Scan QR Code on Screen
              </div>

              {qrDataUrl && (
                <div className="p-4 bg-white rounded-xl shadow-2xl inline-block">
                  <img src={qrDataUrl} alt="Active Authentication Challenge" className="w-48 h-48" />
                </div>
              )}

              <p className="text-xs text-slate-400 font-mono">
                Simulating camera viewfinder lock or scan completion:
              </p>

              <button
                onClick={handleSimulateScan}
                className="py-2.5 px-6 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors shadow-lg shadow-teal-500/20"
              >
                Simulate Camera Scan Event
              </button>
            </div>
          )}

          {step === 'OTP_ENTRY' && (
            <div className="text-center space-y-4 max-w-sm w-full">
              <div className="text-xs uppercase font-mono text-amber-400 tracking-wider font-bold">
                Stage 2: Enter 6-Digit Out-Of-Band OTP
              </div>

              {mockHint && (
                <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
                  Simulated SMS Notification Code:{' '}
                  <span className="text-amber-300 font-bold text-sm tracking-widest">{mockHint}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOtp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCodeInput}
                  onChange={(e) => setOtpCodeInput(e.target.value)}
                  placeholder="------"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-950 border border-slate-700 rounded-lg py-3 text-white focus:outline-none focus:border-teal-500"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={otpCodeInput.length < 6}
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors"
                >
                  Confirm OTP Verification
                </button>
              </form>
            </div>
          )}

          {step === 'COMPLETED' && (
            <div className="text-center space-y-4 font-mono">
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white text-base font-bold">Participant Authentication Completed</h3>

              <div className="grid grid-cols-3 gap-3 text-xs max-w-md mx-auto pt-2">
                {scanDurationMs > 0 && (
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">QR Scan Time</span>
                    <span className="text-cyan-400 font-bold">{(scanDurationMs / 1000).toFixed(2)} s</span>
                  </div>
                )}
                {otpDurationMs > 0 && (
                  <div className="p-3 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">OTP Entry Time</span>
                    <span className="text-amber-400 font-bold">{(otpDurationMs / 1000).toFixed(2)} s</span>
                  </div>
                )}
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Total Human Time</span>
                  <span className="text-teal-400 font-bold">{(totalHumanMs / 1000).toFixed(2)} s</span>
                </div>
              </div>

              <button
                onClick={() => setStep('IDLE')}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
              >
                Reset for Next Participant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
