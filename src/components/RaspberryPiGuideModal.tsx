import React, { useState } from 'react';
import { Quotation, DeliveryOrder, Invoice, CompanyProfile } from '../types';
import {
  X,
  Server,
  Globe,
  Database,
  Terminal,
  Copy,
  Check,
  Download,
  Upload,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

interface RaspberryPiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: Quotation[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  companyProfile: CompanyProfile;
  onImportData: (data: {
    quotations?: Quotation[];
    deliveryOrders?: DeliveryOrder[];
    invoices?: Invoice[];
    companyProfile?: CompanyProfile;
  }) => void;
}

export const RaspberryPiGuideModal: React.FC<RaspberryPiGuideModalProps> = ({
  isOpen,
  onClose,
  quotations,
  deliveryOrders,
  invoices,
  companyProfile,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'domain' | 'database' | 'hardware'>('docker');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // Export local JSON database file
  const handleExportDatabase = () => {
    const backupObj = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      companyProfile,
      quotations,
      deliveryOrders,
      invoices,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `quotexpress_pi_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON database file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.quotations || parsed.invoices) {
            onImportData({
              quotations: parsed.quotations,
              deliveryOrders: parsed.deliveryOrders,
              invoices: parsed.invoices,
              companyProfile: parsed.companyProfile,
            });
            alert('Database imported successfully onto this instance!');
          } else {
            alert('Invalid database format. Please select a valid SooQuoting JSON backup.');
          }
        } catch (err) {
          alert('Error reading JSON database file.');
        }
      };
    }
  };

  const dockerComposeSnippet = `version: '3.8'

services:
  quotexpress:
    build: .
    container_name: quotexpress-pi
    restart: always
    ports:
      - "1000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data`;

  const cloudflareCommand = `cloudflared tunnel --url http://localhost:1000`;

  const nginxReverseProxyConfig = `server {
    listen 80;
    server_name quotexpress.yourdomain.com;

    location / {
        proxy_pass http://localhost:1000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-md">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Raspberry Pi & Custom Domain Self-Hosting</span>
              </h2>
              <p className="text-xs text-slate-300">
                Run SooQuoting 100% locally on your Raspberry Pi or home server with custom domain HTTPS.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-bold pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('docker')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'docker'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1. Docker on Pi</span>
          </button>

          <button
            onClick={() => setActiveTab('domain')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'domain'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>2. Custom Domain & SSL</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>3. Database & Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'hardware'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>4. Hardware Specs</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Docker on Pi */}
          {activeTab === 'docker' && (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 leading-relaxed">
                <p className="font-bold flex items-center gap-2 text-sm text-emerald-950 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ready to deploy with Docker Compose!</span>
                </p>
                This codebase includes pre-configured <code>Dockerfile</code> and <code>docker-compose.yml</code> files optimized for Raspberry Pi (ARM64/v7) and x86 servers.
              </div>

              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900">Deployment Steps on Raspberry Pi:</h3>

                <div className="space-y-2">
                  <p className="font-bold text-slate-700">Step 1: Install Docker on Raspberry Pi OS</p>
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono relative">
                    <code>curl -fsSL https://get.docker.com | sh</code>
                    <button
                      onClick={() => handleCopy('curl -fsSL https://get.docker.com | sh', 'step1')}
                      className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans font-bold flex items-center gap-1"
                    >
                      {copiedCmd === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCmd === 'step1' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-700">Step 2: Clone repository & build container</p>
                  <div className="bg-slate-900 text-indigo-300 p-3 rounded-xl font-mono relative space-y-1">
                    <div>git clone https://github.com/superuser0520/Quote.git</div>
                    <div>cd Quote</div>
                    <div>docker compose up -d --build</div>
                    <button
                      onClick={() => handleCopy('git clone https://github.com/superuser0520/Quote.git && cd Quote && docker compose up -d --build', 'step2')}
                      className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans font-bold flex items-center gap-1"
                    >
                      {copiedCmd === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCmd === 'step2' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-700">Included docker-compose.yml Reference:</p>
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {dockerComposeSnippet}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Custom Domain & SSL */}
          {activeTab === 'domain' && (
            <div className="space-y-4 text-xs">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-900">
                <p className="font-bold text-sm text-indigo-950 mb-1">Host on your custom domain (e.g. quotexpress.yourdomain.com)</p>
                Two recommended options: <strong>Cloudflare Tunnel</strong> (easiest, no open ports required) OR <strong>Nginx Reverse Proxy with Let's Encrypt SSL</strong>.
              </div>

              {/* Cloudflare Tunnel Option */}
              <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Option A: Cloudflare Tunnel (Zero Port Forwarding)
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Recommended</span>
                </div>
                <p className="text-slate-600">Expose your Raspberry Pi app securely to your custom domain without exposing home router ports:</p>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono relative">
                  <code>{cloudflareCommand}</code>
                  <button
                    onClick={() => handleCopy(cloudflareCommand, 'cf')}
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans font-bold flex items-center gap-1"
                  >
                    {copiedCmd === 'cf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'cf' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Nginx Reverse Proxy Option */}
              <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50">
                <span className="font-extrabold text-sm text-slate-900">Option B: Nginx Reverse Proxy + Certbot SSL</span>
                <p className="text-slate-600">If using dynamic DNS or public IP with port 80/443 forwarded:</p>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {nginxReverseProxyConfig}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Database & Backup */}
          {activeTab === 'database' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span>Database Architecture & Portability</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Offline & Cloud Ready
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  SooQuoting stores structured records locally in standard JSON storage. You can seamlessly export or transfer your database between your PC and Raspberry Pi!
                </p>

                {/* Instant Database Export/Import Tools */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleExportDatabase}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Database (.json)</span>
                  </button>

                  <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-4 py-2.5 rounded-xl transition cursor-pointer border border-slate-700">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Import Database (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-extrabold text-slate-900">Current Local Database Stats:</span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-500 font-bold text-[10px]">QUOTATIONS</p>
                    <p className="font-black text-slate-900 text-base">{quotations.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-500 font-bold text-[10px]">DELIVERY ORDERS</p>
                    <p className="font-black text-slate-900 text-base">{deliveryOrders.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-500 font-bold text-[10px]">INVOICES</p>
                    <p className="font-black text-slate-900 text-base">{invoices.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Hardware Specs */}
          {activeTab === 'hardware' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Recommended Hardware Setup
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-900">Minimum Hardware:</p>
                    <p className="text-slate-600 mt-0.5">• Raspberry Pi 4 (2GB RAM)</p>
                    <p className="text-slate-600">• 16GB MicroSD card (Class 10 / A1)</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-900">Recommended Hardware:</p>
                    <p className="text-slate-600 mt-0.5">• Raspberry Pi 5 / Pi 4 (4GB RAM)</p>
                    <p className="text-slate-600">• USB3 SSD or NVMe HAT for ultra-fast performance</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Need help? The repository contains complete Docker setup files.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
