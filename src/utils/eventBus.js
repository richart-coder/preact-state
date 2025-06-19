class EventBus {
  constructor() {
    this.eventHandlers = new Map();
  }

  on(eventType, targetHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(targetHandler);
  }

  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  off(eventType, targetHandler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(targetHandler);
    }
  }

  getHandlers(eventType) {
    return this.eventHandlers.get(eventType);
  }
}

export default EventBus;
