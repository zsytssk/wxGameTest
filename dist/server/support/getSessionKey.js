const fs = require('fs')

module.exports = function getSessionKey(openid) {
    return new Promise((resolve, reject) => {
        fs.readFile('store/user-session-key.json', 'utf-8', (err, data) => {
            if (err) throw err;
            try {
                const sessionKeys = JSON.parse(data)
                resolve(sessionKeys[openid])
            } catch (err) {
                console.err(err)
            }
        });
    })
}