const Bus = require('./bus')

class DynamicCanvas {
    constructor({width, height, root} = {}) {
      if (root) {
        this._canvas = wx.getSharedCanvas()
      } else {
        this._canvas = wx.createCanvas()
      }
      this.bus = new Bus()
      if (
        typeof width === 'number' &&
        width > 0 &&
        typeof height === 'number' &&
        height > 0
      ) {
        this._canvas.width = width
        this._canvas.height = height
      }
    }
  
    get width() {
      return this._canvas.width
    }
  
    get height() {
      return this._canvas.height
    }
  
    set width(val) {
      this._canvas.width = val
      return this._canvas.width
    }
  
    set height(val) {
      this._canvas.height = val
      return this._canvas.height
    }
  
    getContext(...rest) {
      this._ctx = this._canvas.getContext(...rest)
      this._ctx.drawCanvas = this.drawCanvas.bind(this)
      // this._ctx.refresh = this.refresh.bind(this)
      return this._ctx
    }
  
    refresh() {
      this.bus.emit('refresh')
    }
  
    drawCanvas(canvas, x, y, w, h) {
      let rawCanvas = canvas
      if (canvas instanceof DynamicCanvas) {
        rawCanvas = canvas._canvas
        canvas.bus.on('refresh', () => {
          this._ctx.drawImage(
            rawCanvas,
            x, y, w, h
          )
        })
      }
      this._ctx.drawImage(
        rawCanvas,
        x, y, w, h
      )
      return this
    }
  }

  module.exports = DynamicCanvas