const config = require('../config')
const APPID = config.APPID
const SECRET = config.SECRET

const axios = require('axios')
const fs = require('fs')
const path = require('path')

module.exports = function(ctx, next) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, '../store/global-access-token.json'), 'utf-8', (err, data) => {
            if (data) {
                try {
                    const accessTokenMsg = JSON.parse(data);
                    const {
                        access_token,
                        expires
                    } = accessTokenMsg
                    if (access_token && expires > Date.now()) {
                        resolve(access_token)
                    } else {
                        resolve(applyAccessToken())
                    }
                } catch (err) {
                    reject(err)
                }
            } else {
                resolve(applyAccessToken())
            }
        })
    })
}

function applyAccessToken() {
    return new Promise((resolve, reject) => {
        let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`
        return axios(url).then(res => {
            const newAccessTokenMsg = res.data
            console.log('newAccessTokenMsg', newAccessTokenMsg)
            fs.writeFile(
                path.join(__dirname, '../store/global-access-token.json'),
                JSON.stringify({
                    access_token: newAccessTokenMsg.access_token,
                    expires: (newAccessTokenMsg.expires_in * 1000) + Date.now()
                }),
                () => {
                    resolve(newAccessTokenMsg.access_token)  
                }
            )
         })
    })
}