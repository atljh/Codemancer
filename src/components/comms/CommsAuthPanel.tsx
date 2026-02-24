import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Phone, Lock, Send, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useTelegram } from "../../hooks/useTelegram";
import { useTranslation } from "../../hooks/useTranslation";

export function CommsAuthPanel() {
  const { t } = useTranslation();
  const {
    authState,
    qrUrl,
    startPhoneAuth,
    submitPhoneCode,
    submitPassword,
    startQrAuth,
  } = useTelegram();
  const [mode, setMode] = useState<"qr" | "phone">("qr");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw real QR code when qrUrl changes
  useEffect(() => {
    if (!qrUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#00ff88", light: "#0a0a12" },
    }).catch(() => {});
  }, [qrUrl]);

  const handleStartQr = () => {
    startQrAuth();
  };

  const handleSendPhone = () => {
    if (phone) startPhoneAuth(phone);
  };

  const handleSubmitCode = () => {
    if (code) submitPhoneCode(code);
  };

  const handleSubmitPassword = () => {
    if (password) submitPassword(password);
  };

  // 2FA password is shown regardless of mode
  if (authState === "password_pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex items-center justify-center"
      >
        <div className="glass-panel rounded-lg p-6 w-[380px] tactical-corners">
          <h2 className="text-xs font-mono font-bold text-theme-accent tracking-[0.2em] uppercase mb-5 text-center">
            {t("comms.authTitle")}
          </h2>
          <p className="text-[10px] text-theme-text-dim font-mono text-center mb-4">
            {t("comms.passwordPlaceholder")}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text-dimmer"
                strokeWidth={1.5}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitPassword()}
                placeholder={t("comms.passwordPlaceholder")}
                autoFocus
                className="w-full bg-theme-bg-base border border-[var(--theme-glass-border)] rounded pl-9 pr-3 py-2.5 text-sm text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono transition-colors"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmitPassword}
              className="px-4 py-2.5 rounded glass-panel-bright text-theme-accent text-xs font-mono font-bold tracking-wider hover:bg-theme-accent/8 transition-colors shrink-0"
            >
              {t("comms.verify")}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex items-center justify-center"
    >
      <div className="glass-panel rounded-lg p-6 w-[380px] tactical-corners">
        <h2 className="text-xs font-mono font-bold text-theme-accent tracking-[0.2em] uppercase mb-5 text-center">
          {t("comms.authTitle")}
        </h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode("qr")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono tracking-wider transition-all ${
              mode === "qr"
                ? "border border-theme-accent/20 bg-theme-accent/8 text-theme-accent"
                : "border border-[var(--theme-glass-border)] text-theme-text-dim hover:text-theme-text"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" strokeWidth={1.5} />
            {t("comms.qrAuth")}
          </button>
          <button
            onClick={() => setMode("phone")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono tracking-wider transition-all ${
              mode === "phone"
                ? "border border-theme-accent/20 bg-theme-accent/8 text-theme-accent"
                : "border border-[var(--theme-glass-border)] text-theme-text-dim hover:text-theme-text"
            }`}
          >
            <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
            {t("comms.phoneAuth")}
          </button>
        </div>

        {mode === "qr" && (
          <div className="flex flex-col items-center gap-4">
            {authState === "qr_pending" ? (
              <>
                {qrUrl ? (
                  <canvas
                    ref={canvasRef}
                    width={200}
                    height={200}
                    className="rounded border border-[var(--theme-glass-border)]"
                  />
                ) : (
                  <div className="w-[200px] h-[200px] rounded border border-[var(--theme-glass-border)] flex items-center justify-center bg-theme-bg-base">
                    <Loader2
                      className="w-6 h-6 text-theme-accent animate-spin"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
                <p className="text-[10px] text-theme-text-dim font-mono">
                  {t("comms.qrScan")}
                </p>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartQr}
                className="w-full py-3 rounded glass-panel-bright text-theme-accent text-xs font-mono font-bold tracking-[0.15em] uppercase hover:bg-theme-accent/8 transition-colors"
              >
                {t("comms.qrAuth")}
              </motion.button>
            )}
          </div>
        )}

        {mode === "phone" && (
          <div className="space-y-3">
            {authState === "disconnected" || authState === "phone_pending" ? (
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendPhone()}
                  placeholder={t("comms.phonePlaceholder")}
                  className="flex-1 bg-theme-bg-base border border-[var(--theme-glass-border)] rounded px-3 py-2.5 text-sm text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono transition-colors"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSendPhone}
                  className="px-3 py-2.5 rounded glass-panel-bright text-theme-accent text-xs font-mono tracking-wider hover:bg-theme-accent/8 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                </motion.button>
              </div>
            ) : authState === "code_pending" ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
                  placeholder={t("comms.codePlaceholder")}
                  autoFocus
                  className="flex-1 bg-theme-bg-base border border-[var(--theme-glass-border)] rounded px-3 py-2.5 text-sm text-theme-text placeholder-theme-text-dimmer outline-none focus:border-theme-accent/30 font-mono tracking-[0.3em] text-center transition-colors"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmitCode}
                  className="px-4 py-2.5 rounded glass-panel-bright text-theme-accent text-xs font-mono font-bold tracking-wider hover:bg-theme-accent/8 transition-colors shrink-0"
                >
                  {t("comms.verify")}
                </motion.button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  );
}
