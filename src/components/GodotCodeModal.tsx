/**
 * Godot 4 3D Implementation Code Viewer & Project Exporter Modal
 */

import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileCode, 
  BookOpen, 
  Layers, 
  Download, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { GODOT_PROJECT_FILES, GodotFile } from '../data/godotCode';
import { sound } from '../services/sound';

interface GodotCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GodotCodeModal: React.FC<GodotCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<GodotFile>(GODOT_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'hierarchy'>('files');

  if (!isOpen) return null;

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    sound.playClick();
    const bundleText = GODOT_PROJECT_FILES.map(
      f => `========================================\nFILE: ${f.filename}\nDESCRIPTION: ${f.description}\n========================================\n\n${f.content}\n\n`
    ).join("\n\n");

    const blob = new Blob([bundleText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberSwarm_Godot4_Complete_Source.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-cyan-500/40 bg-slate-950 shadow-2xl shadow-cyan-500/20 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-cyan-500/20 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>GODOT 4 3D IMPLEMENTATION</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono-code">
                  GDScript & Scenes
                </span>
              </h2>
              <p className="text-xs text-slate-400">Complete 3D Godot 4.3 project code with AdMob and touch controls</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-semibold bg-cyan-950 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-900 transition cursor-pointer"
              title="Download all files in single bundle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Files</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950">
          <button
            onClick={() => { setActiveTab('files'); sound.playClick(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition cursor-pointer ${
              activeTab === 'files'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Files & Scripts</span>
          </button>
          <button
            onClick={() => { setActiveTab('hierarchy'); sound.playClick(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Scene Hierarchy</span>
          </button>
        </div>

        {activeTab === 'files' ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Sidebar File List */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 p-2 sm:p-3 overflow-y-auto space-y-1">
              <div className="text-[11px] font-mono-code text-slate-400 px-2 py-1 uppercase tracking-wider">
                Project Files
              </div>
              {GODOT_PROJECT_FILES.map((file) => {
                const isSelected = selectedFile.filename === file.filename;
                return (
                  <button
                    key={file.filename}
                    onClick={() => {
                      setSelectedFile(file);
                      sound.playClick();
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono-code flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{file.filename}</span>
                    <span className="text-[10px] opacity-60 ml-1">
                      {file.category === 'config' ? 'CFG' : file.category === 'scene_guide' ? 'DOC' : 'GD'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Code Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code text-xs text-cyan-400 font-semibold">{selectedFile.filename}</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">- {selectedFile.description}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono-code text-slate-200 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-[#080d1a] font-mono-code text-xs leading-relaxed text-slate-300 select-text">
                <pre className="whitespace-pre font-mono-code">
                  <code>{selectedFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : (
          /* Scene Hierarchy Visual Guide */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
              <h3 className="font-orbitron font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Godot 4 3D Node Architecture</span>
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-normal">
                This game uses Godot 4 Forward+ or Mobile 3D physics. All unit collisions, gate interactions, and boss health reductions use <code className="text-cyan-400">Area3D</code> triggers with collision layers for maximum mobile performance (60+ FPS on low-end devices).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cannon Tree */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <h4 className="font-orbitron font-semibold text-xs text-white mb-2 flex items-center justify-between">
                  <span>Player Cannon Scene (Cannon.tscn)</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code">Node3D</span>
                </h4>
                <div className="font-mono-code text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>📁 Cannon (Node3D) [Cannon.gd]</div>
                  <div className="ml-3">⏱ ShootTimer (Timer)</div>
                  <div className="ml-3">📁 MeshHierarchy (Node3D)</div>
                  <div className="ml-6">🔹 BaseChassis (MeshInstance3D)</div>
                  <div className="ml-6">🔹 HoverPodLeft (MeshInstance3D)</div>
                  <div className="ml-6">🔹 HoverPodRight (MeshInstance3D)</div>
                  <div className="ml-6">🔹 BarrelLeft (MeshInstance3D)</div>
                  <div className="ml-6">🔹 BarrelRight (MeshInstance3D)</div>
                  <div className="ml-6">💡 CoreReactor (MeshInstance3D - Emissive)</div>
                </div>
              </div>

              {/* Gate Tree */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <h4 className="font-orbitron font-semibold text-xs text-white mb-2 flex items-center justify-between">
                  <span>Multiplier Gate Scene (Gate.tscn)</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code">Node3D</span>
                </h4>
                <div className="font-mono-code text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>📁 MultiplierGate (Node3D) [MultiplierGate.gd]</div>
                  <div className="ml-3">🔹 ArchFrame (MeshInstance3D)</div>
                  <div className="ml-3">📁 LeftGate (Node3D)</div>
                  <div className="ml-6">⭕ Area3D (Layer: 1, Mask: 2)</div>
                  <div className="ml-9">▫ CollisionShape3D (BoxShape3D)</div>
                  <div className="ml-6">🏷 Label3D ("x2")</div>
                  <div className="ml-3">📁 RightGate (Node3D)</div>
                  <div className="ml-6">⭕ Area3D (Layer: 1, Mask: 2)</div>
                  <div className="ml-9">▫ CollisionShape3D (BoxShape3D)</div>
                  <div className="ml-6">🏷 Label3D ("+5")</div>
                </div>
              </div>

              {/* Boss Tree */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <h4 className="font-orbitron font-semibold text-xs text-white mb-2 flex items-center justify-between">
                  <span>Alien Boss Scene (AlienBoss.tscn)</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code">Area3D</span>
                </h4>
                <div className="font-mono-code text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>⭕ AlienBoss (Area3D) [AlienBoss.gd] (Layer: 4, Mask: 2)</div>
                  <div className="ml-3">▫ CollisionShape3D (SphereShape3D)</div>
                  <div className="ml-3">🔹 CoreMesh (MeshInstance3D - Icosahedron)</div>
                  <div className="ml-3">🔹 ShieldRing (MeshInstance3D - Torus)</div>
                  <div className="ml-3">📁 HpBillboard (Node3D)</div>
                  <div className="ml-6">🏷 HpLabel (Label3D - Billboard)</div>
                  <div className="ml-3">✨ DeathParticles (CPUParticles3D)</div>
                </div>
              </div>

              {/* Nanite Tree */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <h4 className="font-orbitron font-semibold text-xs text-white mb-2 flex items-center justify-between">
                  <span>Nanite Unit Scene (NaniteUnit.tscn)</span>
                  <span className="text-[10px] text-cyan-400 font-mono-code">Area3D</span>
                </h4>
                <div className="font-mono-code text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>⭕ NaniteUnit (Area3D) [NaniteUnit.gd] (Layer: 2, Mask: 1 | 4)</div>
                  <div className="ml-3">▫ CollisionShape3D (SphereShape3D radius: 0.25)</div>
                  <div className="ml-3">🔹 DroneMesh (MeshInstance3D)</div>
                  <div className="ml-3">💡 NeonGlow (OmniLight3D #00f3ff)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div>Tested in Godot 4.3 Forward+ & Mobile</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron font-bold transition cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
