import React from 'react';

// Mostra botão pra baixar arquivos gerados pela IA
export default function FileDownloads({ files, apiUrl }) {
  const token = localStorage.getItem('master_token');

  if (!files || files.length === 0) return null;

  function getIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    if (ext === 'docx') return '📃';
    if (ext === 'txt') return '📝';
    return '📎';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function downloadFile(file) {
    const url = `${apiUrl}/api/upload/file/${file.id}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro no download');
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      })
      .catch(err => alert('Erro ao baixar: ' + err.message));
  }

  return (
    <div className="file-downloads">
      <p className="downloads-label">📎 Arquivos gerados:</p>
      {files.map(file => (
        <button
          key={file.id}
          className="download-btn"
          onClick={() => downloadFile(file)}
        >
          <span className="download-icon">{getIcon(file.filename)}</span>
          <span className="download-name">{file.filename}</span>
          <span className="download-size">{formatSize(file.size)}</span>
          <span className="download-arrow">⬇</span>
        </button>
      ))}
    </div>
  );
}
