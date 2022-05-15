/*
V2P获取京东CK(短信验证码)

基于V2P的UI脚本，短信获取京东CK(并自动写入青龙)，直接运行即可
有时会出错，应该是服务器限流，多跑几次就好
可选变量qlParam，不填或者填错就只打印CK不写入青龙，填对了就自动写入青龙环境变量里

变量qlParam格式：
host=127.0.0.1:5700&client_id=xxxxxx&client_secret=yyyyyyyyyyyyyyyyyy
其中host是你的青龙IP和端口，client_id和client_secret需要到 青龙->系统设置->应用设置 里面添加，需要添加环境变量权限
*/

const jsname = 'V2P获取京东CK'
const $ = new Env(jsname);
const logDebug = 0; //1为打印所有返回，0为不打印

const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
let notifyStr = ''

let httpResult //global buffer

let qlParam = $.getdata('qlParam')

let qlHost = ''
let qlSecret = ''
let qlAuth = ''
let qlEnv = []
let qlId = ''

let appid = '959'
let client_ver = '1.0.0'
let sdk_ver = '1.0.0'
let qversion = '1.0.0'
let country_code = '86'

let cookie = ''
let gsalt = ''
let mobile = ''
let jdck = ''

let md5Salt1 = 'sb2cwlYyaCSN1KUv5RHG3tmqxfEb8NKN'
let md5Salt2 = '4dtyyzKF3w6o54fJZnmeW3bVHl0$PbXj'

let sendSmsUI_id = randomString(8)
let getCkUI_id = randomString(8)

///////////////////////////////////////////////////////////////////
var sendSmsUI = {
  id: sendSmsUI_id,      // 给图形界面一个独一无二的 ID。可省略（以下所有参数都可省略，不再重复说明）
  title: '发送验证码',          // 窗口标题
  width: 600,          // 窗口宽度
  height: 160,         // 窗口高度
  content: '输入手机号后，点击发送验证码',            // 图形界面显示内容
  style: {             // 设置一些基础样式
    title: "background: #6B8E23;",   // 设置标题样式
    content: "background: #FF8033; font-size: 24px; text-align: center",  // 设置中间主体内容样式
    cbdata: "height: 45px;",        // 设置返回数据输入框样式
    cbbtn: "width: 60px;"           // 设置提交数据按钮的样式
  },
  resizable: true,     // 窗口是否可以缩放
  draggable: true,     // 窗口是否可以拖动
  cbable: true,        // 是否启用 callback 函数，用于接收前端 UI 提交返回的数据
  cb(data){            // callback 函数。此项会被 $evui 的第二个参数覆盖(如有)
    console.log('data from client:', data)
  },
  cbdata: '',     // 提供给前端 UI 界面的初始数据
  cblabel: '发送验证码', // 提交按钮显示文字
  //script: `console.log('hello $evui');alert('hi, elecV2P')`,     // v3.2.4 增加支持在前端网页中插入 javascript 代码
}

var getCkUI = {
  id: getCkUI_id,      // 给图形界面一个独一无二的 ID。可省略（以下所有参数都可省略，不再重复说明）
  title: '提交验证码获取CK',          // 窗口标题
  width: 600,          // 窗口宽度
  height: 160,         // 窗口高度
  content: '输入收到的验证码，点击提交验证码',            // 图形界面显示内容
  style: {             // 设置一些基础样式
    title: "background: #6B8E23;",   // 设置标题样式
    content: "background: #FF8033; font-size: 24px; text-align: center",  // 设置中间主体内容样式
    cbdata: "height: 45px;",        // 设置返回数据输入框样式
    cbbtn: "width: 60px;"           // 设置提交数据按钮的样式
  },
  resizable: true,     // 窗口是否可以缩放
  draggable: true,     // 窗口是否可以拖动
  cbable: true,        // 是否启用 callback 函数，用于接收前端 UI 提交返回的数据
  cb(data){            // callback 函数。此项会被 $evui 的第二个参数覆盖(如有)
    console.log('data from client:', data)
  },
  cbdata: '',     // 提供给前端 UI 界面的初始数据
  cblabel: '提交验证码', // 提交按钮显示文字
  //script: `console.log('hello $evui');alert('hi, elecV2P')`,     // v3.2.4 增加支持在前端网页中插入 javascript 代码
}

!(async () => {
    if (typeof $request !== "undefined") {
        return;
    }else {
        let qlParamJson = populateParam(qlParam);
        if(!qlParamJson.host || !qlParamJson.client_id || !qlParamJson.client_secret) {
            console.log('qlParam格式错误，本次获取CK后不会写入到青龙')
        } else {
            qlHost = qlParamJson.host
            qlSecret = 'client_id=' + qlParamJson.client_id + '&client_secret=' + qlParamJson.client_secret
            await getToken()
            if(qlAuth) {
                await searchEnv('JD_COOKIE');
            }
        }
        
        $evui(sendSmsUI, async (data) => {
            if(data.search(/^1[0-9]{10}$/) > -1) {
                mobile = data
                $evui(getCkUI, async (data) => {
                    await verifyCode(data)
                    closeWindow(getCkUI_id)
                }).then().catch(e=>console.error(e))
                await getParam();
            } else {
                console.log('请输出正确的手机号码');
            }
            closeWindow(sendSmsUI_id)
        }).then().catch(e=>console.error(e))
    }
})()
.catch((e) => $.logErr(e))
.finally(() => $.done())

///////////////////////////////////////////////////////////////////
function closeWindow(id) {
    $ws.send({ type: 'evui', data: { id: id, type: 'close' }})
}

async function getParam() {
    let cmd = 36
    let sub_cmd = 1
    let ts = (new Date()).getTime()
    let gsign = MD5Encrypt(`${appid}${qversion}${ts}${cmd}${sub_cmd}${md5Salt1}`)
    let url = `https://qapplogin.m.jd.com/cgi-bin/qapp/quick`
    let body = `client_ver=${client_ver}&gsign=${gsign}&appid=${appid}&return_page=https%3A%2F%2Fcrpl.jd.com%2Fn%2Fmine%3FpartnerId%3DWBTF0KYY%26ADTAG%3Dkyy_mrqd%26token%3D&cmd=${cmd}&sdk_ver=${sdk_ver}&sub_cmd=${sub_cmd}&qversion=${qversion}&ts=${ts}`
    let urlObject = populateJdUrlObject(url,'',body)
    await httpRequest('post',urlObject)
    let result = httpResult;
    if(!result) {closeWindow(getCkUI_id);return;}
    //console.log(result)
    if(result.err_code == 0) {
        console.log(`获取参数成功`)
        gsalt = result.data.gsalt
        cookie = `guid=${result.data.guid}; lsid=${result.data.lsid}; gsalt=${result.data.gsalt}; rsa_modulus=${result.data.rsa_modulus};`
        sendSms()
    } else {
        console.log(`获取参数失败：${result.err_msg}`)
        closeWindow(getCkUI_id)
    }
}

async function sendSms() {
    let cmd = 36
    let sub_cmd = 2
    let ts = (new Date()).getTime()
    let gsign = MD5Encrypt(`${appid}${qversion}${ts}${cmd}${sub_cmd}${gsalt}`)
    let sign = MD5Encrypt(`${appid}${qversion}${country_code}${mobile}${md5Salt2}`)
    let url = `https://qapplogin.m.jd.com/cgi-bin/qapp/quick`
    let body = `country_code=${country_code}&client_ver=${client_ver}&gsign=${gsign}&appid=${appid}&mobile=${mobile}&sign=${sign}&cmd=${cmd}&sub_cmd=${sub_cmd}&qversion=${qversion}&ts=${ts}`
    let urlObject = populateJdUrlObject(url,cookie,body)
    await httpRequest('post',urlObject)
    let result = httpResult;
    if(!result) {closeWindow(getCkUI_id);return;}
    //console.log(result)
    if(result.err_code == 0) {
        console.log(`验证码已发送到${mobile}，有效期：${result.data.expire_time}秒`)
    } else {
        console.log(`发送验证码失败，请尝试重新运行：${result.err_msg}`)
        closeWindow(getCkUI_id)
    }
}

async function verifyCode(smscode) {
    let cmd = 36
    let sub_cmd = 3
    let ts = (new Date()).getTime()
    let gsign = MD5Encrypt(`${appid}${qversion}${ts}${cmd}${sub_cmd}${gsalt}`)
    let sign = MD5Encrypt(`${appid}${qversion}${country_code}${mobile}${md5Salt2}`)
    let url = `https://qapplogin.m.jd.com/cgi-bin/qapp/quick`
    let body = `country_code=${country_code}&client_ver=${client_ver}&gsign=${gsign}&smscode=${smscode}&appid=${appid}&mobile=${mobile}&sign=${sign}&cmd=${cmd}&sub_cmd=${sub_cmd}&qversion=${qversion}&ts=${ts}`
    let urlObject = populateJdUrlObject(url,cookie,body)
    await httpRequest('post',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.err_code == 0) {
        pt_pin = result.data.pt_pin
        pt_key = result.data.pt_key
        jdck = `pt_pin=${pt_pin}; pt_key=${result.data.pt_key};`
        console.log(`京东登录成功，您的京东CK：`)
        console.log(jdck)
        if(qlAuth) {
            let nowtime = new Date()
            let year = padStr(nowtime.getFullYear(),4)
            let month = padStr(nowtime.getMonth(),2)
            let date = padStr(nowtime.getDate(),2)
            let hour = padStr(nowtime.getHours(),2)
            let minute = padStr(nowtime.getMinutes(),2)
            let remark = `V2P_get_JD_CK@${year}-${month}-${date} ${hour}:${minute}`
            let isFound = false
            for(let item of qlEnv) {
                if(item.value.indexOf(pt_pin) > -1) {
                    qlId = item._id
                    await $.wait(10)
                    await updateEnv('JD_COOKIE',jdck,remark,item._id);
                    await $.wait(10)
                    await enableEnv(item._id,'JD_COOKIE');
                    isFound = true;
                    break;
                }
            }
            if(!isFound) {
                await $.wait(10)
                await addEnv('JD_COOKIE',jdck,remark);
            }
        }
    } else {
        console.log(`京东登录失败，请尝试重新运行：${result.err_msg}`)
    }
}

function populateParam(param) {
    let ret = {}
    if(!qlParam) return ret;
    for(let item of qlParam.split('&')) {
        let kv = item.split('=')
        if(kv.length == 2) {
            ret[kv[0]] = kv[1]
        }
    }
    return ret;
}

async function getToken() {
    let url = `http://${qlHost}/open/auth/token?${qlSecret}`
    let body = ``
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('get',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        qlAuth = result.data.token
        console.log(`查询青龙接口成功`)
    } else {
        console.log(`查询青龙接口失败: ${result.message}`)
    }
}

async function searchEnv(keyword='') {
    let url = `http://${qlHost}/open/envs?searchValue=${keyword}`
    let body = ``
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('get',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        qlEnv = result.data
        console.log(`获取青龙环境变量成功`)
    } else {
        console.log(`获取青龙环境变量失败: ${result.message}`)
    }
}

async function addEnv(name,value,remarks) {
    let param = {value,name,remarks}
    let url = `http://${qlHost}/open/envs`
    let body = JSON.stringify([param])
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('post',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        qlId = result.data._id
        console.log(`添加青龙环境变量${name}成功`)
    } else {
        console.log(`添加青龙环境变量${name}失败: ${result.message}`)
    }
}

async function updateEnv(name,value,remarks,_id) {
    let param = {value,name,remarks,_id}
    let url = `http://${qlHost}/open/envs`
    let body = JSON.stringify(param)
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('put',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        console.log(`更新青龙环境变量${name}成功`)
    } else {
        console.log(`更新青龙环境变量${name}失败: ${result.message}`)
    }
}

async function deleteEnv(id,name) {
    let url = `http://${qlHost}/open/envs`
    let body = JSON.stringify([id])
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('delete',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        console.log(`删除青龙环境变量${name}成功`)
    } else {
        console.log(`删除青龙环境变量${name}失败: ${result.message}`)
    }
}

async function disableEnv(id,name) {
    let url = `http://${qlHost}/open/envs/disable`
    let body = JSON.stringify([id])
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('put',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        console.log(`禁用青龙环境变量${name}成功`)
    } else {
        console.log(`禁用青龙环境变量${name}失败: ${result.message}`)
    }
}

async function enableEnv(id,name) {
    let url = `http://${qlHost}/open/envs/enable`
    let body = JSON.stringify([id])
    let urlObject = populateUrlObject(url,qlAuth,body)
    await httpRequest('put',urlObject)
    let result = httpResult;
    if(!result) return
    //console.log(result)
    if(result.code == 200) {
        console.log(`启用青龙环境变量${name}成功`)
    } else {
        console.log(`启用青龙环境变量${name}失败: ${result.message}`)
    }
}

//通知
async function showmsg() {
    if(!notifyStr) return;
    const notify = $.isNode() ? require('./sendNotify') : '';
    if(!notify) return;
    notifyBody = jsname + "运行通知\n\n" + notifyStr
    if (notifyFlag == 1) {
        $.msg(notifyBody);
        if($.isNode()){await notify.sendNotify($.name, notifyBody );}
    } else {
        console.log(notifyBody);
    }
}

//pushDear
async function pushDear(str) {
    if(!PushDearKey) return;
    if(!str) return;
    
    console.log('\n============= PushDear 通知 =============\n')
    console.log(str)
    let urlObject = {
        url: `https://api2.pushdeer.com/message/push?pushkey=${PushDearKey}&text=${encodeURIComponent(str)}`,
        headers: {},
    };
    await httpRequest('get',urlObject)
    let result = httpResult;
    let retStr = result.content.result==false ? '失败' : '成功'
    console.log(`\n========== PushDear 通知发送${retStr} ==========\n`)
}
////////////////////////////////////////////////////////////////////
function populateUrlObject(url,auth,body=''){
    let host = url.replace('//','/').split('/')[1]
    let urlObject = {
        url: url,
        headers: {
            'Host': host,
            'Accept' : 'application/json',
        },
    }
    if(auth) urlObject.headers.Authorization = 'Bearer ' + auth
    if(body) {
        urlObject.headers['Content-Type'] =  'application/json;charset=UTF-8'
        urlObject.headers['Content-Length'] = body.length
        urlObject.body = body
    }
    return urlObject;
}

function populateJdUrlObject(url,ck,body=''){
    let host = url.replace('//','/').split('/')[1]
    let urlObject = {
        url: url,
        headers: {
            'Host' : host,
            'cookie' : ck,
            'User-Agent' : 'Mozilla/5.0 (Linux; Android 10; V1838T Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/98.0.4758.87 Mobile Safari/537.36 hap/1.9/vivo com.vivo.hybrid/1.9.6.302 com.jd.crplandroidhap/1.0.3 ({"packageName":"com.vivo.hybrid","type":"deeplink","extra":{}})',
            'Accept-Language' : 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding' : '*/*',
        },
    }
    if(body) {
        urlObject.headers['Content-Type'] =  'application/x-www-form-urlencoded; charset=utf-8'
        urlObject.headers['Content-Length'] = body.length
        urlObject.body = body
    }
    return urlObject;
}

async function httpRequest(method,url) {
    httpResult = null
    return new Promise((resolve) => {
        $[method](url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${method}请求失败`);
                    if (safeGet(data)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function getMin(a,b){
    return ((a<b) ? a : b)
}

function getMax(a,b){
    return ((a<b) ? b : a)
}

function padStr(num,length,padding='0') {
    let numStr = String(num)
    let numPad = (length>numStr.length) ? (length-numStr.length) : 0
    let retStr = ''
    for(let i=0; i<numPad; i++) {
        retStr += padding
    }
    retStr += numStr
    return retStr;
}

function randomString(len=12) {
    let chars = 'abcdef0123456789';
    let maxLen = chars.length;
    let str = '';
    for (i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random()*maxLen));
    }
    return str;
}

var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

function MD5Encrypt(a){function b(a,b){return a<<b|a>>>32-b}function c(a,b){var c,d,e,f,g;return e=2147483648&a,f=2147483648&b,c=1073741824&a,d=1073741824&b,g=(1073741823&a)+(1073741823&b),c&d?2147483648^g^e^f:c|d?1073741824&g?3221225472^g^e^f:1073741824^g^e^f:g^e^f}function d(a,b,c){return a&b|~a&c}function e(a,b,c){return a&c|b&~c}function f(a,b,c){return a^b^c}function g(a,b,c){return b^(a|~c)}function h(a,e,f,g,h,i,j){return a=c(a,c(c(d(e,f,g),h),j)),c(b(a,i),e)}function i(a,d,f,g,h,i,j){return a=c(a,c(c(e(d,f,g),h),j)),c(b(a,i),d)}function j(a,d,e,g,h,i,j){return a=c(a,c(c(f(d,e,g),h),j)),c(b(a,i),d)}function k(a,d,e,f,h,i,j){return a=c(a,c(c(g(d,e,f),h),j)),c(b(a,i),d)}function l(a){for(var b,c=a.length,d=c+8,e=(d-d%64)/64,f=16*(e+1),g=new Array(f-1),h=0,i=0;c>i;)b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|a.charCodeAt(i)<<h,i++;return b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|128<<h,g[f-2]=c<<3,g[f-1]=c>>>29,g}function m(a){var b,c,d="",e="";for(c=0;3>=c;c++)b=a>>>8*c&255,e="0"+b.toString(16),d+=e.substr(e.length-2,2);return d}function n(a){a=a.replace(/\r\n/g,"\n");for(var b="",c=0;c<a.length;c++){var d=a.charCodeAt(c);128>d?b+=String.fromCharCode(d):d>127&&2048>d?(b+=String.fromCharCode(d>>6|192),b+=String.fromCharCode(63&d|128)):(b+=String.fromCharCode(d>>12|224),b+=String.fromCharCode(d>>6&63|128),b+=String.fromCharCode(63&d|128))}return b}var o,p,q,r,s,t,u,v,w,x=[],y=7,z=12,A=17,B=22,C=5,D=9,E=14,F=20,G=4,H=11,I=16,J=23,K=6,L=10,M=15,N=21;for(a=n(a),x=l(a),t=1732584193,u=4023233417,v=2562383102,w=271733878,o=0;o<x.length;o+=16)p=t,q=u,r=v,s=w,t=h(t,u,v,w,x[o+0],y,3614090360),w=h(w,t,u,v,x[o+1],z,3905402710),v=h(v,w,t,u,x[o+2],A,606105819),u=h(u,v,w,t,x[o+3],B,3250441966),t=h(t,u,v,w,x[o+4],y,4118548399),w=h(w,t,u,v,x[o+5],z,1200080426),v=h(v,w,t,u,x[o+6],A,2821735955),u=h(u,v,w,t,x[o+7],B,4249261313),t=h(t,u,v,w,x[o+8],y,1770035416),w=h(w,t,u,v,x[o+9],z,2336552879),v=h(v,w,t,u,x[o+10],A,4294925233),u=h(u,v,w,t,x[o+11],B,2304563134),t=h(t,u,v,w,x[o+12],y,1804603682),w=h(w,t,u,v,x[o+13],z,4254626195),v=h(v,w,t,u,x[o+14],A,2792965006),u=h(u,v,w,t,x[o+15],B,1236535329),t=i(t,u,v,w,x[o+1],C,4129170786),w=i(w,t,u,v,x[o+6],D,3225465664),v=i(v,w,t,u,x[o+11],E,643717713),u=i(u,v,w,t,x[o+0],F,3921069994),t=i(t,u,v,w,x[o+5],C,3593408605),w=i(w,t,u,v,x[o+10],D,38016083),v=i(v,w,t,u,x[o+15],E,3634488961),u=i(u,v,w,t,x[o+4],F,3889429448),t=i(t,u,v,w,x[o+9],C,568446438),w=i(w,t,u,v,x[o+14],D,3275163606),v=i(v,w,t,u,x[o+3],E,4107603335),u=i(u,v,w,t,x[o+8],F,1163531501),t=i(t,u,v,w,x[o+13],C,2850285829),w=i(w,t,u,v,x[o+2],D,4243563512),v=i(v,w,t,u,x[o+7],E,1735328473),u=i(u,v,w,t,x[o+12],F,2368359562),t=j(t,u,v,w,x[o+5],G,4294588738),w=j(w,t,u,v,x[o+8],H,2272392833),v=j(v,w,t,u,x[o+11],I,1839030562),u=j(u,v,w,t,x[o+14],J,4259657740),t=j(t,u,v,w,x[o+1],G,2763975236),w=j(w,t,u,v,x[o+4],H,1272893353),v=j(v,w,t,u,x[o+7],I,4139469664),u=j(u,v,w,t,x[o+10],J,3200236656),t=j(t,u,v,w,x[o+13],G,681279174),w=j(w,t,u,v,x[o+0],H,3936430074),v=j(v,w,t,u,x[o+3],I,3572445317),u=j(u,v,w,t,x[o+6],J,76029189),t=j(t,u,v,w,x[o+9],G,3654602809),w=j(w,t,u,v,x[o+12],H,3873151461),v=j(v,w,t,u,x[o+15],I,530742520),u=j(u,v,w,t,x[o+2],J,3299628645),t=k(t,u,v,w,x[o+0],K,4096336452),w=k(w,t,u,v,x[o+7],L,1126891415),v=k(v,w,t,u,x[o+14],M,2878612391),u=k(u,v,w,t,x[o+5],N,4237533241),t=k(t,u,v,w,x[o+12],K,1700485571),w=k(w,t,u,v,x[o+3],L,2399980690),v=k(v,w,t,u,x[o+10],M,4293915773),u=k(u,v,w,t,x[o+1],N,2240044497),t=k(t,u,v,w,x[o+8],K,1873313359),w=k(w,t,u,v,x[o+15],L,4264355552),v=k(v,w,t,u,x[o+6],M,2734768916),u=k(u,v,w,t,x[o+13],N,1309151649),t=k(t,u,v,w,x[o+4],K,4149444226),w=k(w,t,u,v,x[o+11],L,3174756917),v=k(v,w,t,u,x[o+2],M,718787259),u=k(u,v,w,t,x[o+9],N,3951481745),t=c(t,p),u=c(u,q),v=c(v,r),w=c(w,s);var O=m(t)+m(u)+m(v)+m(w);return O.toLowerCase()}

function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),"PUT"===e&&(s=this.put),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}put(t){return this.send.call(this.env,t,"PUT")}delete(t){return this.send.call(this.env,t,"DELETE")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}elses=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}put(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.put(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="PUT",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.put(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}delete(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.delete(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="delete",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.delete(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}