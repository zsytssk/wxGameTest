const DynamicCanvas = require('./dynamic-canvas')

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = wx.createImage()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

const dySharedCanvas = new DynamicCanvas({root: true})
const dySharedCanvasContext = dySharedCanvas.getContext('2d')

class RankList {
  constructor() {
    this.globalVar = {
      zoomRatio: null,
      selfOpenid: null,
      selfCoinsNum: null,
      giftCountRemaining: null,
      friendsDataList: null,
      initGiftCountRemaining: 5,
      giftStorageKey: new Date().toDateString()
    }

    this.offsets = {
      sharedCanvasOffsetX: dySharedCanvas.width / 2,
      sharedCanvasOffsetY: dySharedCanvas.height / 2,
      giftCoinsBtnOffsetWidth: 80,
      giftCoinsBtnOffsetHeight: 80,
      giftCoinsBtnOffsetX: 270,
      giftCoinsBtnOffsetY: 10,
      giftCoinsImgOffsetWidth: 30,
      giftCoinsImgOffsetHeight: 30,
      giftCoinsImgOffsetX: 10,
      giftCoinsImgOffsetY: 10,
      giftCoinsTextOffsetX: 11,
      giftCoinsTextOffsetY: 45,
      friendListItemOffsetWidth: dySharedCanvas.width,
      friendListItemOffsetHeight: 100,
      selfCoinsAreaOffsetWidth: dySharedCanvas.width,
      selfCoinsAreaOffsetHeight: 40,
      selfCoinsTextOffsetX: 10,
      selfCoinsTextOffsetY: 10,
      friendAvatarOffsetWidth: 50,
      friendAvatarOffsetHeight: 50,
      friendAvatarOffsetX: 10,
      friendAvatarOffsetY: 20,
      friendNicknameOffsetX: 80,
      friendNicknameOffsetY: 20,
      friendLevelOffsetX: 80,
      friendLevelOffsetY: 54,
    }

    this.bindMessageListener()
    this.drawBackground()
    this.bindTouchEventListener()
  }

  drawBackground() {
    dySharedCanvasContext.fillStyle = '#eee';
    dySharedCanvasContext.fillRect(0, 0, dySharedCanvas.width, dySharedCanvas.height)
  }

  bindMessageListener() {
    const globalVar = this.globalVar
    wx.onMessage(data => {
      if (data.zoomRatio) {
        globalVar.zoomRatio = data.zoomRatio
      } else if (data.selfOpenid) {
        globalVar.selfOpenid = data.selfOpenid
        this.initFriendsData()
      } else if (typeof data.selfCoinsNum === 'number') {
        globalVar.selfCoinsNum = data.selfCoinsNum
        this.drawSelfCoins()
      }
    })
  }

  bindTouchEventListener() {
    wx.onTouchEnd(this.handleGiftCoinsTouchEvent.bind(this))
  }

  initFriendsData() {
    const globalVar = this.globalVar
    wx.getFriendCloudStorage({
      keyList: ['score', globalVar.giftStorageKey],
      success: ({ data }) => {
        globalVar.friendsDataList = data
        // 初始化剩余赠送次数
        const self = globalVar.friendsDataList.find(item => item.openid === globalVar.selfOpenid)
        let selfGiftData = self.KVDataList.find(item => item.key === globalVar.giftStorageKey)
        if (selfGiftData) {
          selfGiftData = JSON.parse(selfGiftData.value)
          globalVar.giftCountRemaining = globalVar.initGiftCountRemaining - selfGiftData.sendCount
        } else {
          globalVar.giftCountRemaining = globalVar.initGiftCountRemaining
        }

        this.drawRankList()
        this.drawGiftCountRemaining()
      }
    })
  }

  drawGiftCountRemaining() {
    this.drawSelfCoins()
  }

  drawRankList() {
    const offsets = this.offsets
    this.globalVar.friendsDataList.forEach((item, index) => {
      const dyFriendItemDataCanvas = this.drawFriendItemData(
        item,
        offsets.friendListItemOffsetWidth,
        offsets.friendListItemOffsetHeight
      )
      dySharedCanvasContext.drawCanvas(
        dyFriendItemDataCanvas,
        0,
        offsets.selfCoinsAreaOffsetHeight + offsets.friendListItemOffsetHeight * index,
        offsets.friendListItemOffsetWidth,
        offsets.friendListItemOffsetHeight
      )
    })
  }

  handleGiftCoinsTouchEvent(e) {
    const toFriendIndex = this.getFriendIndexByTouchEvent(e)
    if (toFriendIndex >= 0) {
      const toOpenid = this.globalVar.friendsDataList[toFriendIndex].openid
      if (toOpenid !== this.globalVar.selfOpenid) {
        wx.modifyFriendInteractiveStorage({
          key: '1',
          opNum: 1,
          operation: 'add',
          toUser: toOpenid,
          success: (res) => { 
            // 后台验证通过
            this.globalVar.giftCountRemaining --
            this.drawGiftCountRemaining()
          },
          fail: (err) => {
            // 后台验证不通过
            // other code ...
          }
        })
      }
    }
  }

  getFriendIndexByTouchEvent(e) {
    const touch = e.changedTouches[0]
    const clientX = touch.clientX
    const clientY = touch.clientY
    const touchX = clientX * this.globalVar.zoomRatio
    const touchY = clientY * this.globalVar.zoomRatio
    let toUserIndex = -1
    this.globalVar.friendsDataList.some((item, index) => {
      const offsets = this.offsets
      if (
        touchX >= offsets.sharedCanvasOffsetX + offsets.giftCoinsBtnOffsetX &&
        touchX <= offsets.sharedCanvasOffsetX + offsets.giftCoinsBtnOffsetX + offsets.giftCoinsBtnOffsetWidth &&
        touchY >= offsets.sharedCanvasOffsetY + offsets.selfCoinsAreaOffsetHeight + (index * offsets.friendListItemOffsetHeight) + offsets.giftCoinsBtnOffsetY &&
        touchY <= offsets.sharedCanvasOffsetY + offsets.selfCoinsAreaOffsetHeight + (index * offsets.friendListItemOffsetHeight) + offsets.giftCoinsBtnOffsetY + offsets.giftCoinsBtnOffsetHeight
      ) {
        toUserIndex = index
        return true
      }
    })
    return toUserIndex
  }

  drawSelfCoins() {
    const offsets = this.offsets
    dySharedCanvasContext.fillStyle = '#eee';
    dySharedCanvasContext.fillRect(
      0,
      0,
      offsets.selfCoinsAreaOffsetWidth,
      offsets.selfCoinsAreaOffsetHeight
    )
    dySharedCanvasContext.fillStyle = "#555"
    dySharedCanvasContext.font = "20px arial"
    dySharedCanvasContext.textBaseline = 'top'
    dySharedCanvasContext.fillText(
      `金币数量：${this.globalVar.selfCoinsNum}，今天还可以赠送${this.globalVar.giftCountRemaining}次`,
      this.offsets.selfCoinsTextOffsetX,
      this.offsets.selfCoinsTextOffsetY
    )
  }

  drawFriendItemData(userData, width, height) {
    const offsets = this.offsets
    const dyCanvas = new DynamicCanvas({width, height})
    const dyCtx = dyCanvas.getContext('2d')
    const {
      nickname,
      KVDataList,
      avatarUrl,
      openid
    } = userData
    // 头像
    loadImage(avatarUrl).then(avatarImg => {
      dyCtx.drawCanvas(
        avatarImg,
        offsets.friendAvatarOffsetX,
        offsets.friendAvatarOffsetY,
        offsets.friendAvatarOffsetWidth,
        offsets.friendAvatarOffsetHeight
      )
      dyCanvas.refresh()
    })
    // 昵称
    dyCtx.fillStyle = '#555'
    dyCtx.font = "20px arial";
    dyCtx.textBaseline = 'top'
    dyCtx.fillText(
      nickname,
      offsets.friendNicknameOffsetX,
      offsets.friendNicknameOffsetY
    )
    // 等级
    const score = KVDataList[0];
    const { key, value } = score
    dyCtx.fillStyle = '#888'
    dyCtx.font = "16px arial";
    dyCtx.textBaseline = 'top'
    dyCtx.fillText(
      'lv.' + value,
      offsets.friendLevelOffsetX,
      offsets.friendLevelOffsetY
    )
    // 送金币按钮
    if (this.globalVar.selfOpenid && this.globalVar.selfOpenid !== openid) {
      const dyGiftCoinsBtnCanvas = this.drawGiftCoinsBtn(
        offsets.giftCoinsBtnOffsetWidth,
        offsets.giftCoinsBtnOffsetHeight
      )
      dyCtx.drawCanvas(
        dyGiftCoinsBtnCanvas,
        offsets.giftCoinsBtnOffsetX,
        offsets.giftCoinsBtnOffsetY,
        offsets.giftCoinsBtnOffsetWidth,
        offsets.giftCoinsBtnOffsetHeight
      )
    }

    return dyCanvas
  }

  drawGiftCoinsBtn(width, height) {
    const offsets = this.offsets
    const dcanvas = new DynamicCanvas({width, height})
    const dctx = dcanvas.getContext('2d')
    // 金币图片
    loadImage('images/coin.png').then(coinImg => {
      dctx.drawCanvas(
        coinImg,
        offsets.giftCoinsImgOffsetX,
        offsets.giftCoinsImgOffsetY,
        offsets.giftCoinsImgOffsetWidth,
        offsets.giftCoinsImgOffsetHeight
      )
      dcanvas.refresh()
    })
  // “赠送”文字
    dctx.fillStyle = '#888'
    dctx.font = "14px arial";
    dctx.textBaseline = 'top'
    dctx.fillText(
      '赠送',
      offsets.giftCoinsTextOffsetX,
      offsets.giftCoinsTextOffsetY
    )
    return dcanvas
  }
}

new RankList()
