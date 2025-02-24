//转换常数
const x_pi = 3.14159265358979324 * 3000.0 / 180.0
const pi = 3.1415926535897932384626
const a = 6378245.0
const ee = 0.00669342162296594323

function transformLon(x, y) {
	var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
	ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
	ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
	ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
	return ret;
}

function transformLat(x, y) { 
	var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
	ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
	ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
	ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
	return ret;
}
// 判断是否在国内
function outOfChina(lat, lng) {
	/* if (lng < 72.004 || lng > 137.8347)
		return true;
	if (lat < 0.8293 || lat > 55.8271)
		return true;
  return false;*/
  return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
}

/* 
 WGS-84转换GCJ-02
（即 天地图转高德、腾讯地图）
 */
export const wgs_gcj_encrypts = (latlons) => {
	var point = [];
	for (const latlon of latlons) {
		if (outOfChina(latlon.lat, latlon.lng)) {
			point.push({
				lat: latlon.lat,
				lng: latlon.lng
			})
			return point;
		}
		var dLat = transformLat(latlon.lng - 105.0, latlon.lat - 35.0);
		var dLon = transformLon(latlon.lng - 105.0, latlon.lat - 35.0);
		var radLat = latlon.lat / 180.0 * pi;
		var magic = Math.sin(radLat);
		magic = 1 - ee * magic * magic;
		var sqrtMagic = Math.sqrt(magic);
		dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
		dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);
		var lat = latlon.lat + dLat;
		var lng = latlon.lng + dLon;
		point.push({
			lat: lat,
			lng: lng
		})
	}
	return point;
}

/* 
 BD-09转换GCJ-02
 （即 百度转高德、腾讯地图）
 */
export const bd_google_encrypt = (latlons) => {
	var point = [];
	for (const latlon of latlons) {
		var x = latlon.lng - 0.0065;
		var y = latlon.lat - 0.006;
		var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
		var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
		var gg_lon = z * Math.cos(theta);
		var gg_lat = z * Math.sin(theta);
		point.push({
			lat: gg_lon,
			lng: gg_lat
		})
	}
	return point;
}

/* 
 GCJ-02转换BD-09
 （即 高德、腾讯转百度地图）
 */
export const google_bd_encrypt = (latlons) => {
	var point = [];
	for (const latlon of latlons) {
		var x = latlon.lng;
		var y = latlon.lat;
		var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
		var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
		var bd_lon = z * Math.cos(theta) + 0.0065;
		var bd_lat = z * Math.sin(theta) + 0.006;
		point.push({
			lat: bd_lat,
			lng: bd_lon
		})
	}
	return point;
}

/* 
 GCJ-02 到 WGS-84 的转换
 （即 高德、腾讯转天地图）
 */
export const gcj_wgs_encrypts = (latlons) => {
	var point = [];
	for (const latlon of latlons) {
		if (outOfChina(latlon.lat, latlon.lng)) {
			point.push({
				lat: latlon.lat,
				lng: latlon.lng
			})
			return point;
		}
		var dLat = transformLat(latlon.lng - 105.0, latlon.lat - 35.0);
		var dLon = transformLon(latlon.lng - 105.0, latlon.lat - 35.0);
		var radLat = latlon.lat / 180.0 * pi;
		var magic = Math.sin(radLat);
		magic = 1 - ee * magic * magic;
		var sqrtMagic = Math.sqrt(magic);
		dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
		dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);
		var lat = dLat;
		var lng = dLon;
		point.push({
			lat: lat,
			lng: lng
		})
	}
	return point;
}
