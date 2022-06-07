import './style.css'
import { BarChart, ChinaMap, TextScoller } from './observable';
import { IpGeoData, lookup } from './ip';
import { humanReadableSize } from './utils';

const WS_URL = 'ws://localhost:9002'

const bytesPlace = document.querySelector('#bytes-place')!

interface Ipv4Packet {
  source: string,
  dest: string,
};

interface ArpPacket {
  op: string
};

interface CapturedPacket {
  transport: Ipv4Packet | ArpPacket,
  size: number,
};

class BarChartDisplay {
  barChart
  constructor() {
    const e = document.querySelector('.bar-chart')!;
    this.barChart = BarChart([], {
      x: (d, _) => d[0], // given d in data, returns the (ordinal) x-value
      y: d => d[1], // given d in data, returns the (quantitative) y-value
      width: e.clientWidth,
      height: e.clientHeight
    });
    e.appendChild(this.barChart);
  }
  update(data: any) {
    this.barChart.update(data);
  }
}
const barChartDisplay = new BarChartDisplay();

class ConsoleDisplay {
  lines: Array<[string, number]> = []
  id: number = 0
  logDisplay
  maxN: number = 10
  constructor() {
    const e = document.querySelector('.console')!;
    this.logDisplay = TextScoller(e.clientWidth, e.clientHeight);
    e.appendChild(this.logDisplay);
    setInterval(() => {
      this.update();
    }, 100);
  }
  addLine(text: string) {
    this.lines.push([text, this.id++])
    this.shift();
  }
  shift() {
    if (this.lines.length > this.maxN)
      this.lines.shift();
  }
  update() {
    this.logDisplay.update(this.lines);
  }
}
const consoleDisplay = new ConsoleDisplay();

class MapDisplay {
  mapChart
  constructor() {
    const e = document.getElementById('china-map')!;
    const width = e.clientWidth;
    const height = e.clientHeight;

    this.mapChart = ChinaMap(width, height);
    e.appendChild(this.mapChart);
  }
  addPoint(data: IpGeoData, traffic: number) {
    this.mapChart.addPoint(data, traffic);
  }
}

const mapDisplay = new MapDisplay();

class TrafficStats {
  bytesTotal: number = 0;
  trafficPerAddress: Record<string, number> = {};
  addrQueue: Map<string, number> = new Map();

  constructor() {
    setInterval(() => {
      this.shiftRecords();
      this.updateBarChart();
    }, 1000)

    const CLEAR_INTERVAL = 30;
    setInterval(() => {
      this.clearRecords();
    }, CLEAR_INTERVAL * 1000);

    setInterval(() => {
      this.addrQueue.forEach((v, k) => {
        this.updateMap(k, v)
      });
      this.addrQueue = new Map();
    }, 500);
  }

  addTrafficToAddress(address: string, traffic: number) {
    if (this.trafficPerAddress[address] === undefined) {
      this.trafficPerAddress[address] = 0;
    }
    this.trafficPerAddress[address]! += traffic;
    this.shiftRecords();

    const oldCount = this.addrQueue.get(address) || 0;
    this.addrQueue.set(address, oldCount + traffic);
  }

  addTraffic(packet: CapturedPacket) {
    this.bytesTotal += packet.size;

    bytesPlace.innerHTML = `${humanReadableSize(trafficStats.getTotalTraffic())}`
    if ((packet.transport as any).type == 'ipv4') {
      const ipv4 = packet.transport as Ipv4Packet;
      this.addTrafficToAddress(ipv4.source, packet.size);
      this.updateConsole(ipv4);
      //this.updateMap(ipv4);
    }
  }

  shiftRecords() {
    const TopN = 100;
    const entries = this.getTrafficRecords();
    if (entries.length <= TopN) return;

    const records = entries.sort((a, b) => b[1] - a[1]).slice(0, TopN);
    this.trafficPerAddress = {};
    records.forEach(v => {
      this.trafficPerAddress[v[0]] = v[1];
    });
  }

  clearRecords() {
    this.trafficPerAddress = {};
  }

  updateBarChart() {
    const TopN = 7;
    const records = this.getTrafficRecords().sort((a, b) => b[1] - a[1]).slice(0, TopN);
    barChartDisplay.update(records);
  }

  updateMap(address: string, traffic: number) {
    lookup(address).then((geoData) => {
      if (geoData.status == 'success')
        console.log(geoData.city, geoData.lon, geoData.lat);
      mapDisplay.addPoint(geoData, traffic);
    })
  }

  updateConsole(ipv4: Ipv4Packet) {
    const msg = `${ipv4.source} -> ${ipv4.dest}`;
    consoleDisplay.addLine(msg);
  }

  getTrafficRecords() {
    return Object.entries(this.trafficPerAddress);
  }

  getTotalTraffic() {
    return this.bytesTotal;
  }
};

const trafficStats = new TrafficStats();

const socket = new WebSocket(WS_URL)
socket.onmessage = (event) => {
  const packet = JSON.parse(event.data) as CapturedPacket;
  trafficStats.addTraffic(packet);
}
