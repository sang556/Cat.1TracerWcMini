﻿﻿


&nbsp; &nbsp; &nbsp; 微信物联网生态主要分在**微信硬件开发平台**与**腾讯物联开发平台**，前者已经停止维护，但依然有着很大的学习价值，而后者作为主推的平台，集成很多功能，包括从微信小程序实现配网到控制；

&nbsp; &nbsp; &nbsp; 为了兼顾更多的朋友和自己的学习笔记，我将会一直更新此专题笔记，欢迎关注[本人CSDN半颗心脏](https://blog.csdn.net/xh870189248)，带你走进前沿领域，学习前沿技术！


# 一、前言
&nbsp; &nbsp; &nbsp; 最近项目有用到4G Cat.1 模组，于是乎，从业务逻辑中复盘做出了一个应用开发案列，供大家分享。

&nbsp; &nbsp; &nbsp; 作为一个全栈技术者，我们所要考虑的是如何把数据完完全全打通并且显示在用户手上，其项目原理如下：

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326135754114.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hoODcwMTg5MjQ4,size_16,color_FFFFFF,t_70#pic_center)

 1. 第一步：MCU + 安信可4G模组核心开发板实现上网+基站定位，使用MQTT协议把自身的基站信息定位发送给服务器；
 2. 第二步：微信小程序收到其定位信息，通过腾讯地图服务，转变为微信小程序地图的坐标系，即可成功显示；

## 通讯协议
下面所示的`IMEI`是指模组上的产品序列号 ，可从AT指令获取或扫描模组丝印的二维码获取， 即国际移动设备识别码IMEI，由15位数字组成！

| 方向 | Topic | payload  | 含义 |
|--|--|--|--|
| 小程序-->模组 | /Ca-01/**${IMEI}**/devSub  | {"code":1}  |   小程序查询经纬度|
| 模组-->小程序|/Ca-01/**${IMEI}**/devPub  | {"code":1,"Lat":22.6665845,"Lon":115.555}  |   设备正确上报经纬度|
| 模组-->小程序|/Ca-01/**${IMEI}**/devPub  | {"code":0,"Lat":22.6665845,"Lon":115.555}  |   设备未获取经纬度|



## 技术问题点
1. 界面那个输入编号和扫描定位是干嘛的？
> 答：为了不把设备发布消息的主题写死在微信小程序里面，我定义了以上的灵活的主题设计。输入或扫描二维码得到设备的IMEI，小程序会根据双方定义好的协议去订阅该设备的主题，获取其上报的经纬度信息；

2. 模组上报的经纬度坐标系是 WGS-84，而小程序地图的是腾讯坐标系，如何兼容？
> 答：使用腾讯地图服务API接口即可成功转换。

# 二、4G模组业务逻辑
这里采用的是安信可4G模组CA-01核心开发板，使用的串口UART接口协议，指令如下：

```c
AT+CGATT?   //查询是否附着基站网络， 返回+CGATT: 1 表示附着上了 GPRS 数据网络，可以继续往下操作
AT+SAPBR=3,1,"CONTYPE","GPRS"//设置HTTP功能的承载类型，模块会返回"OK"
AT+SAPBR=3,1,"APN","CMIOT" //设置pdp承载参数之APN，模块会返回"OK"
AT+SAPBR=1,1   //激活该承载的GPRS PDP上下文，模块会返回"OK"
AT+SAPBR=2,1  //查询下承载的状态，模块会返回一串字符串，包含三个参数，第一个参数1表示cid，第二个参数1表示已经连接，第三个参数表示模块获取的IP地址；SAPBR激活成功即第二个参数为1才可继续往下操作

//连接MQTT服务器
AT+MCONFIG="Ca-01","admin","xuhong123"
AT+MIPSTART="aligenie.xuhong.com",1883
AT+MCONNECT=1,50

//获取地理位置
AT+CIPGSMLOC=1,1 
//获取 IMEI 
AT+CGSN 
//发布消息
AT+MPUB="/Ca-01/862167058023411/devSub",1,0,"{\22code\22:1,\22Lat\22:\2222.604354\22,\22Lon\22:\22113.841825\22}"
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210326153700123.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hoODcwMTg5MjQ4,size_16,color_FFFFFF,t_70)

## 上报基站信息
&nbsp; &nbsp; &nbsp; 第1步先读取基站定位（LBS）信息和时间：```AT+CIPGSMLOC=1,1```

```c
AT+CIPGSMLOC=1,1

+CIPGSMLOC: 0,22.604354,113.841825,2021/03/26,15:41:51

OK
```

&nbsp; &nbsp; &nbsp; 第2步先读取查询 IMEI 号：```AT+CGSN```，下面读取到的是**862167058023411**。
```c
AT+CGSN

862167058023411

OK
```



&nbsp; &nbsp; &nbsp; 第3步就可以MQTT上报基站定位（LBS）信息和时间：```AT+MPUB=<topic>,<qos>,<retain>
,<message>```，根据上面的通讯协议，我们这样的设计应该这样的：

```c
AT+MPUB="/Ca-01/862167058023411/devSub",1,0,"{"code":1,"Lat":"22.604354","Lon":"113.841825"}"
```

&nbsp; &nbsp; &nbsp; 但是由于部分字符需要转义，所以以上的就转义：

```c
AT+MPUB="/Ca-01/862167058023411/devSub",1,0,"{\22code\22:1,\22Lat\22:\2222.604354\22,\22Lon\22:\22113.841825\22}"
```

# 三、微信小程序控制
第一步，连接服务器：

```c
 var that = this;
    //获取当前时间戳 设置为 clientID
    var timestamp = (new Date()).valueOf();
    this.setData({
      'options.clientId': "WC-" + timestamp
    })

    //开始连接
    this.data.client = mqtt.connect("wxs://aligenie.xuhong.com/mqtt", this.data.options);
    this.data.client.on('connect', function(connack) {
      wx.showToast({
        title: 'connect success',
        icon: 'none',
        duration: 2000
      })
    })
    //服务器下发消息的回调
    that.data.client.on("message", function(topic, payload) {
      console.log(" 收到 topic:" + topic + " , payload :" + payload);
      let obj = JSON.parse(payload);
      if (obj) {
        let isGet = obj.code === 1 ? true : false;
        console.log(" 收到 isGet:" + isGet);
        if (isGet) {
          that.translate(obj.Lat, obj.Lon);
          wx.showToast({
            title: '正在定位...',
            icon: 'none',
            duration: 2000
          })
        }else
          wx.showToast({
            title: '设备定位中，请稍后重试..',
            icon: 'none',
            duration: 2000
          })
      }
    })
    //服务器连接异常的回调
    that.data.client.on("error", function(error) {
      console.log(" 服务器 error 的回调" + error)
    })
    //服务器重连连接异常的回调
    that.data.client.on("reconnect", function() {
      //console.log(" 服务器 reconnect的回调")
    })
    //服务器连接异常的回调
    that.data.client.on("offline", function(errr) {
      //console.log(" 服务器offline的回调")
    })

```
- 第二步，扫描二维码业务逻辑：

```c
    let that = this;
    if (this.data.client && this.data.client.connected) {
      wx.scanCode({
        success: (res) => {
          if (res.errMsg === 'scanCode:ok') {
            that.data.client.subscribe('/Ca-01/' + res.result + '/devSub', function(err, granted) {
              if (!err) {
                that.setData({
                  devSubTopic: '/Ca-01/' + res.result + '/devPub'
                })
                wx.showToast({
                  title: '正在获取【' + res.result + "】的位置",
                  icon: 'none',
                  duration: 1000
                })
              } else {
                console.log('订阅报错：' + err)
              }
            })
          } else
            wx.showToast({
              title: '抱歉，请认准在安信可模组上面的二维码。',
              icon: 'none',
              duration: 2000
            })
        },
        fail: (res) => {
          console.log(res);
          wx.showToast({
            title: '抱歉，重新扫描。',
            icon: 'none',
            duration: 2000
          })
        }
      })
    } 
```
第三步，模组上报的经纬度坐标系是 WGS-84，而小程序地图的是腾讯坐标系，所以需要转换，而我这里调用第三方**API**接口

```cpp
var that = this;
    let info = latitude + ',' + longitude;
    wx.request({
      url: 'https://apis.map.qq.com/ws/coord/v1/translate',
      method: "GET",
      data: { //发送给后台的数据
        locations: info,
        type: 1,
        key: 'GARBZ-PQ4EW-6CUR6-OJJWY-2APKQ-HEFFI',
      },
      success: function(res) {
        that.setData({
          latitude: res.data.locations[0].lat,
          longitude: res.data.locations[0].lng,
          'markers[0].latitude': res.data.locations[0].lat,
          'markers[0].longitude': res.data.locations[0].lng,
        })
        qqmapsdk.reverseGeocoder({
          location: {
            latitude: res.data.locations[0].lat,
            longitude: res.data.locations[0].lng
          },
          success: function(res) { //成功后的回调
            console.log(JSON.stringify(res));
            if (res.status === 0) {
              let getRecommend = res.result.recommend === '' ? true : false;
              if (getRecommend) {
                that.setData({
                  'markers[0].callout.content': res.result.address + res.result.formatted_addresses.recommend,
                  'markers[0].callout.display': 'ALWAYS'
                })
              } else
                that.setData({
                  'markers[0].callout.content': res.result.address_component.nation +
                    res.result.address_component.province +
                    res.result.address_component.city +
                    res.result.formatted_addresses.recommend,
                  'markers[0].callout.display': 'ALWAYS'
                })
            }
          },
          fail: function(error) {
            console.error(error);
          },
          complete: function(res) {
            console.log(res);
          }
        });

        //console.log(" res.data.locations[0].lat:" + res.data.locations[0].lat);
        //console.log(" longitude: res.data.locations[0].lng:" + res.data.locations[0].lng);

      },
      fail: function(err) {}, //请求失败
      complete: function() {} //请求完成后执行的函数
    })
```
&nbsp; &nbsp; &nbsp;其中，转换坐标API的接口使用说明如下，[点我链接](https://lbs.qq.com/qqmap_wx_jssdk/method-reverseGeocoder.html)，注意必须自己要去平台注册一个账号拿到请求的**AppKey**。

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210327115554766.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hoODcwMTg5MjQ4,size_16,color_FFFFFF,t_70)

&nbsp; &nbsp; &nbsp;微信小程序代码结构如下：
![在这里插入图片描述](https://img-blog.csdnimg.cn/20210328132409833.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hoODcwMTg5MjQ4,size_16,color_FFFFFF,t_70)

