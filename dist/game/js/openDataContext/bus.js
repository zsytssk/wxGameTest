class Bus {
  constructor() {
    this.handlers = {}
  }

  on(eventType, callback) {
    if (!(eventType in this.handlers)) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(callback)
    return this
  }
  emit(eventType, ...args) {
    if (!(eventType in this.handlers)) {
      return this
    }
    this.handlers[eventType].forEach(callback => {
      callback(...args)
    })
    return this
  }
  off(eventType, callback) {
    if (!(eventType in this.handlers)) {
      return this
    }
    const callbacks = this.handlers[eventType]
    for (let i = callbacks.length - 1; i >= 0; i--) {
      if (callbacks[i] === callback) {
        callbacks.splice(i, 1)
      }
    }
    return this
  }
}

module.exports = Bus