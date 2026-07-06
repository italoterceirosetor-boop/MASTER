import React, { useRef, useEffect } from 'react';

// Componente botão de anexo + previews dos arquivos
// Suporta: clique para selecionar, Ctrl+V para colar print
export default function FileUpload({ files, setFiles, disabled }) {
  const inputRef = useRef(null);

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleChange(e) {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = '';
  }

  // Listener pra Ctrl+V (colar imagem)
  useEffect(() => {
    function handlePaste(e) {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Gera nome melhor pra imagem colada
            if (file.name === 'image.png' && file.type.startsWith('image/')) {
              const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
              const renamed = new File([file], `print-${timestamp}.png`, { type: file.type });
              pastedFiles.push(renamed);
            } else {
              pastedFiles.push(file);
            }
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [files, disabled]);

  function addFiles(newFiles) {
    const validFiles = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.csv', '.txt', '.docx'];
      return allowed.includes(ext);
    });

    const filtered = validFiles.filter(f =>
      !files.some(existing => existing.name === f.name && existing.size === f.size)
    );

    if (filtered.length > 0) {
      setFiles([...files, ...filtered]);
    }
  }

  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function getIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '🖼️';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    if (ext === 'txt') return '📝';
    if (ext === 'docx') return '📃';
    return '📎';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.txt,.docx"
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className="attach-btn"
        onClick={handleClick}
        disabled={disabled}
        title="Anexar arquivo (ou Ctrl+V para colar print)"
      >
        📎
      </button>
    </>
  );
}

// Componente separado pra mostrar os previews ACIMA do input
export function FilePreviews({ files, setFiles, disabled }) {
  if (files.length === 0) return null;

  function removeFile(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function getIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '🖼️';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    if (ext === 'txt') return '📝';
    if (ext === 'docx') return '📃';
    return '📎';
  }

  return (
    <div className="file-previews">
      {files.map((file, i) => (
        <div key={i} className="file-chip">
          <span className="file-icon">{getIcon(file.name)}</span>
          <span className="file-name" title={file.name}>
            {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
          </span>
          <span className="file-size">{formatSize(file.size)}</span>
          <button
            type="button"
            className="file-remove"
            onClick={() => removeFile(i)}
            disabled={disabled}
            title="Remover"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
