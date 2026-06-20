// A simple in-memory store for QR uploads
const store = new Map();

// Clear items older than 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 60 * 1000);

module.exports = {
  saveImage: (uploadId, base64Data) => {
    store.set(uploadId, {
      data: base64Data,
      timestamp: Date.now()
    });
  },
  getImage: (uploadId) => {
    const item = store.get(uploadId);
    return item ? item.data : null;
  },
  removeImage: (uploadId) => {
    store.delete(uploadId);
  }
};
