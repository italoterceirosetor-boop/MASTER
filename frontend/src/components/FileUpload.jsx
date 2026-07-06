import React, { useRef } from 'react';

// Componente botão de anexo + previews dos arquivos
export default function FileUpload({ files, setFiles, disabled }) {
  const inputRef = useRef(null);

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleChange(e) {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo
  }

  function addFiles(newFiles) {
    const validFiles = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.csv', '.txt', '.docx'];
      return allowed.includes(ext);
    });

    // Evita duplicados
    const filtered = validFiles.filter(f =>
      !files.some(existing => existing.name === f.name && existing.size === f.size)
    );

    setFiles([...files, ...filtered]);
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
    if (['pdf'].includes(ext)) return '📄';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '🖼️';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    if (['txt'].includes(ext)) return '📝';
    if (['docx'].includes(ext)) return '📃';
    return '📎';
  }

  return (
    <div className="file-upload">
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
        title="Anexar arquivo"
      >
        📎
      </button>

      {files.length > 0 && (
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
                title="Remover"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
