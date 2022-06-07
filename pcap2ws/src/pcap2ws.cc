#include "packet.h"
#include "pcap.h"
#include "server.h"

#include <cstdint>
#include <iostream>
#include <thread>

const char *INTERFACE_NAME = "wlp4s0";
const uint16_t PORT = 9002;

void broadcastPcapPacket(u_char *user, const struct pcap_pkthdr *header,
                         const u_char *data) {
  const auto p = CapturedPacket(data, header, DLT_EN10MB);
  const auto msg = p.toJson();

  // std::cout << msg << std::endl;

  Server *server = (Server *)user;
  server->broadcast(msg);
}

int main() {
  Pcap pcap;
  auto capture = pcap.openDevice(INTERFACE_NAME);

  try {
    Server server;

    // start the capture thread
    std::thread t([&]() { capture.loop(broadcastPcapPacket, &server); });

    server.run(PORT);
  } catch (websocketpp::exception const &e) {
    std::cout << e.what() << std::endl;
  }
}
