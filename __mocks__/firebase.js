const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
    }),
    add: () => Promise.resolve({ id: "mock-id" }),
    where: () => ({
      get: () => Promise.resolve({ forEach: () => {} }),
    }),
  }),
  batch: () => ({
    update: () => {},
    set: () => {},
    delete: () => {},
    commit: () => Promise.resolve(),
  }),
};

const mockStorage = {
  ref: () => ({
    put: () => Promise.resolve(),
    getDownloadURL: () => Promise.resolve("url"),
  }),
};

const firebaseApp = {
  firestore: () => mockFirestore,
  storage: () => mockStorage,
  auth: () => ({
    currentUser: null,
    onAuthStateChanged: () => {},
  }),
};

export default firebaseApp;
export const db = mockFirestore;
export const storage = mockStorage;
