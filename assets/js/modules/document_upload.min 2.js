import { handleError, handleFirebaseError } from './error-handler.js';
import { storage, showError } from './firebase.js';
let uploadedFiles = [];
const MAX_FILE_SIZE = 5242880,
  ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
function handleFileSelect(e) {
  const t = e.target.files;
  if (document.getElementById('uploadedFiles'))
    for (let e of t)
      e.size > 5242880
        ? showNotification(`File too large: ${e.name}. Maximum size is 5MB.`, 'error')
        : ALLOWED_TYPES.includes(e.type)
          ? (uploadedFiles.push(e), displayFile(e))
          : showNotification(
              `Invalid file type: ${e.name}. Allowed types: PDF, JPG, PNG, DOC`,
              'error'
            );
  else handleError(new Error('Upload container not found'), 'handleFileSelect');
}
function displayFile(e) {
  const t = document.createElement('div');
  (t.className = 'file-item'), (t.id = `file-${e.name.replace(/[^a-z0-9]/gi, '_')}`);
  const o = document.createElement('div');
  o.className = 'file-info';
  const i = document.createElement('i');
  i.className = e.type.startsWith('image/') ? 'fas fa-image' : 'fas fa-file-alt';
  const a = document.createElement('span');
  a.textContent = e.name;
  const l = document.createElement('span');
  (l.className = 'file-size'), (l.textContent = formatFileSize(e.size));
  const n = document.createElement('div');
  (n.className = 'upload-progress'), (n.style.display = 'none');
  const s = document.createElement('button');
  (s.className = 'remove-file'),
    (s.innerHTML = '<i class="fas fa-times"></i>'),
    (s.onclick = () => removeFile(e)),
    o.appendChild(i),
    o.appendChild(a),
    o.appendChild(l),
    t.appendChild(o),
    t.appendChild(n),
    t.appendChild(s),
    document.getElementById('uploadedFiles').appendChild(t);
}
function removeFile(e) {
  uploadedFiles = uploadedFiles.filter(t => t !== e);
  const t = document.getElementById(`file-${e.name.replace(/[^a-z0-9]/gi, '_')}`);
  t && t.remove();
}
async function uploadFiles(e) {
  if (!e) throw new Error('User ID is required for file upload');
  const t = [],
    o = storage.ref(),
    i = [];
  for (let a of uploadedFiles) {
    const l = o.child(`service-requests/${e}/${Date.now()}-${a.name}`),
      n = document.querySelector(`#file-${a.name.replace(/[^a-z0-9]/gi, '_')} .upload-progress`);
    n && (n.style.display = 'block');
    const s = l.put(a);
    s.on(
      'state_changed',
      e => {
        const t = (e.bytesTransferred / e.totalBytes) * 100;
        n && (n.style.width = `${t}%`);
      },
      e => {
        handleFirebaseError(e), n && (n.style.display = 'none');
      }
    ),
      i.push(
        s.then(async e => {
          const o = await e.ref.getDownloadURL();
          t.push({
            name: a.name,
            url: o,
            type: a.type,
            size: a.size,
            uploadedAt: new Date().toISOString(),
          });
        })
      );
  }
  try {
    return await Promise.all(i), t;
  } catch (e) {
    throw (handleFirebaseError(e), e);
  }
}
function formatFileSize(e) {
  if (0 === e) return '0 Bytes';
  const t = Math.floor(Math.log(e) / Math.log(1024));
  return parseFloat((e / Math.pow(1024, t)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][t];
}
function showNotification(e, t = 'info') {
  const o = document.createElement('div');
  (o.className = `notification ${t}`),
    (o.textContent = e),
    document.body.appendChild(o),
    setTimeout(() => {
      o.remove();
    }, 5e3);
}
(window.handleFileSelect = handleFileSelect),
  (window.uploadFiles = uploadFiles),
  (window.removeFile = removeFile);
export { handleFileSelect, displayFile, removeFile, uploadFiles, formatFileSize, showNotification };
