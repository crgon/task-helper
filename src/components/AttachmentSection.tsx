import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface Attachment {
  id: number;
  task_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface Props {
  taskId: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type, className = "" }: { type: string; className?: string }) {
  if (type === "image") {
    return (
      <svg className={className} width="16" height="16" fill="none" viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
        <path d="M2 11l3.5-3.5 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  if (type === "pdf") {
    return (
      <svg className={className} width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M5 9h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} width="16" height="16" fill="none" viewBox="0 0 16 16">
      <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function AttachmentSection({ taskId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");

  const load = async () => {
    const rows = await invoke<Attachment[]>("get_attachments", { taskId });
    setAttachments(rows);
  };

  useEffect(() => {
    load();
  }, [taskId]);

  async function handlePick() {
    setUploading(true);
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "所有支持的文件",
            extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "pdf", "txt", "md", "docx", "xlsx", "pptx", "zip", "mp4", "mov"],
          },
        ],
      });
      if (!selected) return;
      const files = Array.isArray(selected) ? selected : [selected];
      for (const filePath of files) {
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        await invoke("save_attachment", {
          taskId,
          srcPath: filePath,
          fileName,
        });
      }
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const path = (file as File & { path?: string }).path;
        if (!path) continue;
        await invoke("save_attachment", {
          taskId,
          srcPath: path,
          fileName: file.name,
        });
      }
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    await invoke("delete_attachment", { id });
    await load();
  }

  async function handlePreview(att: Attachment) {
    if (att.file_type === "image") {
      const b64 = await invoke<string>("read_image_base64", { path: att.file_path });
      const ext = att.file_name.split(".").pop() || "png";
      setPreviewSrc(`data:image/${ext};base64,${b64}`);
      setPreviewing(att);
    } else {
      await invoke("open_file", { path: att.file_path });
    }
  }

  const images = attachments.filter(a => a.file_type === "image");
  const others = attachments.filter(a => a.file_type !== "image");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-fade-in-up stagger-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          附件
          {attachments.length > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">{attachments.length} 个</span>}
        </h2>
        <button
          onClick={handlePick}
          disabled={uploading}
          className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {uploading ? (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          添加文件
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border border-dashed border-gray-200 rounded-xl p-3 mb-3 text-center text-xs text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors cursor-pointer"
        onClick={handlePick}
      >
        拖拽文件到此处，或点击选择
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map(att => (
            <div
              key={att.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
              onClick={() => handlePreview(att)}
            >
              <ImageThumb att={att} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(att.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center transition-all"
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{att.file_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-1.5">
          {others.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 group transition-all cursor-pointer"
              onClick={() => handlePreview(att)}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${att.file_type === "pdf" ? "bg-red-50 text-red-400" : "bg-blue-50 text-blue-400"}`}>
                <FileIcon type={att.file_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{att.file_name}</p>
                <p className="text-xs text-gray-400">{formatBytes(att.file_size)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(att.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && <p className="text-center text-gray-400 text-xs py-2">暂无附件</p>}

      {previewing && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          style={{ position: "fixed" }}
          onClick={() => {
            setPreviewing(null);
            setPreviewSrc("");
          }}
        >
          <div className="relative max-w-2xl w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <img src={previewSrc} alt={previewing.file_name} className="w-full rounded-2xl object-contain max-h-[70vh]" />
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-white text-sm">{previewing.file_name}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => invoke("open_file", { path: previewing.file_path })}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-xl text-xs hover:bg-white/30 transition-colors"
                >
                  用系统打开
                </button>
                <button
                  onClick={() => {
                    setPreviewing(null);
                    setPreviewSrc("");
                  }}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-xl text-xs hover:bg-white/30 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageThumb({ att }: { att: Attachment }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    invoke<string>("read_image_base64", { path: att.file_path })
      .then(b64 => {
        const ext = att.file_name.split(".").pop() || "png";
        setSrc(`data:image/${ext};base64,${b64}`);
      })
      .catch(() => {});
  }, [att.file_name, att.file_path]);

  if (!src) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="text-gray-300">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          <path d="M3 14l4-4 3 3 3-3 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return <img src={src} alt={att.file_name} className="w-full h-full object-cover" />;
}
