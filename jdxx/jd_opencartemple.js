/*
测试开卡
TG：https://t.me/HarbourToulu
新增开卡脚本
一次性脚本
邀请一人10豆 上限20左右
https://lzdz-isv.isvjcloud.com/dingzhi/bd/common/activity/3071640?activityId=90322060104&shareUuid=d8ea880982534645b5372bbe9a275886&adsource=null&shareuserid4minipg=0JNwymG0n/7MOPkHzYrG4KuPlrbwajr+mlKSAUQGJeinh9LA4YCEcFb8KdjJBCTv&shopid=undefined
cron "1 1 1 1 1 1" jd_opencartemple.js
*/

const $ = new Env('6.1~6.18 618限定 和你在一起为爱而购')
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';

let opencard_addSku = "true"
let opencard = "true"
let openwait = "2"
let opencard_draw = "0"
let cookiesArr = [], cookie = '';

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

allMessage = ""
message = ""
$.hotFlag = false
$.outFlag = false
$.activityEnd = false
let lz_jdpin_token_cookie =''
let activityCookie =''
!(async () => {
    if ($.isNode()) {
        if(opencard+"" != "true"){
            console.log('如需执行脚本请设置环境变量[opencard135]为"true"')
        }
        if(opencard+"" != "true"){
            return
        }
    }
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
            "open-url": "https://bean.m.jd.com/"
        });
        return;
    }
    $.activityId = '90322060104' #改此处

    let authorCodeList = [
        'd8ea880982534645b5372bbe9a275886',
        '3d8b17af51604d6997e6154f56ebb46d',
    ]; #改此处
    $.shareUuid = authorCodeList[random(0, authorCodeList.length)];
    console.log(`入口:\nhttps://lzdz-isv.isvjcloud.com/dingzhi/bd/common/activity?activityId=${$.activityId}&shareUuid=${$.shareUuid}`)

    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            message = ""
            $.bean = 0
            $.hotFlag = false
            $.nickName = '';
            console.log(`\n\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            await getUA()
            await run();
            if(i == 0 && !$.actorUuid) break
            if($.outFlag || $.activityEnd) break
        }
    }
    if($.outFlag) {
        let msg = '此ip已被限制，请过10分钟后再执行脚本'
        $.msg($.name, ``, `${msg}`);
        if ($.isNode()) await notify.sendNotify(`${$.name}`, `${msg}`);
    }
    if(allMessage){
        $.msg($.name, ``, `${allMessage}`);
        // if ($.isNode()) await notify.sendNotify(`${$.name}`, `${allMessage}`);
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


async function run() {
    try {
        lz_jdpin_token_cookie = ''
        $.Token = ''
        $.Pin = ''
        let flag = false
        await takePostRequest('isvObfuscator');
        if($.Token == ''){
            console.log('获取[token]失败！')
            return
        }
        await getCk()
        if (activityCookie == '') {
            console.log(`获取cookie失败`); return;
        }
        if($.activityEnd === true){
            console.log('活动结束')
            return
        }
        if($.outFlag){
            console.log('此ip已被限制，请过10分钟后再执行脚本\n')
            return
        }
        await takePostRequest('getSimpleActInfoVo');
        await takePostRequest('getMyPing');
        if(!$.Pin){
            console.log('获取[Pin]失败！')
            return
        }
        await takePostRequest('accessLogWithAD');
        await takePostRequest('getUserInfo');
        await takePostRequest('activityContent');

        if($.hotFlag) return
        if(!$.actorUuid){
            console.log('获取不到[actorUuid]退出执行，请重新执行')
            return
        }

        await takePostRequest('myinfo');

        //一键关注店铺
        if ($.followShop !=1) {
            await $.wait(1500);
            await takePostRequest('followshop');
        }

        await $.wait(1500);
        $.openList = [61055,780712,10584915,11969612,1000001389,1000001638,1000003005,1000003248,1000004065,1000008901,1000016184,1000090827,1000363947];

        console.log(`openCardStatus:${$.openCardStatus}`);
        $.allOpenCard =  ($.openCardStatus == 3 || $.openCardStatus == 0) ? true : false;

        if($.allOpenCard == false){
            console.log('开卡任务')
            for(let ii=0; ii< $.openList.length; ii++){
                $.openCard = false
                flag = true
                $.shopactivityId = ''
                $.joinVenderId = $.openList[ii];
                console.log($.joinVenderId);
                await getshopactivityId()
                for (let i = 0; i < Array(2).length; i++) {
                    if (i > 0) console.log(`第${i}次 重新开卡`)
                    await joinShop();
                    await $.wait(1000);
                    if ($.errorJoinShop.indexOf('活动太火爆，请稍后再试') == -1) {
                        break
                    }
                }
                if ($.errorJoinShop.indexOf('活动太火爆，请稍后再试') > -1) {
                    console.log("开卡失败❌ ，重新执行脚本")
                    allMessage += `【账号${$.index}】开卡失败❌ ，重新执行脚本\n`
                } else {
                    $.joinStatus = true
                }
                await takePostRequest('activityContent');
                await $.wait(2500)
            }
        }else{
            console.log('已全部开卡')
        }

        $.yaoqing = true
        await takePostRequest('邀请');
        if($.yaoqing){
            await takePostRequest('助力');
        }

        if(flag){
            await takePostRequest('activityContent');
        }

        await $.wait(parseInt(Math.random() * 1000 + 2000, 10))
        if($.outFlag){
            console.log('此ip已被限制，请过10分钟后再执行脚本\n')
            return
        }
        console.log($.actorUuid)
        console.log(`当前助力:${$.shareUuid}`)
        if($.index == 1){
            $.shareUuid = $.actorUuid
            console.log(`后面的号都会助力:${$.shareUuid}`)
        }
        await $.wait(parseInt(Math.random() * 1000 + 5000, 10))
        if(flag) await $.wait(parseInt(Math.random() * 1000 + 10000, 10))
        if(openwait){
            if($.index != cookiesArr.length){
                console.log(`等待${openwait}秒`)
                await $.wait(parseInt(openwait, 10) * 1000)
            }
        }else{
            if($.index % 3 == 0) console.log('休息1分钟，别被黑ip了\n可持续发展')
            if($.index % 3 == 0) await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
        }
    } catch (e) {
        console.log(e)
    }
}

async function takePostRequest(type) {
    if($.outFlag) return
    let domain = 'https://lzdz-isv.isvjcloud.com';
    let body = ``;
    let method = 'POST'
    let admJson = ''
    switch (type) {
        case 'isvObfuscator':
            url = `https://api.m.jd.com/client.action?functionId=isvObfuscator`;
            body = `body=%7B%22url%22%3A%22https%3A//lzdz1-isv.isvjcloud.com%22%2C%22id%22%3A%22%22%7D&uuid=ab640b5dc76b89426f72115f5b2e06e934a5fbe9&client=apple&clientVersion=10.1.4&st=1650250640876&sv=102&sign=7ea66dcb2969eff53c43b5b8a4937dbe`;
            break;
        case 'getSimpleActInfoVo':
            url = `${domain}/dz/common/getSimpleActInfoVo`;
            body = `activityId=${$.activityId}`;
            break;
        case 'getMyPing':
            url = `${domain}/dingzhi/bd/common/getMyPing`;
            body = `userId=${$.shopId || $.venderId || ''}&token=${$.Token}&fromType=APP`;
            break;
        case 'accessLogWithAD':
            url = `${domain}/common/accessLogWithAD`;
            let pageurl = `${domain}/dingzhi/bd/common/activity?activityId=${$.activityId}&shareUuid=${$.shareUuid}`
            body = `venderId=${$.shopId || $.venderId || ''}&code=99&pin=${encodeURIComponent($.Pin)}&activityId=${$.activityId}&pageUrl=${encodeURIComponent(pageurl)}&subType=app&adSource=`
            break;
        case 'getUserInfo':
            url = `${domain}/wxActionCommon/getUserInfo`;
            body = `pin=${encodeURIComponent($.Pin)}`;
            break;
        case 'activityContent':
            url = `${domain}/dingzhi/union/cardgame2205/activityContent`;
            body = `activityId=${$.activityId}&pin=${encodeURIComponent($.Pin)}&pinImg=${encodeURIComponent($.attrTouXiang)}&nick=${encodeURIComponent($.nickname)}&cjyxPin=&cjhyPin=&shareUuid=${$.shareUuid}`
            break;
        case 'myinfo':
            url = `${domain}/dingzhi/union/cardgame2205/myInfo?_=${Date.now()}`;
            body = `activityId=${$.activityId}&pin=${encodeURIComponent($.Pin)}&uid=${$.actorUuid}`;
            break;
        case 'sign':
        case 'followshop':
            url = `${domain}/dingzhi/union/cardgame2205/doTask?_=${Date.now()}`;
            body = `taskId=followshop&param=&activityId=${$.activityId}&pin=${encodeURIComponent($.Pin)}&uid=${$.actorUuid}`
            break;
        case '邀请':
        case '助力':
            if(type == '助力'){
                url = `${domain}/dingzhi/union/cardgame2205/helpFriend?_=${Date.now()}`;
            }
            body = `activityId=${$.activityId}&pin=${encodeURIComponent($.Pin)}&shareUuid=${$.shareUuid}&uid=${$.actorUuid}`
            break;
        default:
            console.log(`错误${type}`);
    }
    await $.wait(500);

    let myRequest = getPostRequest(url, body, method);
    return new Promise(async resolve => {
        $.post(myRequest, (err, resp, data) => {
            try {
                setActivityCookie(resp)
                if (err) {
                    if(resp && typeof resp.statusCode != 'undefined'){
                        if(resp.statusCode == 493){
                            console.log('此ip已被限制，请过10分钟后再执行脚本\n')
                            $.outFlag = true
                        }
                    }
                    console.log(`${$.toStr(err,err)}`)
                    console.log(`${type} API请求失败，请检查网路重试`)
                } else {
                    dealReturn(type, data);
                }
            } catch (e) {
                // console.log(data);
                console.log(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

async function dealReturn(type, data) {
    let res = ''
    try {
        if(type != 'accessLogWithAD' || type != 'drawContent'){
            if(data){
                res = JSON.parse(data);
            }
        }
    } catch (e) {
        console.log(`${type} 执行任务异常`);
        // console.log(data);
        $.runFalag = false;
    }
    try {
        switch (type) {
            case 'isvObfuscator':
                if(typeof res == 'object'){
                    if(res.errcode == 0){
                        if(typeof res.token != 'undefined') $.Token = res.token
                    }else if(res.message){
                        console.log(`isvObfuscator ${res.message || ''}`)
                    }else{
                        console.log(data)
                    }
                }else{
                    console.log(data)
                }
                break;
            case 'getSimpleActInfoVo':
                if(typeof res == 'object'){
                    if(res.result && res.result === true){
                        if(typeof res.data.shopId != 'undefined') $.shopId = res.data.shopId
                        if(typeof res.data.venderId != 'undefined') $.venderId = res.data.venderId
                    }else if(res.errorMessage){
                        console.log(`${type} ${res.errorMessage || ''}`)
                    }else{
                        console.log(`${type} ${data}`)
                    }
                }else{
                    console.log(`${type} ${data}`)
                }
                break;
            case 'getMyPing':
                if(typeof res == 'object'){
                    if(res.result && res.result === true){
                        if(res.data && typeof res.data.secretPin != 'undefined') $.Pin = res.data.secretPin
                        if(res.data && typeof res.data.nickname != 'undefined') $.nickname = res.data.nickname
                    }else if(res.errorMessage){
                        console.log(`${type} ${res.errorMessage || ''}`)
                    }else{
                        console.log(`${type} ${data}`)
                    }
                }else{
                    console.log(`${type} ${data}`)
                }
                break;
            case 'getUserInfo':
                if(typeof res == 'object'){
                    if(res.result && res.result === true){
                        if(res.data && typeof res.data.yunMidImageUrl != 'undefined') $.attrTouXiang = res.data.yunMidImageUrl || "https://img10.360buyimg.com/imgzone/jfs/t1/7020/27/13511/6142/5c5138d8E4df2e764/5a1216a3a5043c5d.png"
                    }else if(res.errorMessage){
                        console.log(`${type} ${res.errorMessage || ''}`)
                    }else{
                        console.log(`${type} ${data}`)
                    }
                }else{
                    console.log(`${type} ${data}`)
                }
                break;
            case 'activityContent':
                if(typeof res == 'object'){
                    if(res.result && res.result === true){
                        $.actorUuid = res.data.uid || ''
                        $.followShop = res.data.followstatus || ''
                        $.isGameEnd = res.data.isGameEnd || ''
                        $.newVip = res.data.newVip || ''
                        $.openCardStatus = res.data.openCardStatus || ''
                        // console.log(`actorUuid:${$.actorUuid}`);
                        // console.log(`followShop:${$.followShop}`);
                    }else if(res.errorMessage){
                        // console.log(`${type} ${res.errorMessage || ''}`)
                    }else{
                        // console.log(`${type} ${data}`)
                    }
                }else{
                    // console.log(`${type} ${data}`)
                }
                break;
            case 'myinfo':
                // console.log(`myinfo:${data}`);
                break;
            case 'followshop':
                console.log(`followshop:${data}`);
                break;
            case 'startDraw':
            case 'followShop':
            case 'viewVideo':
            case 'visitSku':
            case 'toShop':
            case 'addSku':
            case 'sign':
            case 'addCart':
            case 'browseGoods':
            case '邀请':
            case '助力':
                if(typeof res == 'object'){
                    console.log(data)
                }else{
                    console.log(`${type} ${data}`)
                }
                break;
            case 'accessLogWithAD':
            // case 'drawContent':
            //     break;
            default:
                console.log(`${type}-> ${data}`);
        }
        if(typeof res == 'object'){
            if(res.errorMessage){
                if(res.errorMessage.indexOf('火爆') >-1 ){
                    $.hotFlag = true
                }
            }
        }
    } catch (e) {
        console.log(e)
    }
}

function getPostRequest(url, body, method="POST") {
    let headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookie,
        "User-Agent": $.UA,
        "X-Requested-With": "XMLHttpRequest"
    }
    if(url.indexOf('https://lzdz-isv.isvjcloud.com') > -1){
        headers["Referer"] = `https://lzdz-isv.isvjcloud.com/dingzhi/bd/common/activity?activityId=${$.activityId}&shareUuid=${$.shareUuid}`
        headers["Cookie"] = `${lz_jdpin_token_cookie && lz_jdpin_token_cookie || ''}${$.Pin && "AUTH_C_USER=" + $.Pin + ";" || ""}${activityCookie}`
    }
    // console.log(headers)
    // console.log(headers.Cookie)
    return  {url: url, method: method, headers: headers, body: body, timeout:30000};
}

function getCk() {
    return new Promise(resolve => {
        let get = {
            url:`https://lzdz-isv.isvjcloud.com/dingzhi/bd/common/activity?activityId=${$.activityId}&shareUuid=${$.shareUuid}`,
            followRedirect:false,
            headers: {
                "User-Agent": $.UA,
            },
            timeout:30000
        }
        $.get(get, async(err, resp, data) => {
            try {
                if (err) {
                    if(resp && typeof resp.statusCode != 'undefined'){
                        if(resp.statusCode == 493){
                            console.log('此ip已被限制，请过10分钟后再执行脚本\n')
                            $.outFlag = true
                        }
                    }
                    console.log(`${$.toStr(err)}`)
                    console.log(`${$.name} cookie API请求失败，请检查网路重试`)
                } else {
                    let end = data.match(/(活动已经结束)/) && data.match(/(活动已经结束)/)[1] || ''
                    if(end){
                        $.activityEnd = true
                        console.log('活动已结束')
                    }
                    setActivityCookie(resp)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
function setActivityCookie(resp){
    let LZ_TOKEN_KEY = ''
    let LZ_TOKEN_VALUE = ''
    let lz_jdpin_token = ''
    let setcookies = resp && resp['headers'] && (resp['headers']['set-cookie'] || resp['headers']['Set-Cookie'] || '') || ''
    let setcookie = ''
    if(setcookies){
        if(typeof setcookies != 'object'){
            setcookie = setcookies.split(',')
        }else setcookie = setcookies
        for (let ck of setcookie) {
            let name = ck.split(";")[0].trim()
            if(name.split("=")[1]){
                // console.log(name.replace(/ /g,''))
                if(name.indexOf('LZ_TOKEN_KEY=')>-1) LZ_TOKEN_KEY = name.replace(/ /g,'')+';'
                if(name.indexOf('LZ_TOKEN_VALUE=')>-1) LZ_TOKEN_VALUE = name.replace(/ /g,'')+';'
                if(name.indexOf('lz_jdpin_token=')>-1) lz_jdpin_token = ''+name.replace(/ /g,'')+';'
            }
        }
    }
    if(LZ_TOKEN_KEY && LZ_TOKEN_VALUE) activityCookie = `${LZ_TOKEN_KEY} ${LZ_TOKEN_VALUE}`
    if(lz_jdpin_token) lz_jdpin_token_cookie = lz_jdpin_token
}

async function getUA(){
    $.UA = `jdapp;iPhone;10.1.4;13.1.2;${randomString(40)};network/wifi;model/iPhone8,1;addressid/2308460611;appBuild/167814;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`
}
function randomString(e) {
    e = e || 32;
    let t = "abcdef0123456789", a = t.length, n = "";
    for (i = 0; i < e; i++)
        n += t.charAt(Math.floor(Math.random() * a));
    return n
}
function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}

async function joinShop() {
    if (!$.joinVenderId) return
    return new Promise(async resolve => {
        $.errorJoinShop = '活动太火爆，请稍后再试'
        let activityId = ``
        if ($.shopactivityId) activityId = `,"activityId":${$.shopactivityId}`
        let body = `{"venderId":"${$.joinVenderId}","bindByVerifyCodeFlag":1,"registerExtend":{},"writeChildFlag":0${activityId},"channel":401}`
        let h5st = 'undefined'
        try {
            h5st = '20220412164634306%3Bf5299392a200d6d9ffced997e5790dcc%3B169f1%3Btk02wc0f91c8a18nvWVMGrQO1iFlpQre2Sh2mGtNro1l0UpZqGLRbHiyqfaUQaPy64WT7uz7E%2FgujGAB50kyO7hwByWK%3B77c8a05e6a66faeed00e4e280ad8c40fab60723b5b561230380eb407e19354f7%3B3.0%3B1649753194306';
        } catch (e) {
            h5st = 'undefined'
        }
        const options = {
            url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=bindWithVender&body=${body}&clientVersion=9.2.0&client=H5&uuid=88888&h5st=${h5st}&jsonp=jsonp_1652721726211_45651`,
            headers: {
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'cookie': cookie,
                'origin': 'https://shopmember.m.jd.com/',
                'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
            }
        }
        $.get(options, async (err, resp, data) => {
            try {
                data = data && data.match(/jsonp_.*?\((.*?)\);/) && data.match(/jsonp_.*?\((.*?)\);/)[1] || data
                // console.log(data)
                let res = $.toObj(data, data);
                if (res && typeof res == 'object') {
                    if (res && res.success === true) {
                        console.log(res.message)
                        $.errorJoinShop = res.message
                        if (res.result && res.result.giftInfo) {
                            for (let i of res.result.giftInfo.giftList) {
                                console.log(`入会获得:${i.discountString}${i.prizeName}${i.secondLineDesc}`)
                            }
                        }
                    } else if (res && typeof res == 'object' && res.message) {
                        $.errorJoinShop = res.message
                        console.log(`${res.message || ''}`)
                    } else {
                        console.log(data)
                    }
                } else {
                    console.log(data)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
async function getshopactivityId() {
    return new Promise(async resolve => {
        let body = `{"venderId":"${$.joinVenderId}","channel":401,"payUpShop":true,"queryVersion":"10.5.2"}`
        let h5st = 'undefined'
        try {
            h5st = '20220517012201499%3B2933435981099268%3Bef79a%3Btk02w92631bfa18nhD4ubf3QfNiU8ED2PI270ygsn%2BvamuBQh0lVE6v7UAwckz3s2OtlFEfth5LbQdWOPNvPEYHuU2Tw%3Bb01c7c4f99a8ffb2b5e69282f45a14e1b87c90a96217006311ae4cfdcbd1a932%3B3.0%3B1652721721499'
        } catch (e) {
            h5st = 'undefined'
        }
        const options = {
            url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=getShopOpenCardInfo&body=${body}&clientVersion=9.2.0&client=H5&uuid=88888&h5st=${h5st}&jsonp=jsonp_1652721721404_71343`,
            headers: {
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'cookie': cookie,
                'origin': 'https://shopmember.m.jd.com/',
                'user-agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
            }
        }
        $.get(options, async (err, resp, data) => {
            try {
                data = data && data.match(/jsonp_.*?\((.*?)\);/) && data.match(/jsonp_.*?\((.*?)\);/)[1] || data
                // console.log(`getShopOpenCardInfo:${data}`)
                let res = $.toObj(data, data);
                if (res && typeof res == 'object') {
                    if (res && res.success == true) {
                        // console.log($.toStr(res.result))
                        console.log(`入会:${res.result[0].shopMemberCardInfo.venderCardName || ''}`)
                        $.shopactivityId = res.result.interestsRuleList && res.result.interestsRuleList[0] && res.result.interestsRuleList[0].interestsInfo && res.result.interestsRuleList[0].interestsInfo.activityId || ''
                    }
                } else {
                    console.log(data)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
