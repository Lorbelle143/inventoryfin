import { useEffect, useState } from "react";

export type ToastMsg = { text: string; kind: "success" | "error" | "info" } | null;

type Props = {
  msg: ToastMsg;
  onDismiss: () => void;
  duration?: number;
};

export default function Toast({ msg, onDismiss, duration = 4000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!msg) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, duration);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <div className={`toast toast-${msg.kind}${visible ? " toast-in" : " toast-out"}`}>
      <span className="toast-icon">
        {msg.kind === "success" ? "✅" : msg.kind === "error" ? "❌" : "ℹ️"}
      </span>
      <span className="toast-text">{msg.text}</span>
      <button className="toast-close" onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}>×</button>
    </div>
  );
}
