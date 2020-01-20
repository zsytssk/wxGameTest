const canvas = wx.createCanvas();
const context = canvas.getContext("2d");
const openDataContext = wx.getOpenDataContext();
const sharedCanvas = openDataContext.canvas;

// 基准分辨率的宽
const resolution = 720;
// 放大倍数   （基准分辨率的宽/设备宽）
const zoomRatio = resolution / canvas.width;
// 设备宽高比
const aspectRatio = canvas.width / canvas.height;
// 设置画布分辨率
canvas.width = resolution;
canvas.height = canvas.width / aspectRatio;
// 设置子域画布的分辨率
const sharedCanvasWidth = canvas.width / 2;
const sharedCanvasHeight = canvas.height / 2;
sharedCanvas.width = sharedCanvasWidth;
sharedCanvas.height = sharedCanvasHeight;
// 后台接口
const baseUrl = "http://localhost:3000";
const onLoginUrl = `${baseUrl}/onLogin`;
const decryptUrl = `${baseUrl}/decrypt`;

class Game {
  constructor() {
    this.start();
    this.initUserInteractiveStorage();
    this.initOpenDataContextData();
  }

  start() {
    // 背景
    this.drawBackGround();
    // ‘好友列表’标题
    this.drawTitle();
    // 开始循环渲染子域
    this.bindLoop = this.loop.bind(this);
    GameGlobal.requestAnimationFrame(this.bindLoop);
  }

  drawBackGround() {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawTitle() {
    context.fillStyle = "#000";
    context.font = "30px arial";
    context.fillText(
      "好友列表",
      (canvas.width - sharedCanvasWidth) / 2,
      (canvas.height - sharedCanvasHeight) / 2 - 20
    );
  }

  loop() {
    this.renderSharedCanvas();
    GameGlobal.requestAnimationFrame(this.bindLoop);
  }

  initUserInteractiveStorage() {
    // 获取用户的加密交互数据
    wx.getUserInteractiveStorage({
      keyList: ["1"],
      success: ({ encryptedData, iv }) => {
        // 使用用户的openid对交互数据解密
        this.getSelfOpenId()
          .then(openid => {
            console.log("openid", openid);
            return this.updateSession().then(() => {
              return this.decrypt({
                encryptedData,
                iv,
                openid
              });
            });
          })
          // 绘制交互数据
          .then(decryptData => {
            const kvList = decryptData["kv_list"];
            if (kvList && kvList[0]) {
              const selfCoinsNum = Number(kvList[0].value);
              this.drawMyCoins(selfCoinsNum);
            }
          });
      }
    });
  }

  initOpenDataContextData() {
    // 向开放数据域传递用户openid
    this.getSelfOpenId().then(selfOpenId =>
      openDataContext.postMessage({
        selfOpenid: selfOpenId
      })
    );
    // 向开放数据域传递像素宽度与设备宽度的比率
    openDataContext.postMessage({
      zoomRatio
    });
  }

  getSelfOpenId() {
    return new Promise((resolve, reject) => {
      wx.getStorage({
        key: "openid",
        success: res => {
          const openid = res.data;
          resolve(openid);
        },
        fail: err => {
          resolve(this.login());
        }
      });
    });
  }

  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success(res) {
          if (res.code) {
            wx.request({
              method: "POST",
              url: onLoginUrl,
              data: {
                code: res.code
              },
              success: function(res) {
                wx.setStorage({
                  key: "openid",
                  data: res.data.openid,
                  success: () => {
                    resolve(res.data.openid);
                  }
                });
              }
            });
          } else {
            console.log("登录失败！" + res.errMsg);
          }
        }
      });
    });
  }

  updateSession() {
    return new Promise((resolve, reject) => {
      wx.checkSession({
        success() {
          resolve(true);
        },
        fail: () => {
          resolve(this.login());
        }
      });
    });
  }

  decrypt({ encryptedData, iv, openid }) {
    return new Promise((resolve, reject) => {
      wx.request({
        method: "POST",
        url: decryptUrl,
        data: {
          encryptedData,
          iv,
          openid
        },
        success: res => {
          if (res.data.errCode === -1) {
            // 后台sessionKey失效，重新登陆
            resolve(
              this.login().then(() => {
                return this.decrypt({ encryptedData, iv, openid });
              })
            );
          } else {
            resolve(res.data);
          }
        }
      });
    });
  }

  drawMyCoins(selfCoinsNum) {
    openDataContext.postMessage({
      selfCoinsNum
    });
  }

  renderSharedCanvas() {
    context.fillStyle = "#eee";
    context.fillRect(
      (canvas.width - sharedCanvasWidth) / 2,
      (canvas.height - sharedCanvasHeight) / 2,
      sharedCanvasWidth,
      sharedCanvasHeight
    );
    context.drawImage(
      sharedCanvas,
      (canvas.width - sharedCanvasWidth) / 2,
      (canvas.height - sharedCanvasHeight) / 2,
      sharedCanvasWidth,
      sharedCanvasHeight
    );
  }
}

new Game();
