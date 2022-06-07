export interface Ipv4Packet {
  type: 'ipv4',
  source: string,
  dest: string,
};

export interface ArpPacket {
  type: 'arp',
  op: string
};

export interface CapturedPacket {
  transport: Ipv4Packet | ArpPacket,
  size: number,
};
