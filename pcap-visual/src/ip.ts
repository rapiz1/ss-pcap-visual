const IP_API_URL = 'http://ip-api.com/json/'
export interface IpGeoData {
  "query": string,
  "status": "success" | "failed"
  "country": string,
  "countryCode": string,
  "region": string,
  "regionName": string,
  "city": string,
  "zip": string,
  "lat": number,
  "lon": number,
  "timezone": string
  "isp": string,
  "org": string,
  "as": string
}

let ipCache: Record<string, Promise<IpGeoData>> = {};
export async function lookup(ip: string): Promise<IpGeoData> {
  if (ipCache[ip] === undefined) {
    const query = IP_API_URL + ip;
    ipCache[ip] = fetch(query).then(v => v.json());
  }
  return ipCache[ip]
}
