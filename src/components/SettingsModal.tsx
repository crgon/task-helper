import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    invoke<boolean>("get_api_key_status").then(setHasKey);
    isEnabled().then(setAutostart).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await invoke("set_api_key", { key: key.trim() });
      setHasKey(!!key.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setKey("");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    await invoke("set_api_key", { key: "" });
    setHasKey(false);
  }

  async function toggleAutostart() {
    if (autostart) {
      await disable();
      setAutostart(false);
    } else {
      await enable();
      setAutostart(true);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-800">设置</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">✕</button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600 font-medium">DeepSeek API Key</label>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50
                          rounded-lg px-3 py-2">
            <span className={`w-2 h-2 rounded-full ${hasKey ? "bg-green-400" : "bg-gray-300"}`}/>
            {hasKey ? "已设置（已安全保存到本地）" : "未设置"}
          </div>

          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="sk-以sk开头的API钥匙"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200
                       focus:outline-none focus:border-blue-400 text-sm font-mono"
          />

          <p className="text-xs text-gray-400">
            Key 保存在本地，不会上传到任何服务器。
            <br/>前往 <span className="text-blue-400">platform.deepseek.com</span> 获取。
          </p>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-700 font-medium">开机自启</p>
            <p className="text-xs text-gray-400 mt-0.5">系统启动时自动运行，最小化到托盘</p>
          </div>
          <button
            onClick={toggleAutostart}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              autostart ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                autostart ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
          <p>· 点击窗口关闭按钮 → 最小化到系统托盘</p>
          <p>· 托盘图标左键单击 → 显示/隐藏窗口</p>
          <p>· 托盘图标右键 → 更多操作</p>
        </div>

        <div className="flex gap-2">
          {hasKey && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-red-400 border border-red-100
                         rounded-lg hover:bg-red-50 transition-colors"
            >
              清除
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!key.trim() || saving}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm
                       hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            {saved ? "✓ 已保存" : saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
