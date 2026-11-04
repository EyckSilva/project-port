export async function saveDocument(id: string, file: File) {
  return documentDb("readwrite", (store) => store.put(file, id));
}
export async function readDocument(id: string): Promise<Blob | undefined> {
  return documentDb("readonly", (store) => store.get(id)) as Promise<Blob | undefined>;
}
async function documentDb(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mentary-documents", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onerror = () => reject(Error("Armazenamento de documentos indisponível."));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("files", mode);
      const job = operation(tx.objectStore("files"));
      tx.oncomplete = () => {
        resolve(job.result);
        db.close();
      };
      tx.onerror = () => {
        reject(Error("Não foi possível preservar o documento."));
        db.close();
      };
    };
  });
}
