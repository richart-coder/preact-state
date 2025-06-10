const eventBus = {
  events: new Map(),

  sub(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => {
      this.events.get(event)?.delete(callback);
    };
  },

  pub(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  },
};

export default eventBus;
