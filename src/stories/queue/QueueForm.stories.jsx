import QueueForm from '../../components/queue/QueueForm';

const mockFirebase = {
  firestore: {
    FieldValue: {
      increment: (n) => n,
      arrayUnion: (item) => item
    }
  }
};

const mockDb = {
  collection: () => ({
    doc: () => ({
      update: () => Promise.resolve(),
      set: () => Promise.resolve(),
      onSnapshot: (callback) => {
        callback({
          data: () => ({})
        });
        return () => {}; // Unsubscribe function
      }
    })
  }),
  batch: () => ({
    update: () => null,
    set: () => null,
    commit: () => Promise.resolve()
  })
};

export default {
  title: 'Queue/QueueForm',
  component: QueueForm,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    queue: [],
    queueEnabled: true,
    queueNumber: 42,
    queueCap: 100,
    queueLength: 5,
    locationName: 'Downtown Clinic',
    locationRef: 'clinic-1',
    firebase: mockFirebase,
    db: mockDb,
    textSequence: ['Thanks for joining! You are number {number} in line.']
  },
};

export const QueueDisabled = {
  args: {
    ...Default.args,
    queueEnabled: false
  },
};

export const QueueFull = {
  args: {
    ...Default.args,
    queueLength: 100,
    queueCap: 100
  },
};

export const WithExistingQueue = {
  args: {
    ...Default.args,
    queue: [
      { id: 40, date: Date.now() - 3000000, phone: '1234567890' },
      { id: 41, date: Date.now() - 2000000, phone: '2345678901' },
      { id: 42, date: Date.now() - 1000000, phone: '3456789012' }
    ]
  },
}; 