import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  File,
  Image,
  Settings,
  Package,
  X,
  RefreshCw,
  Search,
  Copy,
  Check,
} from "lucide-react";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
  if (["json"].includes(ext))
    return <Settings className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />;
  if (["md"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"].includes(ext))
    return <Image className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
  if (["yaml", "yml", "toml"].includes(ext))
    return <Package className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
  if (["sh"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  if (["css", "scss"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
  if (["html"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
  if (name === "Dockerfile")
    return <Package className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
  return <File className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />;
}

function TreeNodeItem({
  node,
  depth,
  parentPath,
  onFileClick,
  searchTerm,
  expandedFolders,
  toggleFolder,
}: {
  node: FileNode;
  depth: number;
  parentPath: string;
  onFileClick: (path: string) => void;
  searchTerm: string;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const isExpanded = expandedFolders.has(fullPath);

  if (searchTerm && node.type === "file") {
    if (!node.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;
  }

  if (node.type === "folder") {
    let visibleChildren = node.children || [];
    if (searchTerm) {
      visibleChildren = filterTree(visibleChildren, searchTerm);
      if (visibleChildren.length === 0 && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;
    }

    return (
      <div>
        <button
          onClick={() => toggleFolder(fullPath)}
          className="flex items-center gap-1 w-full px-1 py-[3px] text-[12px] text-[#c9d1d9] hover:bg-white/5 rounded transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-[#8b949e] flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[#8b949e] flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-[#e3b341] flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {visibleChildren.map((child, i) => (
              <TreeNodeItem
                key={child.name + i}
                node={child}
                depth={depth + 1}
                parentPath={fullPath}
                onFileClick={onFileClick}
                searchTerm={searchTerm}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(fullPath)}
      className="flex items-center gap-1.5 w-full px-1 py-[3px] text-[12px] text-[#c9d1d9] hover:bg-white/5 rounded transition-colors"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function filterTree(nodes: FileNode[], term: string): FileNode[] {
  return nodes.reduce<FileNode[]>((acc, node) => {
    if (node.type === "file") {
      if (node.name.toLowerCase().includes(term.toLowerCase())) acc.push(node);
    } else {
      const filteredChildren = filterTree(node.children || [], term);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(term.toLowerCase())) {
        acc.push({ ...node, children: filteredChildren });
      }
    }
    return acc;
  }, []);
}

function FileViewer({ filePath, onClose }: { filePath: string; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/infra/file-content?path=${encodeURIComponent(filePath)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load file");
        return r.json();
      })
      .then((data) => {
        setContent(data.content);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [filePath]);

  const handleCopy = useCallback(() => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon(fileName)}
          <span className="text-[11px] text-[#c9d1d9] truncate font-mono">{filePath}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 text-[#8b949e] hover:text-white transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {loading && <div className="text-[#8b949e] text-[12px] animate-pulse">Loading...</div>}
        {error && <div className="text-red-400 text-[12px]">{error}</div>}
        {content !== null && (
          <pre className="text-[11px] text-[#c9d1d9] font-mono whitespace-pre leading-[1.6] select-text">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function AdminFilesPanel({ onClose }: { onClose: () => void }) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([".agents", ".github", "artifacts", "docs", "lib", "scripts"])
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchTree = useCallback(() => {
    setLoading(true);
    fetch("/api/infra/files", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTree(data.tree || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#e3b341]" />
          <span className="text-[12px] font-semibold text-[#c9d1d9]">Library</span>
          <span className="text-[10px] text-[#8b949e]">File tree</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchTree}
            className="p-1 rounded hover:bg-white/10 text-[#8b949e] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-2 py-1.5 border-b border-white/7 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1">
          <Search className="w-3 h-3 text-[#8b949e] flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files"
            className="bg-transparent text-[11px] text-[#c9d1d9] placeholder-[#8b949e] outline-none flex-1 w-full"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-[#8b949e] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {selectedFile ? (
        <FileViewer filePath={selectedFile} onClose={() => setSelectedFile(null)} />
      ) : (
        <div className="flex-1 overflow-y-auto py-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 text-[#8b949e] animate-spin" />
            </div>
          ) : tree.length === 0 ? (
            <div className="text-[#8b949e] text-[12px] text-center py-8">No files found</div>
          ) : (
            tree.map((node, i) => (
              <TreeNodeItem
                key={node.name + i}
                node={node}
                depth={0}
                parentPath=""
                onFileClick={(path) => setSelectedFile(path)}
                searchTerm={searchTerm}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
