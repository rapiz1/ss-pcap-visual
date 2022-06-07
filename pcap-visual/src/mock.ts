import { CapturedPacket, Ipv4Packet } from "./packet";

type PacketReceiver = (p: CapturedPacket) => void;
export function mock(packetReceiver: PacketReceiver): void {
  document.getElementById('observed')!.innerHTML = ' Mocked.'
  generatePacket(packetReceiver);
}

function choose<T>(choices: Array<T>): T {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

function randomV4Address(): string {
  const candidates = ['192.168.1.1', '47.103.24.173', '220.181.38.148', '139.159.241.37', '203.205.254.157', '123.151.137.18', '183.3.226.35'];
  return choose(candidates);
}

function generatePacket(packetReceiver: PacketReceiver) {
  const transport: Ipv4Packet = {
    type: 'ipv4',
    source: randomV4Address(),
    dest: randomV4Address(),
  }

  const p: CapturedPacket = {
    transport,
    size: Math.round(Math.exp(Math.random() * 10))
  }

  packetReceiver(p);

  setTimeout(() => { generatePacket(packetReceiver) }, 800 * Math.random() + 200);
}
