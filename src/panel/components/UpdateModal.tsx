import { useState } from 'react';
import { type UpdateInfo, openExternalUrl } from '../services/updater.js';

interface Props {
  info: UpdateInfo;
  onClose: () => void;
}

export function UpdateModal({ info, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleUpdate = () => {
    const w = window as any;
    const downloadUrl =
      info.downloadUrl ||
      'https://raw.githubusercontent.com/Bielicoman/mypackspro/main/MyPacksPro.zxp';

    // If running in CEP environment with Node.js support, we can offer automated download
    if (typeof w.require === 'function') {
      try {
        setDownloading(true);
        setProgressText('Conectando ao servidor de atualização...');
        const https = w.require('https');
        const fs = w.require('fs');
        const path = w.require('path');
        const os = w.require('os');

        const tempDir = os.tmpdir();
        const destFile = path.join(tempDir, `MyPacksPro-v${info.latestVersion}.zxp`);
        const fileStream = fs.createWriteStream(destFile);

        const request = (url: string) => {
          https
            .get(url, { headers: { 'User-Agent': 'CEP-MyPacksPro-Updater' } }, (res: any) => {
              if (
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                request(res.headers.location);
                return;
              }

              if (res.statusCode !== 200) {
                setDownloading(false);
                setProgressText('Erro ao baixar. Abrindo página de download...');
                openExternalUrl(
                  'https://github.com/Bielicoman/mypackspro/releases/latest'
                );
                return;
              }

              const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
              let receivedBytes = 0;

              res.on('data', (chunk: any) => {
                receivedBytes += chunk.length;
                if (totalBytes > 0) {
                  const percent = Math.round((receivedBytes / totalBytes) * 100);
                  setProgressText(`Baixando atualização: ${percent}%`);
                } else {
                  const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
                  setProgressText(`Baixando: ${mb} MB`);
                }
              });

              res.pipe(fileStream);

              fileStream.on('finish', () => {
                fileStream.close(() => {
                  setProgressText('Pacote baixado! Abrindo instalador ZXP...');
                  setTimeout(() => {
                    setDownloading(false);
                    // Open the downloaded ZXP or location
                    const cp = w.require('child_process');
                    const startCmd = /mac|darwin/i.test(navigator.platform) ? 'open' : 'start';
                    cp.exec(`${startCmd} "" "${destFile}"`);
                    onClose();
                  }, 1000);
                });
              });
            })
            .on('error', () => {
              setDownloading(false);
              openExternalUrl(
                'https://github.com/Bielicoman/mypackspro/releases/latest'
              );
            });
        };

        request(downloadUrl);
        return;
      } catch {
        // Fallback to opening browser
      }
    }

    // Default browser open
    openExternalUrl(
      'https://github.com/Bielicoman/mypackspro/releases/latest'
    );
    onClose();
  };

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal__box"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--brand-accent, #3b82f6)',
                boxShadow: '0 0 10px rgba(59,130,246,0.6)',
              }}
            />
            Nova Versão Disponível
          </span>
          <button className="modal__x" onClick={onClose} title="Fechar">
            ×
          </button>
        </div>

        <div className="modal__body" style={{ gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#888' }}>Versão Atual</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>v{info.currentVersion}</div>
            </div>
            <div style={{ fontSize: 18, color: '#555' }}>➔</div>
            <div>
              <div style={{ fontSize: 11, color: '#3b82f6' }}>Nova Versão</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
                v{info.latestVersion}
              </div>
            </div>
          </div>

          {info.changelog && info.changelog.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Novidades e Melhorias
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#ccc',
                }}
              >
                {info.changelog.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {downloading ? (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(59,130,246,0.1)',
                borderRadius: 6,
                border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 12,
                color: '#93c5fd',
                textAlign: 'center',
              }}
            >
              {progressText}
            </div>
          ) : null}
        </div>

        <div className="modal__foot" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn--ghost" onClick={onClose} disabled={downloading}>
            Depois
          </button>
          <button
            className="btn btn--primary"
            onClick={handleUpdate}
            disabled={downloading}
            style={{
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              padding: '6px 16px',
            }}
          >
            {downloading ? 'Baixando...' : 'Atualizar Agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
