const Koa = require('koa');
const Router = require('koa-router')
const router = new Router();
const app = new Koa();
const koaBody = require('koa-body')
const axios = require('axios')
const fs = require('fs')
const getAccessToken = require('./support/getAccessToken')
const getSessionKey = require('./support/getSessionKey')
const WXBizDataCrypt = require('./support/WXBizDataCrypt')
const CryptoJS = require('crypto-js')

const config = require('./config')
const APPID = config.APPID
const SECRET = config.SECRET

router
    .post('/onLogin', (ctx, next) => {
        const body = ctx.request.body;
        const js_code = body.code;
        const getSessionKeyUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${js_code}&grant_type=authorization_code`
        return axios.get(getSessionKeyUrl).then(res => {
            const data = res.data;
            const {
                session_key,
                openid
            } = data;
            return new Promise((resolve, reject) => {
                fs.readFile('store/user-session-key.json', 'utf-8', (err, data) => {
                    if (err) throw err;
                    try {
                        const sessionKeys = JSON.parse(data)
                        // 简单判断是否首次登陆 首次登陆赠送50金币
                        const isFirstTimeLogin = !!sessionKeys[openid]
                        sessionKeys[openid] = session_key
                        fs.writeFile('store/user-session-key.json', JSON.stringify(sessionKeys), (err, data) => {
                            if (err) throw err;
                            else {
                                ctx.body = {
                                    openid
                                }
                                if (isFirstTimeLogin) {
                                    resolve(initNewPlayerCoins(openid))
                                } else {
                                    resolve()
                                }
                            }
                        })
                    } catch (err) {
                        console.error(err)
                    }
                });
            })
        })
    })
    .post('/decrypt', (ctx, next) => {
        const body = ctx.request.body;
        const {
            encryptedData,
            iv,
            openid
        } = body
        return new Promise((resolve, reject) => {
            fs.readFile('store/user-session-key.json', 'utf-8', (err, data) => {
                if (err) throw err;
                try {
                    const sessionKeys = JSON.parse(data)
                    const sessionKey = sessionKeys[openid]
                    if (sessionKey) {
                        var pc = new WXBizDataCrypt(APPID, sessionKey)
                        var decryptData = pc.decryptData(encryptedData, iv)
                        ctx.body = decryptData
                        resolve()
                    } else {
                        ctx.body = {
                            ok: false,
                            errCode: -1,    // 未登录
                            errMsg: 'no sessionKey in store'
                        }
                        resolve()
                    }
                } catch (err) {
                    console.error(err)
                }
            });
        })
    })

app
    .use(koaBody())
    .use(router.routes())
    .use(router.allowedMethods());;

// 在端口3000监听:
app.listen(3000);
console.log('app started at port 3000...');




// 玩家首次登录游戏赠送50金币
function initNewPlayerCoins(openid) {
    const interactiveData = {
        kv_list: [{
            key: '1',
            value: '50'
        }]
    }
    return getSessionKey(openid).then(sessionKey => {
        const signature = CryptoJS.HmacSHA256(JSON.stringify(interactiveData), sessionKey).toString();
        return getAccessToken().then(ACCESS_TOKEN => {
            const setuserinteractivedataUrl =
                `https://api.weixin.qq.com/wxa/setuserinteractivedata?access_token=${ACCESS_TOKEN}&signature=${signature}&openid=${openid}&sig_method=hmac_sha256`
            return axios.post(setuserinteractivedataUrl, interactiveData).then(res => {
                if (res.data && res.data.errcode === 0) {
                    // 成功 
                    // code...
                    return res.data
                } else {
                    // 失败
                    // code...
                    return res.data
                }
            })
        });
    })
}