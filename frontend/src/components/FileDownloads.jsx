import React, { useState } from 'react';
import MarkdownMessage from './MarkdownMessage';
import { api } from '../lib/api';

// Mostra resposta da IA com opção de editar/regenerar
export default function FileDownloads({ files, content, conversationId, onUpdate, apiUrl }) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(content);
  const [generating, setGenerating] = useState(false);
  const [currentFiles, setCurrentFiles] = useState(files || []);

  const token = localStorage.getItem('master_token');

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
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.blob() : Promise.reject('Erro'))
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      })
      .catch(err => alert('Erro ao baixar: ' + err));
  }

  async function regenerateFile(file) {
    setGenerating(true);
    try {
      const ext = file.filename.split('.').pop().toLowerCase();
      const typeMap = { pdf: 'pdf', xlsx: 'xlsx', xls: 'xlsx', docx: 'docx', txt: 'txt', csv: 'xlsx' };
      const type = typeMap[ext] || 'pdf';
      const baseName = file.filename.replace(/\.[^.]+$/, '');

      const response = await fetch(`${apiUrl}/api/upload/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId, text: editedText, fileType: type, filename: baseName })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const newFile = await response.json();

      // Substitui o arquivo antigo pelo novo
      const updatedFiles = currentFiles.map(f => f.id === file.id ? newFile : f);
      setCurrentFiles(updatedFiles);

      if (onUpdate) onUpdate({ content: editedText, files: updatedFiles });

      setEditing(false);
      alert('✅ Arquivo regenerado com sucesso!');
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="editable-response">
      {/* Conteúdo da resposta (editável ou não) */}
      {editing ? (
        <textarea
          className="edit-textarea"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={Math.min(editedText.split('\n').length + 2, 25)}
          placeholder="Edite o texto aqui e clique em 'Regenerar'..."
        />
      ) : null}

      {/* Botões de ação */}
      <div className="response-actions">
        {editing ? (
          <>
            <button
              className="action-btn save"
              onClick={() => {
                // Regenera TODOS os arquivos do mesmo tipo
                if (currentFiles.length > 0) {
                  regenerateFile(currentFiles[0]);
                }
              }}
              disabled={generating}
            >
              {generating ? '⏳ Gerando...' : '🔄 Regenerar arquivo'}
            </button>
            <button
              className="action-btn cancel"
              onClick={() => {
                setEditedText(content);
                setEditing(false);
              }}
              disabled={generating}
            >
              ❌ Cancelar
            </button>
          </>
        ) : (
          <>
            {currentFiles && currentFiles.length > 0 && (
              <button
                className="action-btn edit"
                onClick={() => setEditing(true)}
                title="Editar texto e regenerar arquivo"
              >
                ✏️ Editar texto
              </button>
            )}
          </>
        )}
      </div>

      {/* Lista de arquivos pra download */}
      {currentFiles && currentFiles.length > 0 && (
        <div className="file-downloads">
          <p className="downloads-label">📎 Arquivos gerados:</p>
          {currentFiles.map(file => (
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
      )}
    </div>
  );
}
