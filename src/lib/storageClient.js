// ═══════════════════════════════════════════════════════════════
// STORAGE CLIENT — the swappable interface for file uploads.
// Today: delegates to Base44 UploadPrivateFile / UploadPublicFile.
// Tomorrow: swap to Google Drive API — same method names, no page changes.
// ═══════════════════════════════════════════════════════════════

import { base44 } from '@/api/base44Client';
import { STORAGE_BACKEND } from './backendConfig';

// ── BASE44 STORAGE (current) ──
const base44Storage = {
  uploadPrivate: async (file) => {
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    return { uri: file_uri, public: false };
  },
  uploadPublic: async (file) => {
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    return { url: file_url, public: true };
  },
  signUrl: async (fileUri, expiresIn) => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn || 300 });
    return signed_url;
  },
};

// ── GOOGLE DRIVE STORAGE (uncomment when ready) ──
// Uses the authorized googledrive connector (id: 69db1e5e75a5f8c15c80cf34).
// import { base44 } from '@/api/base44Client';
//
// const driveStorage = {
//   uploadPrivate: async (file) => {
//     const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
//     // 1. Get an upload session from Drive API
//     // 2. POST the file bytes
//     // 3. Return the file ID as the uri
//     const formData = new FormData();
//     formData.append('metadata', new Blob([JSON.stringify({ name: file.name, parents: ['appDataFolder'] })], { type: 'application/json' }));
//     formData.append('file', file);
//     const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${conn.accessToken}` },
//       body: formData,
//     });
//     const data = await res.json();
//     return { uri: `drive://${data.id}`, public: false };
//   },
//   uploadPublic: async (file) => {
//     const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
//     // Same as private but set sharing to public, return webViewLink
//     const formData = new FormData();
//     formData.append('metadata', new Blob([JSON.stringify({ name: file.name })], { type: 'application/json' }));
//     formData.append('file', file);
//     const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${conn.accessToken}` },
//       body: formData,
//     });
//     const data = await res.json();
//     await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ role: 'reader', type: 'anyone' }),
//     });
//     return { url: `https://drive.google.com/uc?id=${data.id}`, public: true };
//   },
//   signUrl: async (fileUri) => {
//     const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
//     const fileId = fileUri.replace('drive://', '');
//     const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
//       headers: { Authorization: `Bearer ${conn.accessToken}` },
//     });
//     return res.url; // or generate a short-lived link
//   },
// };

export const storage = STORAGE_BACKEND === 'base44' ? base44Storage : base44Storage; // swap second arg to driveStorage when ready