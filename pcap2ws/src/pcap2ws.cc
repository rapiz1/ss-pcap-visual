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

const char usage[] = "usage:\tpcap2ws INTERFACE [PORT]\n\
\n\
\tINTERFACE\tThe network interface to capture\n\
\tPORT\t\tThe port to listen at for the websocket server\n";

int main(int argc, char **argv) {
  int port = PORT;
  const char *interface = INTERFACE_NAME;
  if (argc == 1) {
    // use default settings
  } else if (argc == 2) {
    interface = argv[1];
  } else if (argc == 3) {
    interface = argv[1];
    port = atoi(argv[2]);
  } else {
    std::cerr << usage;
    exit(-1);
  }

  Pcap pcap;
  auto capture = pcap.openDevice(interface);

  try {
    Server server;

    // start the capture thread
    std::thread t([&]() { capture.loop(broadcastPcapPacket, &server); });

    server.run(port);
  } catch (websocketpp::exception const &e) {
    std::cout << e.what() << std::endl;
  }
}
